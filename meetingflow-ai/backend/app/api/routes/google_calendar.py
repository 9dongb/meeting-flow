import secrets

from fastapi import APIRouter, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DbSession
from app.core.config import get_settings
from app.crud.google_accounts import get_google_account_for_user, update_calendar_settings, upsert_google_account
from app.crud.action_items import list_user_action_items
from app.crud.teams import get_active_team
from app.models.action_item_calendar_link import ActionItemCalendarLink
from app.schemas.google_integration import GoogleCalendarSettingsUpdate, GoogleCalendarStatus
from app.services.integrations.google_calendar_sync import GoogleCalendarSyncService
from app.services.google_oauth import (
    CALENDAR_SCOPES,
    GoogleOAuthError,
    build_google_auth_url,
    exchange_code_for_tokens,
    fetch_google_userinfo,
    has_calendar_events_scope,
)


router = APIRouter(prefix="/integrations/google-calendar", tags=["google-calendar"])
GOOGLE_CALENDAR_STATE_COOKIE = "meetingflow_google_calendar_state"


@router.get("/status", response_model=GoogleCalendarStatus)
def google_calendar_status(db: DbSession, current_user: CurrentUser) -> GoogleCalendarStatus:
    account = get_google_account_for_user(db, current_user.id)
    if not account:
        return GoogleCalendarStatus(connected=False, sync_enabled=False, permission_granted=False)
    return _calendar_status(db, current_user.id, account)


@router.get("/connect")
def connect_google_calendar(current_user: CurrentUser) -> RedirectResponse:
    settings = get_settings()
    state = secrets.token_urlsafe(24)
    try:
        url = build_google_auth_url(
            state=state,
            redirect_uri=settings.google_calendar_redirect_uri,
            scopes=CALENDAR_SCOPES,
            prompt="consent",
        )
    except GoogleOAuthError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    response = RedirectResponse(url, status_code=status.HTTP_302_FOUND)
    response.set_cookie(
        key=GOOGLE_CALENDAR_STATE_COOKIE,
        value=state,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        max_age=600,
        path="/",
    )
    return response


@router.get("/callback")
def google_calendar_callback(
    request: Request,
    db: DbSession,
    current_user: CurrentUser,
    code: str = Query(...),
    state: str = Query(...),
) -> RedirectResponse:
    settings = get_settings()
    expected_state = request.cookies.get(GOOGLE_CALENDAR_STATE_COOKIE)
    if not expected_state or expected_state != state:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Google Calendar OAuth state")

    try:
        tokens = exchange_code_for_tokens(code, settings.google_calendar_redirect_uri)
        userinfo = fetch_google_userinfo(tokens["access_token"])
    except GoogleOAuthError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    granted_scopes = tokens.get("scope")
    calendar_scope_granted = has_calendar_events_scope(granted_scopes)
    if not calendar_scope_granted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Google Calendar permission was not granted. Please reconnect Calendar and approve event access.",
        )

    account = upsert_google_account(
        db,
        user=current_user,
        google_sub=str(userinfo.get("sub", "")),
        email=str(userinfo.get("email", current_user.email)).lower(),
        access_token=tokens.get("access_token"),
        refresh_token=tokens.get("refresh_token"),
        expires_in=tokens.get("expires_in"),
        granted_scopes=granted_scopes,
        calendar_scope_granted=True,
    )
    update_calendar_settings(db, account, enabled=True)
    _sync_current_team_items(db, current_user.id)

    redirect = RedirectResponse(f"{settings.frontend_base_url}/dashboard", status_code=status.HTTP_302_FOUND)
    redirect.delete_cookie(
        key=GOOGLE_CALENDAR_STATE_COOKIE,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        path="/",
    )
    return redirect


@router.patch("/settings", response_model=GoogleCalendarStatus)
def update_google_calendar_settings(
    settings_in: GoogleCalendarSettingsUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> GoogleCalendarStatus:
    account = get_google_account_for_user(db, current_user.id)
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Google Calendar is not connected")
    if not account.calendar_scope_granted:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Google Calendar permission has not been granted")
    was_enabled = account.calendar_sync_enabled
    update_calendar_settings(
        db,
        account,
        enabled=settings_in.sync_enabled,
        calendar_id=settings_in.calendar_id,
    )
    if settings_in.sync_enabled and not was_enabled:
        _sync_current_team_items(db, current_user.id)
    return _calendar_status(db, current_user.id, account)


@router.post("/sync", response_model=GoogleCalendarStatus)
def sync_google_calendar_now(db: DbSession, current_user: CurrentUser) -> GoogleCalendarStatus:
    account = get_google_account_for_user(db, current_user.id)
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Google Calendar is not connected")
    if not account.calendar_scope_granted:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Google Calendar permission has not been granted")
    if not account.calendar_sync_enabled:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Google Calendar sync is off")
    _sync_current_team_items(db, current_user.id)
    return _calendar_status(db, current_user.id, account)


def _sync_current_team_items(db: DbSession, user_id: int) -> None:
    from app.models.user import User

    user = db.get(User, user_id)
    if not user:
        return
    team = get_active_team(db, user)
    for item in list_user_action_items(db, team.id):
        GoogleCalendarSyncService().sync_action_item(db, user_id, item)


def _calendar_status(db: DbSession, user_id: int, account) -> GoogleCalendarStatus:
    rows = db.execute(
        select(ActionItemCalendarLink.sync_status, func.count())
        .where(ActionItemCalendarLink.user_id == user_id)
        .group_by(ActionItemCalendarLink.sync_status)
    ).all()
    counts = {status: int(count) for status, count in rows}
    last_failed = db.scalar(
        select(ActionItemCalendarLink)
        .where(ActionItemCalendarLink.user_id == user_id, ActionItemCalendarLink.sync_status == "failed")
        .order_by(ActionItemCalendarLink.last_synced_at.desc().nullslast(), ActionItemCalendarLink.id.desc())
    )
    return GoogleCalendarStatus(
        connected=bool(account.refresh_token_encrypted and account.calendar_scope_granted),
        sync_enabled=account.calendar_sync_enabled,
        permission_granted=account.calendar_scope_granted,
        email=account.email,
        calendar_id=account.calendar_id,
        synced_count=counts.get("synced", 0),
        failed_count=counts.get("failed", 0),
        skipped_count=counts.get("skipped_no_due_date", 0),
        last_error=last_failed.last_error if last_failed else None,
    )

import secrets
from urllib.parse import unquote

from fastapi import APIRouter, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse

from app.api.deps import CurrentUser, DbSession
from app.core.config import get_settings
from app.crud.meetings import get_meeting
from app.crud.notion_accounts import delete_notion_account, get_notion_account_for_user, upsert_notion_account
from app.crud.teams import get_active_team
from app.schemas.integration import NotionDraftResponse, NotionStatus
from app.services.integrations.notion import (
    NotionDraftService,
    NotionIntegrationError,
    build_notion_auth_url,
    exchange_code_for_notion_token,
    extract_notion_owner_email,
)


router = APIRouter(tags=["notion"])
NOTION_STATE_COOKIE = "meetingflow_notion_state"
NOTION_RETURN_TO_COOKIE = "meetingflow_notion_return_to"


@router.get("/integrations/notion/status", response_model=NotionStatus)
def notion_status(db: DbSession, current_user: CurrentUser) -> NotionStatus:
    account = get_notion_account_for_user(db, current_user.id)
    if not account or not account.access_token_encrypted:
        return NotionStatus(connected=False)
    return NotionStatus(
        connected=True,
        workspace_name=account.workspace_name,
        owner_email=account.owner_email,
        meetingflow_page_url=account.meetingflow_page_url,
    )


@router.get("/integrations/notion/connect")
def connect_notion(current_user: CurrentUser, return_to: str | None = Query(default=None)) -> RedirectResponse:
    settings = get_settings()
    state = secrets.token_urlsafe(24)
    try:
        url = build_notion_auth_url(state=state, redirect_uri=settings.notion_redirect_uri)
    except NotionIntegrationError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    response = RedirectResponse(url, status_code=status.HTTP_302_FOUND)
    response.set_cookie(
        key=NOTION_STATE_COOKIE,
        value=state,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        max_age=600,
        path="/",
    )
    if return_to:
        response.set_cookie(
            key=NOTION_RETURN_TO_COOKIE,
            value=_safe_frontend_path(return_to),
            httponly=True,
            secure=settings.auth_cookie_secure,
            samesite=settings.auth_cookie_samesite,
            max_age=600,
            path="/",
        )
    return response


@router.delete("/integrations/notion", status_code=status.HTTP_204_NO_CONTENT)
def disconnect_notion(db: DbSession, current_user: CurrentUser) -> None:
    account = get_notion_account_for_user(db, current_user.id)
    if account:
        delete_notion_account(db, account)


@router.get("/integrations/notion/callback")
def notion_callback(
    request: Request,
    db: DbSession,
    current_user: CurrentUser,
    code: str = Query(...),
    state: str = Query(...),
) -> RedirectResponse:
    settings = get_settings()
    expected_state = request.cookies.get(NOTION_STATE_COOKIE)
    if not expected_state or expected_state != state:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Notion OAuth state")

    try:
        tokens = exchange_code_for_notion_token(code, settings.notion_redirect_uri)
    except NotionIntegrationError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    workspace_id = tokens.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Notion did not return a workspace id")

    upsert_notion_account(
        db,
        current_user,
        workspace_id=str(workspace_id),
        workspace_name=tokens.get("workspace_name"),
        bot_id=tokens.get("bot_id"),
        owner_email=extract_notion_owner_email(tokens),
        access_token=tokens.get("access_token"),
        refresh_token=tokens.get("refresh_token"),
    )

    return_to = _safe_frontend_path(request.cookies.get(NOTION_RETURN_TO_COOKIE))
    redirect = RedirectResponse(f"{settings.frontend_base_url}{return_to}", status_code=status.HTTP_302_FOUND)
    redirect.delete_cookie(
        key=NOTION_STATE_COOKIE,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        path="/",
    )
    redirect.delete_cookie(
        key=NOTION_RETURN_TO_COOKIE,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        path="/",
    )
    return redirect


@router.post("/meetings/{meeting_id}/notion-draft", response_model=NotionDraftResponse)
def create_notion_draft(meeting_id: int, db: DbSession, current_user: CurrentUser) -> NotionDraftResponse:
    team = get_active_team(db, current_user)
    meeting = get_meeting(db, meeting_id, team.id)
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    account = get_notion_account_for_user(db, current_user.id)
    if not account or not account.access_token_encrypted:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Notion is not connected")

    service = NotionDraftService()
    try:
        page, log = service.create_meeting_draft(db, meeting, account)
    except NotionIntegrationError as exc:
        service.create_failure_log(db, meeting, str(exc))
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    return NotionDraftResponse(page_id=str(page.get("id", "")), url=page.get("url"), log=log)


def _safe_frontend_path(value: str | None) -> str:
    if not value:
        return "/dashboard?notion=connected"

    path = unquote(value)
    if not path.startswith("/") or path.startswith("//") or "\r" in path or "\n" in path:
        return "/dashboard?notion=connected"
    return path

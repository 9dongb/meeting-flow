from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.crypto import encrypt_secret
from app.models.action_item_calendar_link import ActionItemCalendarLink
from app.models.google_account import UserGoogleAccount
from app.models.user import User


def get_google_account_for_user(db: Session, user_id: int) -> UserGoogleAccount | None:
    return db.scalar(select(UserGoogleAccount).where(UserGoogleAccount.user_id == user_id))


def get_google_account_by_sub(db: Session, google_sub: str) -> UserGoogleAccount | None:
    return db.scalar(select(UserGoogleAccount).where(UserGoogleAccount.google_sub == google_sub))


def delete_google_account(db: Session, account: UserGoogleAccount) -> None:
    db.execute(delete(ActionItemCalendarLink).where(ActionItemCalendarLink.user_id == account.user_id))
    db.delete(account)
    db.commit()


def upsert_google_account(
    db: Session,
    user: User,
    google_sub: str,
    email: str,
    access_token: str | None = None,
    refresh_token: str | None = None,
    expires_in: int | None = None,
    granted_scopes: str | None = None,
    calendar_scope_granted: bool | None = None,
) -> UserGoogleAccount:
    account = get_google_account_for_user(db, user.id) or get_google_account_by_sub(db, google_sub)
    if not account:
        account = UserGoogleAccount(user_id=user.id, google_sub=google_sub, email=email)

    account.user_id = user.id
    account.google_sub = google_sub
    account.email = email
    if access_token:
        account.access_token_encrypted = encrypt_secret(access_token)
    if refresh_token:
        account.refresh_token_encrypted = encrypt_secret(refresh_token)
    if expires_in:
        account.token_expires_at = datetime.now(UTC) + timedelta(seconds=max(expires_in - 60, 0))
    if granted_scopes is not None:
        account.granted_scopes = granted_scopes
    if calendar_scope_granted is not None:
        account.calendar_scope_granted = calendar_scope_granted
        if not calendar_scope_granted:
            account.calendar_sync_enabled = False

    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def update_calendar_settings(
    db: Session,
    account: UserGoogleAccount,
    enabled: bool | None = None,
    calendar_id: str | None = None,
) -> UserGoogleAccount:
    if enabled is not None:
        if enabled and not account.calendar_scope_granted:
            raise ValueError("Google Calendar scope has not been granted.")
        account.calendar_sync_enabled = enabled
    if calendar_id is not None:
        account.calendar_id = calendar_id.strip() or "primary"
    db.add(account)
    db.commit()
    db.refresh(account)
    return account

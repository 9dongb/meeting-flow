from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.crypto import encrypt_secret
from app.models.notion_account import UserNotionAccount
from app.models.user import User


def get_notion_account_for_user(db: Session, user_id: int) -> UserNotionAccount | None:
    return db.scalar(select(UserNotionAccount).where(UserNotionAccount.user_id == user_id))


def upsert_notion_account(
    db: Session,
    user: User,
    *,
    workspace_id: str,
    workspace_name: str | None,
    bot_id: str | None,
    owner_email: str | None,
    access_token: str | None,
    refresh_token: str | None,
) -> UserNotionAccount:
    account = get_notion_account_for_user(db, user.id)
    if not account:
        account = UserNotionAccount(user_id=user.id, workspace_id=workspace_id)

    account.user_id = user.id
    account.workspace_id = workspace_id
    account.workspace_name = workspace_name
    account.bot_id = bot_id
    account.owner_email = owner_email
    if access_token:
        account.access_token_encrypted = encrypt_secret(access_token)
    if refresh_token:
        account.refresh_token_encrypted = encrypt_secret(refresh_token)

    db.add(account)
    db.commit()
    db.refresh(account)
    return account

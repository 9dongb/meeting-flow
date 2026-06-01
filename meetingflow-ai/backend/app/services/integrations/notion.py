import base64
from urllib.parse import urlencode

import httpx
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.crypto import decrypt_secret
from app.models.enums import IntegrationStatus, IntegrationType
from app.models.integration_action_log import IntegrationActionLog
from app.models.meeting import Meeting
from app.models.notion_account import UserNotionAccount
from app.services.integrations.mock_services import create_mock_log, render_markdown


NOTION_TOKEN_URL = "https://api.notion.com/v1/oauth/token"
NOTION_PAGES_URL = "https://api.notion.com/v1/pages"


class NotionIntegrationError(Exception):
    pass


class MockNotionService:
    def run_mock(self, db: Session, meeting: Meeting) -> IntegrationActionLog:
        return create_mock_log(
            db,
            meeting,
            IntegrationType.notion,
            {"page_title": meeting.title, "approval_required": True},
        )


def build_notion_auth_url(*, state: str, redirect_uri: str) -> str:
    settings = get_settings()
    if not settings.notion_client_id:
        raise NotionIntegrationError("NOTION_CLIENT_ID is not configured.")

    params = {
        "client_id": settings.notion_client_id,
        "response_type": "code",
        "owner": "user",
        "redirect_uri": redirect_uri,
        "state": state,
    }
    return f"{settings.notion_authorization_url}?{urlencode(params)}"


def exchange_code_for_notion_token(code: str, redirect_uri: str) -> dict:
    settings = get_settings()
    if not settings.notion_client_id or not settings.notion_client_secret:
        raise NotionIntegrationError("Notion OAuth client settings are not configured.")

    credentials = f"{settings.notion_client_id}:{settings.notion_client_secret}".encode("utf-8")
    basic_auth = base64.b64encode(credentials).decode("ascii")
    try:
        response = httpx.post(
            NOTION_TOKEN_URL,
            headers={
                "Authorization": f"Basic {basic_auth}",
                "Content-Type": "application/json",
                "Notion-Version": settings.notion_api_version,
            },
            json={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
            },
            timeout=30,
        )
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as exc:
        raise NotionIntegrationError(f"Notion token exchange failed: {exc.response.text[:300]}") from exc
    except httpx.HTTPError as exc:
        raise NotionIntegrationError(f"Notion token exchange failed: {exc}") from exc


def extract_notion_owner_email(token_response: dict) -> str | None:
    owner = token_response.get("owner")
    if not isinstance(owner, dict):
        return None
    user = owner.get("user")
    if not isinstance(user, dict):
        return None
    person = user.get("person")
    if not isinstance(person, dict):
        return None
    email = person.get("email")
    return str(email) if email else None


class NotionDraftService:
    def create_meeting_draft(self, db: Session, meeting: Meeting, account: UserNotionAccount) -> tuple[dict, IntegrationActionLog]:
        access_token = decrypt_secret(account.access_token_encrypted)
        if not access_token:
            raise NotionIntegrationError("Notion is not connected.")

        markdown = render_markdown(meeting)
        page = self._create_page(access_token, meeting.title, markdown)
        log = IntegrationActionLog(
            meeting_id=meeting.id,
            integration_type=IntegrationType.notion,
            status=IntegrationStatus.success,
            payload_json={
                "page_id": page.get("id"),
                "url": page.get("url"),
                "workspace_id": account.workspace_id,
                "workspace_name": account.workspace_name,
            },
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return page, log

    def create_failure_log(self, db: Session, meeting: Meeting, error: str) -> IntegrationActionLog:
        log = IntegrationActionLog(
            meeting_id=meeting.id,
            integration_type=IntegrationType.notion,
            status=IntegrationStatus.failed,
            payload_json={"error": error[:500]},
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return log

    def _create_page(self, access_token: str, title: str, markdown: str) -> dict:
        settings = get_settings()
        try:
            response = httpx.post(
                NOTION_PAGES_URL,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                    "Notion-Version": settings.notion_api_version,
                },
                json={
                    "properties": {
                        "title": {
                            "title": [{"text": {"content": title[:2000]}}]
                        }
                    },
                    "markdown": markdown,
                },
                timeout=30,
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as exc:
            raise NotionIntegrationError(f"Notion page creation failed: {exc.response.text[:300]}") from exc
        except httpx.HTTPError as exc:
            raise NotionIntegrationError(f"Notion page creation failed: {exc}") from exc

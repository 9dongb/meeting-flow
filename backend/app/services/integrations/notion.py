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
from app.services.integrations.mock_services import create_mock_log


NOTION_TOKEN_URL = "https://api.notion.com/v1/oauth/token"
NOTION_PAGES_URL = "https://api.notion.com/v1/pages"
NOTION_BLOCKS_URL = "https://api.notion.com/v1/blocks"
MEETINGFLOW_PARENT_PAGE_TITLE = "MeetingFlow"
NOTION_RICH_TEXT_LIMIT = 1900
NOTION_CHILDREN_LIMIT = 100


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


def build_meeting_notion_blocks(meeting: Meeting) -> list[dict]:
    blocks: list[dict] = [
        _heading_2("회의 개요"),
        _meeting_overview_table(meeting),
        _divider(),
    ]

    blocks.extend(
        [
            _heading_2("참석자"),
            _paragraph(", ".join(_participant_label(participant) for participant in meeting.participants)),
        ]
        if meeting.participants
        else [_heading_2("참석자"), _paragraph("참석자 정보가 없습니다.")]
    )

    blocks.extend(
        [
            _heading_2("요약"),
            *_paragraphs(meeting.summary, fallback="아직 분석된 요약이 없습니다."),
        ]
    )

    blocks.extend([_heading_2("결정사항")])
    if meeting.decisions:
        blocks.extend(
            _numbered_list_item(
                decision.content,
                children=[
                    *_optional_child("결정 근거", decision.reason),
                    *_optional_child("원문", decision.source_text),
                ],
            )
            for decision in meeting.decisions
        )
    else:
        blocks.append(_paragraph("정리된 결정사항이 없습니다."))

    blocks.extend([_heading_2("액션 아이템")])
    if meeting.action_items:
        blocks.extend(
            _to_do(
                item.description,
                checked=str(item.status) == "done",
                children=[
                    _bulleted_list_item(f"담당자: {item.assignee or '미정'}"),
                    _bulleted_list_item(f"마감일: {_format_date(item.due_date)}"),
                    _bulleted_list_item(f"우선순위: {item.priority}"),
                    _bulleted_list_item(f"상태: {item.status}"),
                    *_optional_child("원문", item.source_text),
                ],
            )
            for item in meeting.action_items
        )
    else:
        blocks.append(_paragraph("정리된 액션 아이템이 없습니다."))

    blocks.extend([_heading_2("후속 확인 사항")])
    if meeting.unresolved_issues:
        blocks.extend(
            _toggle(
                issue.content,
                children=[
                    _bulleted_list_item(f"담당자: {issue.owner or '미정'}"),
                    *_optional_child("다음 단계", issue.next_step),
                    *_optional_child("원문", issue.source_text),
                ],
            )
            for issue in meeting.unresolved_issues
        )
    else:
        blocks.append(_paragraph("추가 확인이 필요한 이슈가 없습니다."))

    if meeting.transcript.strip():
        blocks.extend(
            [
                _divider(),
                _heading_2("원문"),
                _toggle("회의 원문 보기", children=[_code(meeting.transcript)]),
            ]
        )

    return blocks


class NotionDraftService:
    def create_meeting_draft(self, db: Session, meeting: Meeting, account: UserNotionAccount) -> tuple[dict, IntegrationActionLog]:
        access_token = decrypt_secret(account.access_token_encrypted)
        if not access_token:
            raise NotionIntegrationError("Notion is not connected.")

        parent_page = self.ensure_meetingflow_parent_page(db, access_token, account)
        blocks = build_meeting_notion_blocks(meeting)
        try:
            page = self._create_page(access_token, meeting.title, blocks, parent_page_id=str(parent_page["id"]))
        except NotionIntegrationError as exc:
            if not _is_stale_parent_page_error(str(exc)):
                raise
            self._clear_meetingflow_parent_page(db, account)
            parent_page = self.ensure_meetingflow_parent_page(db, access_token, account)
            page = self._create_page(access_token, meeting.title, blocks, parent_page_id=str(parent_page["id"]))
        log = IntegrationActionLog(
            meeting_id=meeting.id,
            integration_type=IntegrationType.notion,
            status=IntegrationStatus.success,
            payload_json={
                "page_id": page.get("id"),
                "url": page.get("url"),
                "parent_page_id": parent_page.get("id"),
                "parent_page_url": parent_page.get("url"),
                "workspace_id": account.workspace_id,
                "workspace_name": account.workspace_name,
                "block_count": len(blocks),
            },
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return page, log

    def ensure_meetingflow_parent_page(self, db: Session, access_token: str, account: UserNotionAccount) -> dict:
        if account.meetingflow_page_id:
            try:
                page = self._retrieve_page(access_token, account.meetingflow_page_id)
                if _is_archived_or_deleted_page(page):
                    self._clear_meetingflow_parent_page(db, account)
                else:
                    account.meetingflow_page_url = page.get("url") or account.meetingflow_page_url
                    db.add(account)
                    db.commit()
                    db.refresh(account)
                    return page
            except NotionIntegrationError:
                self._clear_meetingflow_parent_page(db, account)

        page = self._create_workspace_page(access_token, MEETINGFLOW_PARENT_PAGE_TITLE)
        if not page.get("id"):
            raise NotionIntegrationError("Notion parent page creation did not return a page id")
        account.meetingflow_page_id = page.get("id")
        account.meetingflow_page_url = page.get("url")
        db.add(account)
        db.commit()
        db.refresh(account)
        return page

    def _clear_meetingflow_parent_page(self, db: Session, account: UserNotionAccount) -> None:
        account.meetingflow_page_id = None
        account.meetingflow_page_url = None
        db.add(account)
        db.commit()
        db.refresh(account)

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

    def _retrieve_page(self, access_token: str, page_id: str) -> dict:
        settings = get_settings()
        try:
            response = httpx.get(
                f"{NOTION_PAGES_URL}/{page_id}",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Notion-Version": settings.notion_api_version,
                },
                timeout=30,
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as exc:
            raise NotionIntegrationError(f"Notion parent page lookup failed: {exc.response.text[:300]}") from exc
        except httpx.HTTPError as exc:
            raise NotionIntegrationError(f"Notion parent page lookup failed: {exc}") from exc

    def _create_workspace_page(self, access_token: str, title: str) -> dict:
        return self._create_page_payload(
            access_token,
            {
                "properties": {
                    "title": {
                        "title": [{"text": {"content": title[:2000]}}]
                    }
                },
            },
        )

    def _create_page(self, access_token: str, title: str, children: list[dict], *, parent_page_id: str) -> dict:
        page = self._create_page_payload(
            access_token,
            {
                "parent": {"page_id": parent_page_id},
                "properties": {
                    "title": {
                        "title": [{"text": {"content": title[:2000]}}]
                    }
                },
                "children": children[:NOTION_CHILDREN_LIMIT],
            },
        )
        page_id = page.get("id")
        remaining_children = children[NOTION_CHILDREN_LIMIT:]
        if page_id and remaining_children:
            self._append_block_children(access_token, str(page_id), remaining_children)
        return page

    def _append_block_children(self, access_token: str, block_id: str, children: list[dict]) -> None:
        settings = get_settings()
        try:
            for index in range(0, len(children), NOTION_CHILDREN_LIMIT):
                response = httpx.patch(
                    f"{NOTION_BLOCKS_URL}/{block_id}/children",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json",
                        "Notion-Version": settings.notion_api_version,
                    },
                    json={"children": children[index:index + NOTION_CHILDREN_LIMIT]},
                    timeout=30,
                )
                response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise NotionIntegrationError(f"Notion block append failed: {exc.response.text[:300]}") from exc
        except httpx.HTTPError as exc:
            raise NotionIntegrationError(f"Notion block append failed: {exc}") from exc

    def _create_page_payload(self, access_token: str, payload: dict) -> dict:
        settings = get_settings()
        try:
            response = httpx.post(
                NOTION_PAGES_URL,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                    "Notion-Version": settings.notion_api_version,
                },
                json=payload,
                timeout=30,
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as exc:
            raise NotionIntegrationError(f"Notion page creation failed: {exc.response.text[:300]}") from exc
        except httpx.HTTPError as exc:
            raise NotionIntegrationError(f"Notion page creation failed: {exc}") from exc


def _rich_text(content: str | None) -> list[dict]:
    text = (content or "").strip()
    if not text:
        return []
    return [
        {"type": "text", "text": {"content": text[index:index + NOTION_RICH_TEXT_LIMIT]}}
        for index in range(0, len(text), NOTION_RICH_TEXT_LIMIT)
    ]


def _text_content(content: str) -> list[dict]:
    return _rich_text(content) or [{"type": "text", "text": {"content": " "}}]


def _heading_2(content: str) -> dict:
    return {
        "object": "block",
        "type": "heading_2",
        "heading_2": {"rich_text": _text_content(content), "color": "default"},
    }


def _paragraph(content: str) -> dict:
    return {
        "object": "block",
        "type": "paragraph",
        "paragraph": {"rich_text": _text_content(content), "color": "default"},
    }


def _paragraphs(content: str | None, *, fallback: str) -> list[dict]:
    paragraphs = [line.strip() for line in (content or "").splitlines() if line.strip()]
    if not paragraphs:
        return [_paragraph(fallback)]
    return [_paragraph(line) for line in paragraphs]


def _bulleted_list_item(content: str) -> dict:
    return {
        "object": "block",
        "type": "bulleted_list_item",
        "bulleted_list_item": {"rich_text": _text_content(content), "color": "default"},
    }


def _numbered_list_item(content: str, *, children: list[dict] | None = None) -> dict:
    block = {
        "object": "block",
        "type": "numbered_list_item",
        "numbered_list_item": {"rich_text": _text_content(content), "color": "default"},
    }
    if children:
        block["numbered_list_item"]["children"] = children
    return block


def _to_do(content: str, *, checked: bool, children: list[dict] | None = None) -> dict:
    block = {
        "object": "block",
        "type": "to_do",
        "to_do": {"rich_text": _text_content(content), "checked": checked, "color": "default"},
    }
    if children:
        block["to_do"]["children"] = children
    return block


def _toggle(content: str, *, children: list[dict] | None = None) -> dict:
    block = {
        "object": "block",
        "type": "toggle",
        "toggle": {"rich_text": _text_content(content), "color": "default"},
    }
    if children:
        block["toggle"]["children"] = children
    return block


def _code(content: str) -> dict:
    return {
        "object": "block",
        "type": "code",
        "code": {
            "caption": [],
            "rich_text": _text_content(content),
            "language": "plain text",
        },
    }


def _divider() -> dict:
    return {"object": "block", "type": "divider", "divider": {}}


def _meeting_overview_table(meeting: Meeting) -> dict:
    rows = [
        ("항목", "내용"),
        ("프로젝트", meeting.project_name or "미정"),
        ("회의일", _format_date(meeting.meeting_date)),
        ("참석자", f"{len(meeting.participants)}명"),
        ("결정사항", f"{len(meeting.decisions)}건"),
        ("액션 아이템", f"{len(meeting.action_items)}건"),
        ("후속 확인 사항", f"{len(meeting.unresolved_issues)}건"),
    ]
    return {
        "object": "block",
        "type": "table",
        "table": {
            "table_width": 2,
            "has_column_header": True,
            "has_row_header": False,
            "children": [
                {
                    "object": "block",
                    "type": "table_row",
                    "table_row": {"cells": [_text_content(label), _text_content(value)]},
                }
                for label, value in rows
            ],
        },
    }


def _optional_child(label: str, content: str | None) -> list[dict]:
    text = (content or "").strip()
    if not text:
        return []
    return [_bulleted_list_item(f"{label}: {text}")]


def _participant_label(participant) -> str:
    return f"{participant.name} ({participant.email})" if participant.email else participant.name


def _format_date(value) -> str:
    return value.isoformat() if value else "미정"


def _is_archived_or_deleted_page(page: dict) -> bool:
    return bool(page.get("archived") or page.get("in_trash"))


def _is_stale_parent_page_error(error: str) -> bool:
    normalized = error.lower()
    return (
        "archived" in normalized
        or "object_not_found" in normalized
        or "could not find block" in normalized
        or "could not find page" in normalized
    )

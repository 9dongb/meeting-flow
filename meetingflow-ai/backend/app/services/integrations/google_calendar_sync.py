from datetime import UTC, datetime, timedelta

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.crypto import decrypt_secret, encrypt_secret
from app.crud.google_accounts import get_google_account_for_user
from app.models.action_item import ActionItem
from app.models.action_item_calendar_link import ActionItemCalendarLink
from app.models.google_account import UserGoogleAccount
from app.models.meeting import Meeting


GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3"


class GoogleCalendarSyncError(Exception):
    pass


class GoogleCalendarSyncService:
    def sync_action_item(self, db: Session, user_id: int, item: ActionItem) -> ActionItemCalendarLink | None:
        account = get_google_account_for_user(db, user_id)
        if not account or not account.calendar_sync_enabled:
            return None
        if not item.due_date:
            return self._mark_link(
                db,
                user_id=user_id,
                action_item_id=item.id,
                calendar_id=account.calendar_id,
                status="skipped_no_due_date",
                error="마감일이 없어 Google Calendar 이벤트를 만들지 않았습니다.",
            )

        link = self._get_link(db, user_id, item.id)
        try:
            token = self._access_token(db, account)
            payload = self._event_payload(item)
            if link and link.google_event_id:
                self._request(
                    "PATCH",
                    f"{GOOGLE_CALENDAR_API}/calendars/{link.calendar_id}/events/{link.google_event_id}",
                    token,
                    json=payload,
                )
                link.sync_status = "synced"
                link.last_error = None
                link.last_synced_at = datetime.now(UTC)
            else:
                response = self._request(
                    "POST",
                    f"{GOOGLE_CALENDAR_API}/calendars/{account.calendar_id}/events",
                    token,
                    json=payload,
                )
                link = link or ActionItemCalendarLink(action_item_id=item.id, user_id=user_id)
                link.google_event_id = response["id"]
                link.calendar_id = account.calendar_id
                link.sync_status = "synced"
                link.last_error = None
                link.last_synced_at = datetime.now(UTC)
            db.add(link)
            db.commit()
            return link
        except Exception as exc:
            return self._mark_link(
                db,
                user_id=user_id,
                action_item_id=item.id,
                calendar_id=account.calendar_id,
                status="failed",
                error=str(exc)[:1000],
            )

    def sync_meeting_action_items(self, db: Session, user_id: int, meeting: Meeting) -> list[ActionItemCalendarLink]:
        links = []
        for item in meeting.action_items:
            link = self.sync_action_item(db, user_id, item)
            if link:
                links.append(link)
        return links

    def delete_action_item_event(self, db: Session, user_id: int, item: ActionItem) -> None:
        account = get_google_account_for_user(db, user_id)
        link = self._get_link(db, user_id, item.id)
        if not account or not link:
            return
        if account.calendar_sync_enabled and link.google_event_id:
            token = self._access_token(db, account)
            self._request(
                "DELETE",
                f"{GOOGLE_CALENDAR_API}/calendars/{link.calendar_id}/events/{link.google_event_id}",
                token,
                allow_empty=True,
            )
        db.delete(link)
        db.commit()

    def delete_meeting_events(self, db: Session, user_id: int, meeting: Meeting) -> None:
        for item in list(meeting.action_items):
            self.delete_action_item_event(db, user_id, item)

    def _access_token(self, db: Session, account: UserGoogleAccount) -> str:
        access_token = decrypt_secret(account.access_token_encrypted)
        expires_at = account.token_expires_at
        if expires_at and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        if access_token and expires_at and expires_at > datetime.now(UTC):
            return access_token
        refresh_token = decrypt_secret(account.refresh_token_encrypted)
        if not refresh_token:
            raise GoogleCalendarSyncError("Google Calendar refresh token is not available.")

        from app.core.config import get_settings

        settings = get_settings()
        response = httpx.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
            timeout=30,
        )
        response.raise_for_status()
        payload = response.json()
        account.access_token_encrypted = encrypt_secret(payload["access_token"])
        account.token_expires_at = datetime.now(UTC) + timedelta(seconds=max(int(payload.get("expires_in", 3600)) - 60, 0))
        db.add(account)
        db.commit()
        return payload["access_token"]

    def _event_payload(self, item: ActionItem) -> dict:
        due_date = item.due_date.isoformat()
        end_date = (item.due_date + timedelta(days=1)).isoformat()
        lines = [
            f"담당자: {item.assignee or '미정'}",
            f"상태: {item.status.value}",
            f"우선순위: {item.priority.value}",
            f"회의: {item.meeting.title}",
        ]
        if item.source_text:
            lines.append(f"원문 근거: {item.source_text}")
        return {
            "summary": f"[MeetingFlow] {item.description}",
            "description": "\n".join(lines),
            "start": {"date": due_date},
            "end": {"date": end_date},
        }

    def _request(self, method: str, url: str, token: str, json: dict | None = None, allow_empty: bool = False) -> dict:
        try:
            response = httpx.request(method, url, headers={"Authorization": f"Bearer {token}"}, json=json, timeout=30)
            response.raise_for_status()
            if allow_empty or response.status_code == 204:
                return {}
            return response.json()
        except httpx.HTTPStatusError as exc:
            raise GoogleCalendarSyncError(f"Google Calendar API returned {exc.response.status_code}: {exc.response.text[:300]}") from exc
        except httpx.HTTPError as exc:
            raise GoogleCalendarSyncError(f"Google Calendar API request failed: {exc}") from exc

    def _get_link(self, db: Session, user_id: int, action_item_id: int) -> ActionItemCalendarLink | None:
        return db.scalar(
            select(ActionItemCalendarLink).where(
                ActionItemCalendarLink.user_id == user_id,
                ActionItemCalendarLink.action_item_id == action_item_id,
            )
        )

    def _mark_link(
        self,
        db: Session,
        *,
        user_id: int,
        action_item_id: int,
        calendar_id: str,
        status: str,
        error: str | None = None,
    ) -> ActionItemCalendarLink:
        link = self._get_link(db, user_id, action_item_id)
        if not link:
            link = ActionItemCalendarLink(
                action_item_id=action_item_id,
                user_id=user_id,
                calendar_id=calendar_id,
            )
        link.sync_status = status
        link.last_error = error
        link.last_synced_at = datetime.now(UTC)
        db.add(link)
        db.commit()
        db.refresh(link)
        return link

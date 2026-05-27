from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, DbSession
from app.crud.meetings import get_meeting
from app.models.enums import IntegrationType
from app.schemas.integration import MarkdownExportResponse, MockIntegrationResponse
from app.services.integrations.calendar import MockGoogleCalendarService
from app.services.integrations.gmail import MockGmailService
from app.services.integrations.mock_services import create_mock_log, render_markdown
from app.services.integrations.notion import MockNotionService


router = APIRouter(prefix="/meetings/{meeting_id}", tags=["export-integrations"])


def _get_owned_meeting(meeting_id: int, db: DbSession, current_user: CurrentUser):
    meeting = get_meeting(db, meeting_id, current_user.id)
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    return meeting


@router.post("/export/markdown", response_model=MarkdownExportResponse)
def export_markdown(meeting_id: int, db: DbSession, current_user: CurrentUser) -> MarkdownExportResponse:
    meeting = _get_owned_meeting(meeting_id, db, current_user)
    markdown = render_markdown(meeting)
    log = create_mock_log(
        db,
        meeting,
        IntegrationType.markdown,
        {"format": "markdown", "approval_required": True},
    )
    return MarkdownExportResponse(markdown=markdown, log=log)


@router.post("/integrations/notion/mock", response_model=MockIntegrationResponse)
def notion_mock(meeting_id: int, db: DbSession, current_user: CurrentUser) -> MockIntegrationResponse:
    meeting = _get_owned_meeting(meeting_id, db, current_user)
    log = MockNotionService().run_mock(db, meeting)
    return MockIntegrationResponse(message="Notion 저장 Mock이 완료되었습니다. 실제 저장 전 검토가 필요합니다.", log=log)


@router.post("/integrations/google-calendar/mock", response_model=MockIntegrationResponse)
def calendar_mock(meeting_id: int, db: DbSession, current_user: CurrentUser) -> MockIntegrationResponse:
    meeting = _get_owned_meeting(meeting_id, db, current_user)
    log = MockGoogleCalendarService().run_mock(db, meeting)
    return MockIntegrationResponse(message="Google Calendar 등록 Mock이 완료되었습니다. 실제 등록 전 검토가 필요합니다.", log=log)


@router.post("/integrations/gmail/mock", response_model=MockIntegrationResponse)
def gmail_mock(meeting_id: int, db: DbSession, current_user: CurrentUser) -> MockIntegrationResponse:
    meeting = _get_owned_meeting(meeting_id, db, current_user)
    log = MockGmailService().run_mock(db, meeting)
    return MockIntegrationResponse(message="Gmail 후속 메일 초안 Mock이 완료되었습니다. 자동 발송되지 않습니다.", log=log)

from sqlalchemy.orm import Session

from app.models.enums import IntegrationType
from app.models.integration_action_log import IntegrationActionLog
from app.models.meeting import Meeting
from app.services.integrations.mock_services import create_mock_log


class MockGmailService:
    def run_mock(self, db: Session, meeting: Meeting) -> IntegrationActionLog:
        draft = meeting.follow_up_email_drafts[-1] if meeting.follow_up_email_drafts else None
        return create_mock_log(
            db,
            meeting,
            IntegrationType.gmail,
            {
                "subject": draft.subject if draft else f"[후속 공유] {meeting.title}",
                "recipients": draft.recipients if draft else [],
                "approval_required": True,
            },
        )

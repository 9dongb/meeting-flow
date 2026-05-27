from sqlalchemy.orm import Session

from app.models.enums import IntegrationType
from app.models.integration_action_log import IntegrationActionLog
from app.models.meeting import Meeting
from app.services.integrations.mock_services import create_mock_log


class MockNotionService:
    def run_mock(self, db: Session, meeting: Meeting) -> IntegrationActionLog:
        return create_mock_log(
            db,
            meeting,
            IntegrationType.notion,
            {"page_title": meeting.title, "approval_required": True},
        )

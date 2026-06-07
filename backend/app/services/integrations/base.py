from abc import ABC, abstractmethod

from sqlalchemy.orm import Session

from app.models.integration_action_log import IntegrationActionLog
from app.models.meeting import Meeting


class IntegrationService(ABC):
    @abstractmethod
    def run_mock(self, db: Session, meeting: Meeting) -> IntegrationActionLog:
        """Create a user-approved mock integration log."""

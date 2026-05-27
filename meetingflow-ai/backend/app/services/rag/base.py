from abc import ABC, abstractmethod

from app.models.action_item import ActionItem
from app.models.decision import Decision
from app.models.meeting import Meeting
from app.services.rag.schemas import RagAnalysisContext, RagDocument, RagSearchResult


class MeetingKnowledgeStore(ABC):
    @abstractmethod
    def index_meeting_transcript(self, meeting: Meeting) -> None:
        """Index the raw meeting transcript for future context retrieval."""

    @abstractmethod
    def index_meeting_summary(self, meeting: Meeting) -> None:
        """Index the generated meeting summary."""

    @abstractmethod
    def index_decisions(self, meeting: Meeting, decisions: list[Decision]) -> None:
        """Index meeting decisions so future analyses can detect conflicts."""

    @abstractmethod
    def index_action_items(self, meeting: Meeting, action_items: list[ActionItem]) -> None:
        """Index action items so unresolved work can be tracked across meetings."""

    @abstractmethod
    def search_related_meetings(self, user_id: int, query: str, limit: int = 5) -> list[RagSearchResult]:
        """Find previous meetings related to a new transcript or topic."""

    @abstractmethod
    def search_previous_decisions(self, user_id: int, query: str, limit: int = 5) -> list[RagSearchResult]:
        """Find prior decisions that may inform or conflict with the current meeting."""

    @abstractmethod
    def search_unresolved_action_items(self, user_id: int, query: str, limit: int = 5) -> list[RagSearchResult]:
        """Find previous pending action items related to the current meeting."""

    @abstractmethod
    def build_analysis_context(self, meeting: Meeting) -> RagAnalysisContext:
        """Return compact RAG context that can be injected into an AI prompt."""

    @abstractmethod
    def upsert_documents(self, documents: list[RagDocument]) -> None:
        """Low-level vector-store upsert extension point."""

    @abstractmethod
    def search(self, user_id: int, query: str, limit: int = 5) -> list[RagSearchResult]:
        """Low-level vector-store search extension point."""

from app.models.action_item import ActionItem
from app.models.decision import Decision
from app.models.meeting import Meeting
from app.services.rag.base import MeetingKnowledgeStore
from app.services.rag.schemas import RagAnalysisContext, RagDocument, RagSearchResult


class PlaceholderMeetingKnowledgeStore(MeetingKnowledgeStore):
    def index_meeting_transcript(self, meeting: Meeting) -> None:
        return None

    def index_meeting_summary(self, meeting: Meeting) -> None:
        return None

    def index_decisions(self, meeting: Meeting, decisions: list[Decision]) -> None:
        return None

    def index_action_items(self, meeting: Meeting, action_items: list[ActionItem]) -> None:
        return None

    def search_related_meetings(self, user_id: int, query: str, limit: int = 5) -> list[RagSearchResult]:
        return []

    def search_previous_decisions(self, user_id: int, query: str, limit: int = 5) -> list[RagSearchResult]:
        return []

    def search_unresolved_action_items(self, user_id: int, query: str, limit: int = 5) -> list[RagSearchResult]:
        return []

    def build_analysis_context(self, meeting: Meeting) -> RagAnalysisContext:
        query = f"{meeting.title}\n{meeting.project_name or ''}\n{meeting.transcript[:1000]}"
        return RagAnalysisContext(
            related_meetings=self.search_related_meetings(meeting.user_id, query),
            previous_decisions=self.search_previous_decisions(meeting.user_id, query),
            unresolved_action_items=self.search_unresolved_action_items(meeting.user_id, query),
        )

    def upsert_documents(self, documents: list[RagDocument]) -> None:
        return None

    def search(self, user_id: int, query: str, limit: int = 5) -> list[RagSearchResult]:
        return []

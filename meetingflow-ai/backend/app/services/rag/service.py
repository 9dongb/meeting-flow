from app.core.config import get_settings
from app.models.action_item import ActionItem
from app.models.decision import Decision
from app.models.meeting import Meeting
from app.services.rag.base import MeetingKnowledgeStore
from app.services.rag.pinecone import PineconeClientPlaceholder
from app.services.rag.placeholder import PlaceholderMeetingKnowledgeStore
from app.services.rag.schemas import RagAnalysisContext, RagDocument, RagDocumentType, RagSearchResult


class RagService(MeetingKnowledgeStore):
    def __init__(self) -> None:
        settings = get_settings()
        self.enabled = settings.rag_enabled
        self.client = PineconeClientPlaceholder(settings)
        self.fallback = PlaceholderMeetingKnowledgeStore()

    def index_meeting_transcript(self, meeting: Meeting) -> None:
        if not self.enabled:
            return self.fallback.index_meeting_transcript(meeting)
        self.upsert_documents(
            [
                RagDocument(
                    id=f"meeting:{meeting.id}:transcript",
                    user_id=meeting.user_id,
                    meeting_id=meeting.id,
                    document_type=RagDocumentType.meeting_transcript,
                    text=meeting.transcript,
                    metadata={"title": meeting.title, "project_name": meeting.project_name},
                )
            ]
        )

    def index_meeting_summary(self, meeting: Meeting) -> None:
        if not meeting.summary:
            return None
        if not self.enabled:
            return self.fallback.index_meeting_summary(meeting)
        self.upsert_documents(
            [
                RagDocument(
                    id=f"meeting:{meeting.id}:summary",
                    user_id=meeting.user_id,
                    meeting_id=meeting.id,
                    document_type=RagDocumentType.meeting_summary,
                    text=meeting.summary,
                    metadata={"title": meeting.title, "project_name": meeting.project_name},
                )
            ]
        )

    def index_decisions(self, meeting: Meeting, decisions: list[Decision]) -> None:
        if not self.enabled:
            return self.fallback.index_decisions(meeting, decisions)
        self.upsert_documents(
            [
                RagDocument(
                    id=f"meeting:{meeting.id}:decision:{decision.id}",
                    user_id=meeting.user_id,
                    meeting_id=meeting.id,
                    document_type=RagDocumentType.decision,
                    text=decision.content,
                    metadata={
                        "reason": decision.reason,
                        "source_text": decision.source_text,
                        "confidence": decision.confidence,
                    },
                )
                for decision in decisions
            ]
        )

    def index_action_items(self, meeting: Meeting, action_items: list[ActionItem]) -> None:
        if not self.enabled:
            return self.fallback.index_action_items(meeting, action_items)
        self.upsert_documents(
            [
                RagDocument(
                    id=f"meeting:{meeting.id}:action_item:{item.id}",
                    user_id=meeting.user_id,
                    meeting_id=meeting.id,
                    document_type=RagDocumentType.action_item,
                    text=item.description,
                    metadata={
                        "assignee": item.assignee,
                        "due_date": item.due_date.isoformat() if item.due_date else None,
                        "priority": item.priority,
                        "status": item.status,
                        "source_text": item.source_text,
                    },
                )
                for item in action_items
            ]
        )

    def search_related_meetings(self, user_id: int, query: str, limit: int = 5) -> list[RagSearchResult]:
        if not self.enabled:
            return self.fallback.search_related_meetings(user_id, query, limit)
        return self.client.search(
            user_id,
            query,
            document_types=[RagDocumentType.meeting_transcript, RagDocumentType.meeting_summary],
            limit=limit,
        )

    def search_previous_decisions(self, user_id: int, query: str, limit: int = 5) -> list[RagSearchResult]:
        if not self.enabled:
            return self.fallback.search_previous_decisions(user_id, query, limit)
        return self.client.search(user_id, query, document_types=[RagDocumentType.decision], limit=limit)

    def search_unresolved_action_items(self, user_id: int, query: str, limit: int = 5) -> list[RagSearchResult]:
        if not self.enabled:
            return self.fallback.search_unresolved_action_items(user_id, query, limit)
        return self.client.search(user_id, query, document_types=[RagDocumentType.action_item], limit=limit)

    def build_analysis_context(self, meeting: Meeting) -> RagAnalysisContext:
        if not self.enabled:
            return self.fallback.build_analysis_context(meeting)
        query = f"{meeting.title}\n{meeting.project_name or ''}\n{meeting.transcript[:1000]}"
        return RagAnalysisContext(
            related_meetings=self.search_related_meetings(meeting.user_id, query),
            previous_decisions=self.search_previous_decisions(meeting.user_id, query),
            unresolved_action_items=self.search_unresolved_action_items(meeting.user_id, query),
        )

    def upsert_documents(self, documents: list[RagDocument]) -> None:
        if not self.enabled:
            return self.fallback.upsert_documents(documents)
        return self.client.upsert_documents(documents)

    def search(self, user_id: int, query: str, limit: int = 5) -> list[RagSearchResult]:
        if not self.enabled:
            return self.fallback.search(user_id, query, limit)
        return self.client.search(user_id, query, limit=limit)


def get_rag_service() -> RagService:
    return RagService()

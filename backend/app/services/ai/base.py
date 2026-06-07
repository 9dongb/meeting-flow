from abc import ABC, abstractmethod

from app.models.meeting import Meeting
from app.schemas.analysis import MeetingAnalysisResult
from app.services.rag.schemas import RagAnalysisContext


class MeetingAnalyzer(ABC):
    @abstractmethod
    def analyze(self, meeting: Meeting, rag_context: RagAnalysisContext | None = None) -> MeetingAnalysisResult:
        """Return a structured meeting analysis."""

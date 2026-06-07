from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class RagDocumentType(StrEnum):
    meeting_transcript = "meeting_transcript"
    meeting_summary = "meeting_summary"
    decision = "decision"
    action_item = "action_item"
    project_document = "project_document"


class RagDocument(BaseModel):
    id: str
    user_id: int
    text: str
    document_type: RagDocumentType
    meeting_id: int | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class RagSearchResult(BaseModel):
    document_id: str
    document_type: RagDocumentType
    text: str
    score: float = Field(ge=0, le=1, default=0)
    metadata: dict[str, Any] = Field(default_factory=dict)


class RagAnalysisContext(BaseModel):
    related_meetings: list[RagSearchResult] = Field(default_factory=list)
    previous_decisions: list[RagSearchResult] = Field(default_factory=list)
    unresolved_action_items: list[RagSearchResult] = Field(default_factory=list)

    @property
    def is_empty(self) -> bool:
        return not (self.related_meetings or self.previous_decisions or self.unresolved_action_items)

    def to_prompt_context(self) -> str:
        if self.is_empty:
            return "No previous RAG context is available."

        def render_section(title: str, results: list[RagSearchResult]) -> str:
            if not results:
                return f"{title}: none"
            lines = [title + ":"]
            lines.extend(f"- {item.text} (score={item.score:.2f})" for item in results)
            return "\n".join(lines)

        return "\n\n".join(
            [
                render_section("Related previous meetings", self.related_meetings),
                render_section("Previous decisions", self.previous_decisions),
                render_section("Unresolved action items", self.unresolved_action_items),
            ]
        )

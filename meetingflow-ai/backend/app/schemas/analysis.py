from datetime import date

from pydantic import BaseModel, Field

from app.models.enums import ActionPriority


class DecisionAnalysis(BaseModel):
    content: str
    reason: str | None = None
    source_text: str | None = None
    confidence: float = Field(ge=0, le=1, default=0.0)


class ActionItemAnalysis(BaseModel):
    assignee: str | None = None
    description: str
    due_date: date | None = None
    priority: ActionPriority = ActionPriority.medium
    confidence: float = Field(ge=0, le=1, default=0.0)
    source_text: str | None = None


class UnresolvedIssueAnalysis(BaseModel):
    content: str
    owner: str | None = None
    next_step: str | None = None
    source_text: str | None = None


class FollowUpEmailAnalysis(BaseModel):
    subject: str
    body: str
    recipients: list[str] = Field(default_factory=list)


class MeetingAnalysisResult(BaseModel):
    summary: str
    topics: list[str] = Field(default_factory=list)
    decisions: list[DecisionAnalysis] = Field(default_factory=list)
    action_items: list[ActionItemAnalysis] = Field(default_factory=list)
    unresolved_issues: list[UnresolvedIssueAnalysis] = Field(default_factory=list)
    follow_up_email: FollowUpEmailAnalysis

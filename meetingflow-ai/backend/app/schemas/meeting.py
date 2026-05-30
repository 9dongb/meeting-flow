from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import ActionPriority, ActionStatus


class ParticipantCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str | None = None

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Participant name is required")
        return value


class ParticipantRead(ParticipantCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)


class DecisionRead(BaseModel):
    id: int
    content: str
    reason: str | None = None
    source_text: str | None = None
    confidence: float

    model_config = ConfigDict(from_attributes=True)


class ActionItemRead(BaseModel):
    id: int
    meeting_id: int
    assignee: str | None = None
    description: str
    due_date: date | None = None
    priority: ActionPriority
    status: ActionStatus
    confidence: float
    source_text: str | None = None
    calendar_sync_status: str | None = None
    calendar_sync_error: str | None = None

    model_config = ConfigDict(from_attributes=True)


class UnresolvedIssueRead(BaseModel):
    id: int
    content: str
    owner: str | None = None
    next_step: str | None = None
    source_text: str | None = None

    model_config = ConfigDict(from_attributes=True)


class FollowUpEmailDraftRead(BaseModel):
    id: int
    subject: str
    body: str
    recipients: list[str] | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DecisionAnalysisUpdate(BaseModel):
    content: str = Field(min_length=1)
    reason: str | None = None
    source_text: str | None = None
    confidence: float = Field(default=1.0, ge=0, le=1)

    @field_validator("content")
    @classmethod
    def strip_decision_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Decision content is required")
        return value


class ActionItemAnalysisUpdate(BaseModel):
    assignee: str | None = Field(default=None, max_length=120)
    description: str = Field(min_length=1)
    due_date: date | None = None
    priority: ActionPriority = ActionPriority.medium
    status: ActionStatus = ActionStatus.pending
    confidence: float = Field(default=1.0, ge=0, le=1)
    source_text: str | None = None

    @field_validator("description")
    @classmethod
    def strip_action_description(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Action item description is required")
        return value

    @field_validator("assignee")
    @classmethod
    def strip_action_assignee(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        return value or None


class UnresolvedIssueAnalysisUpdate(BaseModel):
    content: str = Field(min_length=1)
    owner: str | None = Field(default=None, max_length=120)
    next_step: str | None = None
    source_text: str | None = None

    @field_validator("content")
    @classmethod
    def strip_issue_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Issue content is required")
        return value

    @field_validator("owner")
    @classmethod
    def strip_issue_owner(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        return value or None


class MeetingAnalysisUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    meeting_date: date | None = None
    summary: str = Field(default="", max_length=200000)
    participants: list[ParticipantCreate] = Field(default_factory=list)
    decisions: list[DecisionAnalysisUpdate] = Field(default_factory=list)
    action_items: list[ActionItemAnalysisUpdate] = Field(default_factory=list)
    unresolved_issues: list[UnresolvedIssueAnalysisUpdate] = Field(default_factory=list)

    @field_validator("title")
    @classmethod
    def strip_analysis_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Meeting title is required")
        return value


class MeetingCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    project_name: str | None = Field(default=None, max_length=255)
    meeting_date: date | None = None
    transcript: str = Field(default="", max_length=200000)
    participants: list[ParticipantCreate] = Field(default_factory=list)

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Meeting title is required")
        return value

    @field_validator("project_name")
    @classmethod
    def strip_project_name(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        return value or None


class MeetingUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    project_name: str | None = Field(default=None, max_length=255)
    meeting_date: date | None = None
    transcript: str | None = Field(default=None, max_length=200000)
    participants: list[ParticipantCreate] | None = None

    @field_validator("title")
    @classmethod
    def strip_optional_title(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Meeting title is required")
        return value

    @field_validator("project_name")
    @classmethod
    def strip_optional_project_name(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        return value or None


class MeetingRead(BaseModel):
    id: int
    user_id: int
    team_id: int | None = None
    title: str
    project_name: str | None = None
    meeting_date: date | None = None
    transcript: str
    summary: str | None = None
    created_at: datetime
    updated_at: datetime
    participants: list[ParticipantRead] = Field(default_factory=list)
    action_items: list[ActionItemRead] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class MeetingDetail(MeetingRead):
    decisions: list[DecisionRead] = Field(default_factory=list)
    action_items: list[ActionItemRead] = Field(default_factory=list)
    unresolved_issues: list[UnresolvedIssueRead] = Field(default_factory=list)
    follow_up_email_drafts: list[FollowUpEmailDraftRead] = Field(default_factory=list)

from datetime import date

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.enums import ActionPriority, ActionStatus


class ActionItemWithMeetingRead(BaseModel):
    id: int
    meeting_id: int
    meeting_title: str
    meeting_date: date | None = None
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


class ActionItemUpdate(BaseModel):
    assignee: str | None = None
    description: str | None = None
    due_date: date | None = None
    priority: ActionPriority | None = None
    status: ActionStatus | None = None
    source_text: str | None = None

    @field_validator("description")
    @classmethod
    def strip_description(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Action item description cannot be empty")
        return value

from datetime import date

from pydantic import BaseModel, field_validator

from app.models.enums import ActionPriority, ActionStatus


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

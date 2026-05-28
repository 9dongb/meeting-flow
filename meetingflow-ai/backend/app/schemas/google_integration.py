from pydantic import BaseModel, Field


class GoogleCalendarStatus(BaseModel):
    connected: bool
    sync_enabled: bool
    email: str | None = None
    calendar_id: str = "primary"


class GoogleCalendarSettingsUpdate(BaseModel):
    sync_enabled: bool | None = None
    calendar_id: str | None = Field(default=None, max_length=255)

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import IntegrationStatus, IntegrationType


class MarkdownExportResponse(BaseModel):
    markdown: str
    log: "IntegrationActionLogRead"


class IntegrationActionLogRead(BaseModel):
    id: int
    meeting_id: int
    integration_type: IntegrationType
    status: IntegrationStatus
    payload_json: dict
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MockIntegrationResponse(BaseModel):
    message: str
    requires_user_approval: bool = True
    log: IntegrationActionLogRead


class NotionStatus(BaseModel):
    connected: bool
    workspace_name: str | None = None
    owner_email: str | None = None
    meetingflow_page_url: str | None = None


class NotionDraftResponse(BaseModel):
    page_id: str
    url: str | None = None
    log: IntegrationActionLogRead


MarkdownExportResponse.model_rebuild()
NotionDraftResponse.model_rebuild()

from enum import StrEnum


class ActionPriority(StrEnum):
    low = "low"
    medium = "medium"
    high = "high"


class ActionStatus(StrEnum):
    pending = "pending"
    in_progress = "in_progress"
    done = "done"


class IntegrationType(StrEnum):
    notion = "notion"
    google_calendar = "google_calendar"
    gmail = "gmail"
    markdown = "markdown"


class IntegrationStatus(StrEnum):
    mock_success = "mock_success"
    mock_failed = "mock_failed"

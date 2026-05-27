from datetime import UTC, datetime

from sqlalchemy import DateTime, Enum, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import IntegrationStatus, IntegrationType


class IntegrationActionLog(Base):
    __tablename__ = "integration_action_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"), index=True)
    integration_type: Mapped[IntegrationType] = mapped_column(Enum(IntegrationType), nullable=False)
    status: Mapped[IntegrationStatus] = mapped_column(Enum(IntegrationStatus), nullable=False)
    payload_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    meeting: Mapped["Meeting"] = relationship(back_populates="integration_logs")

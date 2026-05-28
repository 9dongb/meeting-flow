from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class ActionItemCalendarLink(Base):
    __tablename__ = "action_item_calendar_links"

    id: Mapped[int] = mapped_column(primary_key=True)
    action_item_id: Mapped[int] = mapped_column(ForeignKey("action_items.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    google_event_id: Mapped[str | None] = mapped_column(String(255))
    calendar_id: Mapped[str] = mapped_column(String(255), default="primary", nullable=False)
    sync_status: Mapped[str] = mapped_column(String(32), default="synced", nullable=False)
    last_error: Mapped[str | None] = mapped_column(Text)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    action_item: Mapped["ActionItem"] = relationship(back_populates="calendar_links")
    user: Mapped["User"] = relationship(back_populates="calendar_links")

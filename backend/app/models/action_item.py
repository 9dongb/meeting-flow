from datetime import date

from sqlalchemy import Date, Enum, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import ActionPriority, ActionStatus


class ActionItem(Base):
    __tablename__ = "action_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"), index=True)
    assignee: Mapped[str | None] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text, nullable=False)
    due_date: Mapped[date | None] = mapped_column(Date)
    priority: Mapped[ActionPriority] = mapped_column(
        Enum(ActionPriority), default=ActionPriority.medium, nullable=False
    )
    status: Mapped[ActionStatus] = mapped_column(
        Enum(ActionStatus), default=ActionStatus.pending, nullable=False
    )
    confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    source_text: Mapped[str | None] = mapped_column(Text)

    meeting: Mapped["Meeting"] = relationship(back_populates="action_items")
    calendar_links: Mapped[list["ActionItemCalendarLink"]] = relationship(
        back_populates="action_item", cascade="all, delete-orphan"
    )

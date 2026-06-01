from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    active_team_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id", ondelete="SET NULL"), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    meetings: Mapped[list["Meeting"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    team_memberships: Mapped[list["TeamMembership"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    active_team: Mapped["Team | None"] = relationship(foreign_keys=[active_team_id])
    google_account: Mapped["UserGoogleAccount | None"] = relationship(back_populates="user", cascade="all, delete-orphan")
    notion_account: Mapped["UserNotionAccount | None"] = relationship(back_populates="user", cascade="all, delete-orphan")
    calendar_links: Mapped[list["ActionItemCalendarLink"]] = relationship(back_populates="user", cascade="all, delete-orphan")

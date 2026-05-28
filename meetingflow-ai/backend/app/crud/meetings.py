from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.meeting import Meeting
from app.models.participant import Participant
from app.schemas.meeting import MeetingCreate, MeetingUpdate


def list_meetings(db: Session, team_id: int) -> list[Meeting]:
    statement = (
        select(Meeting)
        .where(Meeting.team_id == team_id)
        .options(selectinload(Meeting.participants), selectinload(Meeting.action_items))
        .order_by(Meeting.created_at.desc())
    )
    return list(db.scalars(statement).all())


def get_meeting(db: Session, meeting_id: int, team_id: int) -> Meeting | None:
    statement = (
        select(Meeting)
        .where(Meeting.id == meeting_id, Meeting.team_id == team_id)
        .options(
            selectinload(Meeting.participants),
            selectinload(Meeting.decisions),
            selectinload(Meeting.action_items),
            selectinload(Meeting.unresolved_issues),
            selectinload(Meeting.follow_up_email_drafts),
        )
    )
    return db.scalar(statement)


def create_meeting(db: Session, user_id: int, team_id: int, meeting_in: MeetingCreate) -> Meeting:
    meeting = Meeting(
        user_id=user_id,
        team_id=team_id,
        title=meeting_in.title,
        project_name=meeting_in.project_name,
        meeting_date=meeting_in.meeting_date,
        transcript=meeting_in.transcript,
    )
    meeting.participants = [
        Participant(name=participant.name, email=participant.email)
        for participant in meeting_in.participants
        if participant.name.strip()
    ]
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting


def delete_meeting(db: Session, meeting: Meeting) -> None:
    db.delete(meeting)
    db.commit()


def update_meeting(db: Session, meeting: Meeting, meeting_in: MeetingUpdate) -> Meeting:
    update_data = meeting_in.model_dump(exclude_unset=True, exclude={"participants"})
    for field, value in update_data.items():
        setattr(meeting, field, value)

    if meeting_in.participants is not None:
        meeting.participants = [
            Participant(name=participant.name, email=participant.email)
            for participant in meeting_in.participants
            if participant.name.strip()
        ]

    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting

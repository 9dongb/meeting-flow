from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, DbSession
from app.crud.meetings import create_meeting, delete_meeting, get_meeting, list_meetings
from app.crud.teams import get_active_team
from app.schemas.analysis import MeetingAnalysisResult
from app.schemas.meeting import MeetingCreate, MeetingDetail, MeetingRead
from app.services.ai.service import MeetingAnalysisUnavailableError, analyze_and_persist_meeting


router = APIRouter(prefix="/meetings", tags=["meetings"])


@router.get("", response_model=list[MeetingRead])
def get_meetings(db: DbSession, current_user: CurrentUser) -> list[MeetingRead]:
    team = get_active_team(db, current_user)
    return list_meetings(db, team.id)


@router.post("", response_model=MeetingRead, status_code=status.HTTP_201_CREATED)
def post_meeting(
    meeting_in: MeetingCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> MeetingRead:
    team = get_active_team(db, current_user)
    return create_meeting(db, current_user.id, team.id, meeting_in)


@router.get("/{meeting_id}", response_model=MeetingDetail)
def get_meeting_detail(meeting_id: int, db: DbSession, current_user: CurrentUser) -> MeetingDetail:
    team = get_active_team(db, current_user)
    meeting = get_meeting(db, meeting_id, team.id)
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    return meeting


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_meeting(meeting_id: int, db: DbSession, current_user: CurrentUser) -> None:
    team = get_active_team(db, current_user)
    meeting = get_meeting(db, meeting_id, team.id)
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    delete_meeting(db, meeting)


@router.post("/{meeting_id}/analyze", response_model=MeetingAnalysisResult)
def analyze_meeting(meeting_id: int, db: DbSession, current_user: CurrentUser) -> MeetingAnalysisResult:
    team = get_active_team(db, current_user)
    meeting = get_meeting(db, meeting_id, team.id)
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    try:
        return analyze_and_persist_meeting(db, meeting)
    except MeetingAnalysisUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Meeting analysis is unavailable: {exc}",
        ) from exc

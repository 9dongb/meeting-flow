from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, DbSession
from app.crud.action_items import (
    delete_action_item,
    get_action_item_for_user,
    list_action_items,
    list_user_action_items,
    update_action_item,
)
from app.crud.meetings import get_meeting
from app.crud.teams import get_active_team
from app.models.enums import ActionPriority, ActionStatus
from app.schemas.action_item import ActionItemUpdate, ActionItemWithMeetingRead
from app.schemas.meeting import ActionItemRead
from app.services.integrations.google_calendar_sync import GoogleCalendarSyncError, GoogleCalendarSyncService


router = APIRouter(tags=["action-items"])


@router.get("/action-items", response_model=list[ActionItemWithMeetingRead])
def get_user_action_items(
    db: DbSession,
    current_user: CurrentUser,
    status: ActionStatus | None = None,
    priority: ActionPriority | None = None,
    assignee: str | None = None,
) -> list[ActionItemWithMeetingRead]:
    team = get_active_team(db, current_user)
    items = list_user_action_items(
        db,
        team.id,
        status=status,
        priority=priority,
        assignee=assignee,
    )
    return [
        ActionItemWithMeetingRead(
            id=item.id,
            meeting_id=item.meeting_id,
            meeting_title=item.meeting.title,
            meeting_date=item.meeting.meeting_date,
            assignee=item.assignee,
            description=item.description,
            due_date=item.due_date,
            priority=item.priority,
            status=item.status,
            confidence=item.confidence,
            source_text=item.source_text,
            calendar_sync_status=_calendar_status(item, current_user.id)[0],
            calendar_sync_error=_calendar_status(item, current_user.id)[1],
        )
        for item in items
    ]


@router.get("/meetings/{meeting_id}/action-items", response_model=list[ActionItemRead])
def get_meeting_action_items(
    meeting_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> list[ActionItemRead]:
    team = get_active_team(db, current_user)
    if not get_meeting(db, meeting_id, team.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    return [_to_action_item_read(item, current_user.id) for item in list_action_items(db, meeting_id)]


@router.patch("/action-items/{action_item_id}", response_model=ActionItemRead)
def patch_action_item(
    action_item_id: int,
    item_in: ActionItemUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> ActionItemRead:
    team = get_active_team(db, current_user)
    item = get_action_item_for_user(db, action_item_id, team.id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Action item not found")
    updated = update_action_item(db, item, item_in)
    try:
        GoogleCalendarSyncService().sync_action_item(db, current_user.id, updated)
    except GoogleCalendarSyncError:
        pass
    return _to_action_item_read(updated, current_user.id)


@router.delete("/action-items/{action_item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_action_item(action_item_id: int, db: DbSession, current_user: CurrentUser) -> None:
    team = get_active_team(db, current_user)
    item = get_action_item_for_user(db, action_item_id, team.id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Action item not found")
    try:
        GoogleCalendarSyncService().delete_action_item_event(db, current_user.id, item)
    except GoogleCalendarSyncError:
        pass
    delete_action_item(db, item)


def _calendar_status(item, user_id: int) -> tuple[str | None, str | None]:
    link = next((candidate for candidate in item.calendar_links if candidate.user_id == user_id), None)
    if not link:
        return None, None
    return link.sync_status, link.last_error


def _to_action_item_read(item, user_id: int) -> ActionItemRead:
    sync_status, sync_error = _calendar_status(item, user_id)
    return ActionItemRead(
        id=item.id,
        meeting_id=item.meeting_id,
        assignee=item.assignee,
        description=item.description,
        due_date=item.due_date,
        priority=item.priority,
        status=item.status,
        confidence=item.confidence,
        source_text=item.source_text,
        calendar_sync_status=sync_status,
        calendar_sync_error=sync_error,
    )

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
from app.models.enums import ActionPriority, ActionStatus
from app.schemas.action_item import ActionItemUpdate, ActionItemWithMeetingRead
from app.schemas.meeting import ActionItemRead


router = APIRouter(tags=["action-items"])


@router.get("/action-items", response_model=list[ActionItemWithMeetingRead])
def get_user_action_items(
    db: DbSession,
    current_user: CurrentUser,
    status: ActionStatus | None = None,
    priority: ActionPriority | None = None,
    assignee: str | None = None,
) -> list[ActionItemWithMeetingRead]:
    items = list_user_action_items(
        db,
        current_user.id,
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
        )
        for item in items
    ]


@router.get("/meetings/{meeting_id}/action-items", response_model=list[ActionItemRead])
def get_meeting_action_items(
    meeting_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> list[ActionItemRead]:
    if not get_meeting(db, meeting_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    return list_action_items(db, meeting_id)


@router.patch("/action-items/{action_item_id}", response_model=ActionItemRead)
def patch_action_item(
    action_item_id: int,
    item_in: ActionItemUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> ActionItemRead:
    item = get_action_item_for_user(db, action_item_id, current_user.id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Action item not found")
    return update_action_item(db, item, item_in)


@router.delete("/action-items/{action_item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_action_item(action_item_id: int, db: DbSession, current_user: CurrentUser) -> None:
    item = get_action_item_for_user(db, action_item_id, current_user.id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Action item not found")
    delete_action_item(db, item)

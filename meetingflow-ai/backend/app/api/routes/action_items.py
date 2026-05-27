from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, DbSession
from app.crud.action_items import (
    delete_action_item,
    get_action_item_for_user,
    list_action_items,
    update_action_item,
)
from app.crud.meetings import get_meeting
from app.schemas.action_item import ActionItemUpdate
from app.schemas.meeting import ActionItemRead


router = APIRouter(tags=["action-items"])


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

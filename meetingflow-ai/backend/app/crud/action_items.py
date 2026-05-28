from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.action_item import ActionItem
from app.models.enums import ActionPriority, ActionStatus
from app.schemas.action_item import ActionItemUpdate


def list_user_action_items(
    db: Session,
    team_id: int,
    status: ActionStatus | None = None,
    priority: ActionPriority | None = None,
    assignee: str | None = None,
) -> list[ActionItem]:
    statement = (
        select(ActionItem)
        .join(ActionItem.meeting)
        .where(ActionItem.meeting.has(team_id=team_id))
        .options(selectinload(ActionItem.meeting))
        .order_by(ActionItem.due_date.is_(None), ActionItem.due_date.asc(), ActionItem.id.desc())
    )
    if status:
        statement = statement.where(ActionItem.status == status)
    if priority:
        statement = statement.where(ActionItem.priority == priority)
    if assignee:
        statement = statement.where(ActionItem.assignee == assignee)
    return list(db.scalars(statement).all())


def list_action_items(db: Session, meeting_id: int) -> list[ActionItem]:
    return list(db.scalars(select(ActionItem).where(ActionItem.meeting_id == meeting_id)).all())


def get_action_item_for_user(db: Session, action_item_id: int, team_id: int) -> ActionItem | None:
    statement = select(ActionItem).join(ActionItem.meeting).where(
        ActionItem.id == action_item_id,
        ActionItem.meeting.has(team_id=team_id),
    )
    return db.scalar(statement)


def update_action_item(db: Session, item: ActionItem, item_in: ActionItemUpdate) -> ActionItem:
    update_data = item_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def delete_action_item(db: Session, item: ActionItem) -> None:
    db.delete(item)
    db.commit()

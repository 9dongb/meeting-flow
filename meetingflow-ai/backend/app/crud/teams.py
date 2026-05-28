import secrets

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.team import Team
from app.models.team_membership import TeamMembership
from app.models.user import User


def generate_invite_code() -> str:
    return secrets.token_urlsafe(8)


def get_team(db: Session, team_id: int) -> Team | None:
    return db.get(Team, team_id)


def get_team_by_invite_code(db: Session, invite_code: str) -> Team | None:
    return db.scalar(select(Team).where(Team.invite_code == invite_code.strip()))


def get_active_team(db: Session, user: User) -> Team:
    if user.active_team_id:
        team = get_team(db, user.active_team_id)
        if team:
            return team
    return create_default_team_for_user(db, user)


def create_default_team_for_user(db: Session, user: User) -> Team:
    team = Team(name=default_team_name(user.email), invite_code=unique_invite_code(db))
    db.add(team)
    db.flush()
    db.add(TeamMembership(team_id=team.id, user_id=user.id, role="owner"))
    user.active_team_id = team.id
    db.add(user)
    db.commit()
    db.refresh(team)
    db.refresh(user)
    return team


def join_team_by_invite_code(db: Session, user: User, invite_code: str) -> Team | None:
    team = get_team_by_invite_code(db, invite_code)
    if not team:
        return None
    membership = db.scalar(
        select(TeamMembership).where(TeamMembership.team_id == team.id, TeamMembership.user_id == user.id)
    )
    if not membership:
        db.add(TeamMembership(team_id=team.id, user_id=user.id, role="member"))
    user.active_team_id = team.id
    db.add(user)
    db.commit()
    db.refresh(team)
    db.refresh(user)
    return team


def update_team_name(db: Session, team: Team, name: str) -> Team:
    team.name = name.strip()
    db.add(team)
    db.commit()
    db.refresh(team)
    return team


def count_team_members(db: Session, team_id: int) -> int:
    return int(db.scalar(select(func.count()).select_from(TeamMembership).where(TeamMembership.team_id == team_id)) or 0)


def get_team_role(db: Session, team_id: int, user_id: int) -> str:
    membership = db.scalar(
        select(TeamMembership).where(TeamMembership.team_id == team_id, TeamMembership.user_id == user_id)
    )
    return membership.role if membership else "member"


def unique_invite_code(db: Session) -> str:
    while True:
        code = generate_invite_code()
        if not get_team_by_invite_code(db, code):
            return code


def default_team_name(email: str) -> str:
    local_part = email.split("@", maxsplit=1)[0]
    return f"{local_part} 팀"

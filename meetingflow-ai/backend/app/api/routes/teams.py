from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, DbSession
from app.crud.teams import count_team_members, get_active_team, get_team_role, join_team_by_invite_code, list_team_members, update_team_name
from app.models.team import Team
from app.schemas.team import TeamJoinRequest, TeamMemberRead, TeamRead, TeamUpdate


router = APIRouter(prefix="/teams", tags=["teams"])


@router.get("/current", response_model=TeamRead)
def get_current_team(db: DbSession, current_user: CurrentUser) -> TeamRead:
    team = get_active_team(db, current_user)
    return to_team_read(db, team.id, current_user.id)


@router.patch("/current", response_model=TeamRead)
def patch_current_team(team_in: TeamUpdate, db: DbSession, current_user: CurrentUser) -> TeamRead:
    team = get_active_team(db, current_user)
    update_team_name(db, team, team_in.name)
    return to_team_read(db, team.id, current_user.id)


@router.post("/join", response_model=TeamRead)
def join_team(join_in: TeamJoinRequest, db: DbSession, current_user: CurrentUser) -> TeamRead:
    team = join_team_by_invite_code(db, current_user, join_in.invite_code)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team invite code not found")
    return to_team_read(db, team.id, current_user.id)


def to_team_read(db: DbSession, team_id: int, user_id: int) -> TeamRead:
    team = db.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    return TeamRead(
        id=team.id,
        name=team.name,
        invite_code=team.invite_code,
        role=get_team_role(db, team.id, user_id),
        member_count=count_team_members(db, team.id),
        members=[
            TeamMemberRead(
                id=user.id,
                name=user.email.split("@", maxsplit=1)[0],
                email=user.email,
                role=membership.role,
                joined_at=membership.created_at,
            )
            for membership, user in list_team_members(db, team.id)
        ],
        created_at=team.created_at,
    )

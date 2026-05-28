import secrets

from sqlalchemy import Engine, inspect, text


def run_lightweight_migrations(engine: Engine) -> None:
    if engine.dialect.name != "sqlite":
        return

    inspector = inspect(engine)
    with engine.begin() as connection:
        user_columns = {column["name"] for column in inspector.get_columns("users")}
        if "active_team_id" not in user_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN active_team_id INTEGER"))

        meeting_columns = {column["name"] for column in inspector.get_columns("meetings")}
        if "team_id" not in meeting_columns:
            connection.execute(text("ALTER TABLE meetings ADD COLUMN team_id INTEGER"))

        users = connection.execute(text("SELECT id, email, active_team_id FROM users")).mappings().all()
        for user in users:
            active_team_id = user["active_team_id"]
            if not active_team_id:
                result = connection.execute(
                    text("INSERT INTO teams (name, invite_code, created_at) VALUES (:name, :invite_code, CURRENT_TIMESTAMP)"),
                    {"name": default_team_name(user["email"]), "invite_code": unique_invite_code(connection)},
                )
                active_team_id = int(result.lastrowid)
                connection.execute(
                    text(
                        "INSERT OR IGNORE INTO team_memberships (team_id, user_id, role, created_at) "
                        "VALUES (:team_id, :user_id, 'owner', CURRENT_TIMESTAMP)"
                    ),
                    {"team_id": active_team_id, "user_id": user["id"]},
                )
                connection.execute(
                    text("UPDATE users SET active_team_id = :team_id WHERE id = :user_id"),
                    {"team_id": active_team_id, "user_id": user["id"]},
                )

            connection.execute(
                text("UPDATE meetings SET team_id = :team_id WHERE user_id = :user_id AND team_id IS NULL"),
                {"team_id": active_team_id, "user_id": user["id"]},
            )


def unique_invite_code(connection) -> str:
    while True:
        code = secrets.token_urlsafe(8)
        exists = connection.execute(text("SELECT 1 FROM teams WHERE invite_code = :code"), {"code": code}).first()
        if not exists:
            return code


def default_team_name(email: str) -> str:
    local_part = email.split("@", maxsplit=1)[0]
    return f"{local_part} 팀"

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

        BaseTableCheck = inspector.get_table_names()
        if "user_google_accounts" not in BaseTableCheck or "action_item_calendar_links" not in BaseTableCheck:
            return
        google_account_columns = {column["name"] for column in inspector.get_columns("user_google_accounts")}
        if "granted_scopes" not in google_account_columns:
            connection.execute(text("ALTER TABLE user_google_accounts ADD COLUMN granted_scopes TEXT"))
        if "calendar_scope_granted" not in google_account_columns:
            connection.execute(
                text("ALTER TABLE user_google_accounts ADD COLUMN calendar_scope_granted BOOLEAN NOT NULL DEFAULT 0")
            )
            connection.execute(text("UPDATE user_google_accounts SET calendar_sync_enabled = 0"))

        calendar_link_columns = {
            column["name"]: column for column in inspector.get_columns("action_item_calendar_links")
        }
        if calendar_link_columns.get("google_event_id", {}).get("nullable") is False:
            connection.execute(text("ALTER TABLE action_item_calendar_links RENAME TO action_item_calendar_links_old"))
            connection.execute(
                text(
                    """
                    CREATE TABLE action_item_calendar_links (
                        id INTEGER NOT NULL,
                        action_item_id INTEGER NOT NULL,
                        user_id INTEGER NOT NULL,
                        google_event_id VARCHAR(255),
                        calendar_id VARCHAR(255) NOT NULL,
                        sync_status VARCHAR(32) NOT NULL,
                        last_error TEXT,
                        last_synced_at DATETIME,
                        created_at DATETIME NOT NULL,
                        PRIMARY KEY (id),
                        FOREIGN KEY(action_item_id) REFERENCES action_items (id) ON DELETE CASCADE,
                        FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
                    )
                    """
                )
            )
            connection.execute(
                text(
                    """
                    INSERT INTO action_item_calendar_links (
                        id, action_item_id, user_id, google_event_id, calendar_id, sync_status,
                        last_error, last_synced_at, created_at
                    )
                    SELECT id, action_item_id, user_id, google_event_id, calendar_id, sync_status,
                           last_error, last_synced_at, created_at
                    FROM action_item_calendar_links_old
                    """
                )
            )
            connection.execute(text("DROP TABLE action_item_calendar_links_old"))

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

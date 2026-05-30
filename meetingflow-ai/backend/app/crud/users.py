from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password
from app.crud.teams import create_default_team_for_user
from app.models.user import User
from app.schemas.user import UserCreate


def user_name_from_email(email: str) -> str:
    return email.split("@", maxsplit=1)[0]


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email.lower()))


def create_user(db: Session, user_in: UserCreate) -> User:
    email = user_in.email.lower()
    name = user_in.name.strip() if user_in.name else user_name_from_email(email)
    user = User(name=name, email=email, hashed_password=get_password_hash(user_in.password))
    db.add(user)
    db.flush()
    create_default_team_for_user(db, user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def update_user_name(db: Session, user: User, name: str) -> User:
    user.name = name.strip()
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

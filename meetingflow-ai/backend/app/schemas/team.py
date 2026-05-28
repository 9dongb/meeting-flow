from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class TeamRead(BaseModel):
    id: int
    name: str
    invite_code: str
    role: str
    member_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TeamUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=120)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Team name is required")
        return value


class TeamJoinRequest(BaseModel):
    invite_code: str = Field(min_length=4, max_length=128)

    @field_validator("invite_code")
    @classmethod
    def strip_invite_code(cls, value: str) -> str:
        return value.strip()

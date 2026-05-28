from functools import lru_cache

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "MeetingFlow AI"
    environment: str = "local"
    database_url: str = "sqlite:///./meetingflow.db"
    jwt_secret_key: str = Field(default="change-this-secret-in-production")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7
    auth_cookie_name: str = "meetingflow_access_token"
    auth_cookie_secure: bool = False
    auth_cookie_samesite: str = "lax"
    backend_cors_origins: str = "http://localhost:3000"
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    openai_base_url: str = "https://api.openai.com/v1"
    openai_timeout_seconds: float = 60.0
    groq_api_key: str | None = None
    groq_model: str = "llama-3.3-70b-versatile"
    groq_base_url: str = "https://api.groq.com/openai/v1"
    groq_timeout_seconds: float = 45.0
    ai_provider: str = "groq"
    ai_mock_fallback: bool = True
    ai_max_transcript_chars: int = 20000
    pinecone_api_key: str | None = None
    pinecone_index_name: str | None = None
    pinecone_namespace: str = "meetingflow-local"
    rag_enabled: bool = False

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origins(self) -> list[str | AnyHttpUrl]:
        return [origin.strip() for origin in self.backend_cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

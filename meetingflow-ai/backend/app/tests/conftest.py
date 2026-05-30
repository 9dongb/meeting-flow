from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.db.session import Base, get_db
from app.main import app
from app.services.ai import service as ai_service
from app.services.ai.mock_analyzer import MockMeetingAnalyzer


@pytest.fixture()
def client(tmp_path, monkeypatch: pytest.MonkeyPatch) -> Generator[TestClient, None, None]:
    monkeypatch.setattr(ai_service, "get_meeting_analyzer", lambda: MockMeetingAnalyzer())
    test_db_url = f"sqlite:///{tmp_path}/test.db"
    engine = create_engine(test_db_url, connect_args={"check_same_thread": False})
    testing_session = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    Base.metadata.create_all(bind=engine)

    def override_get_db() -> Generator[Session, None, None]:
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)

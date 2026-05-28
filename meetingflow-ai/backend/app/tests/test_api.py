from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.meeting import Meeting
from app.services.ai import service as ai_service
from app.services.ai.groq_analyzer import AIProviderError
from app.services.rag.schemas import RagAnalysisContext
from app.services.rag.service import get_rag_service


def register(client: TestClient, email: str = "user@example.com", password: str = "password123") -> None:
    response = client.post("/auth/register", json={"email": email, "password": password})
    assert response.status_code == 201


def login(client: TestClient, email: str = "user@example.com", password: str = "password123") -> None:
    response = client.post("/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200


def create_meeting(client: TestClient, title: str = "MVP 스모크 테스트") -> int:
    response = client.post(
        "/meetings",
        json={
            "title": title,
            "project_name": "MeetingFlow AI",
            "meeting_date": "2026-05-24",
            "transcript": "액션 아이템과 승인 기반 Mock 연동을 확인한다.",
            "participants": [{"name": "민지"}],
        },
    )
    assert response.status_code == 201
    return int(response.json()["id"])


def test_health() -> None:
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


def test_register_login_and_me(client: TestClient) -> None:
    register(client)
    me_response = client.get("/auth/me")
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "user@example.com"

    logout_response = client.post("/auth/logout")
    assert logout_response.status_code == 204
    assert client.get("/auth/me").status_code == 401

    login(client)
    assert client.get("/auth/me").status_code == 200


def test_google_auth_and_calendar_status_defaults(client: TestClient) -> None:
    login_response = client.get("/auth/google/login", follow_redirects=False)
    assert login_response.status_code in {302, 503}

    register(client)
    calendar_status = client.get("/integrations/google-calendar/status")
    assert calendar_status.status_code == 200
    assert calendar_status.json() == {
        "connected": False,
        "sync_enabled": False,
        "email": None,
        "calendar_id": "primary",
        "synced_count": 0,
        "failed_count": 0,
        "skipped_count": 0,
        "last_error": None,
    }


def test_protected_routes_require_authentication(client: TestClient) -> None:
    assert client.get("/meetings").status_code == 401
    assert client.post("/meetings", json={"title": "No Auth"}).status_code == 401
    assert client.get("/meetings/1").status_code == 401
    assert client.post("/meetings/1/analyze").status_code == 401
    assert client.get("/meetings/1/action-items").status_code == 401


def test_create_get_analyze_and_update_action_item(client: TestClient) -> None:
    register(client)
    meeting_id = create_meeting(client)

    meetings_response = client.get("/meetings")
    assert meetings_response.status_code == 200
    assert len(meetings_response.json()) == 1

    analysis_response = client.post(f"/meetings/{meeting_id}/analyze")
    assert analysis_response.status_code == 200
    assert "action_items" in analysis_response.json()

    action_items_response = client.get(f"/meetings/{meeting_id}/action-items")
    assert action_items_response.status_code == 200
    action_items = action_items_response.json()
    assert len(action_items) >= 1

    board_response = client.get("/action-items")
    assert board_response.status_code == 200
    board_items = board_response.json()
    assert len(board_items) >= 1
    assert board_items[0]["meeting_title"] == "MVP 스모크 테스트"

    action_item_id = action_items[0]["id"]
    update_response = client.patch(
        f"/action-items/{action_item_id}",
        json={"status": "done", "description": "검토 완료 상태로 업데이트한다."},
    )
    assert update_response.status_code == 200
    assert update_response.json()["status"] == "done"
    assert update_response.json()["description"] == "검토 완료 상태로 업데이트한다."

    meeting_update_response = client.patch(
        f"/meetings/{meeting_id}",
        json={"title": "수정된 회의명", "transcript": "수정된 원문"},
    )
    assert meeting_update_response.status_code == 200
    assert meeting_update_response.json()["title"] == "수정된 회의명"

    delete_response = client.delete(f"/meetings/{meeting_id}")
    assert delete_response.status_code == 204
    assert client.get(f"/meetings/{meeting_id}").status_code == 404


def test_users_cannot_access_each_others_data(client: TestClient) -> None:
    register(client, email="owner@example.com")
    owner_meeting_id = create_meeting(client, title="Owner Only")
    client.post("/auth/logout")

    register(client, email="intruder@example.com")
    assert client.get("/meetings").status_code == 200
    assert client.get("/meetings").json() == []
    assert client.get(f"/meetings/{owner_meeting_id}").status_code == 404
    assert client.post(f"/meetings/{owner_meeting_id}/analyze").status_code == 404
    assert client.get(f"/meetings/{owner_meeting_id}/action-items").status_code == 404


def test_users_in_same_team_share_meetings_and_action_board(client: TestClient) -> None:
    register(client, email="owner@example.com")
    owner_team = client.get("/teams/current").json()
    owner_meeting_id = create_meeting(client, title="Shared Team Meeting")
    client.post(f"/meetings/{owner_meeting_id}/analyze")
    client.post("/auth/logout")

    register(client, email="teammate@example.com")
    assert client.get("/meetings").json() == []

    join_response = client.post("/teams/join", json={"invite_code": owner_team["invite_code"]})
    assert join_response.status_code == 200
    assert join_response.json()["id"] == owner_team["id"]

    meetings_response = client.get("/meetings")
    assert meetings_response.status_code == 200
    assert meetings_response.json()[0]["title"] == "Shared Team Meeting"

    board_response = client.get("/action-items")
    assert board_response.status_code == 200
    assert len(board_response.json()) >= 1


def test_validation_errors(client: TestClient) -> None:
    assert client.post("/auth/register", json={"email": "bad-email", "password": "password123"}).status_code == 422
    assert client.post("/auth/register", json={"email": "short@example.com", "password": "short"}).status_code == 422

    register(client)
    assert client.post("/meetings", json={"title": "   "}).status_code == 422
    assert client.post("/meetings", json={"title": "Bad Date", "meeting_date": "not-a-date"}).status_code == 422


def test_ai_analysis_failure_without_fallback(monkeypatch: pytest.MonkeyPatch) -> None:
    class FailingAnalyzer:
        def analyze(self, meeting: Meeting, rag_context: RagAnalysisContext | None = None):
            raise AIProviderError("provider unavailable")

    monkeypatch.setattr(
        ai_service,
        "get_settings",
        lambda: SimpleNamespace(environment="production", ai_mock_fallback=False),
    )

    meeting = Meeting(id=1, user_id=1, title="Failure", transcript="회의 내용")
    with pytest.raises(ai_service.MeetingAnalysisUnavailableError):
        ai_service.analyze_and_persist_meeting(db=None, meeting=meeting, analyzer=FailingAnalyzer())  # type: ignore[arg-type]


def test_analyze_route_returns_503_when_ai_unavailable(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.api.routes import meetings as meetings_route

    register(client)
    meeting_id = create_meeting(client)

    def fail_analysis(*args, **kwargs):
        raise ai_service.MeetingAnalysisUnavailableError("provider unavailable")

    monkeypatch.setattr(meetings_route, "analyze_and_persist_meeting", fail_analysis)

    response = client.post(f"/meetings/{meeting_id}/analyze")
    assert response.status_code == 503
    assert "provider unavailable" in response.json()["detail"]


def test_rag_placeholder_returns_empty_context() -> None:
    service = get_rag_service()
    assert service.search_related_meetings(user_id=1, query="roadmap") == []
    assert service.search_previous_decisions(user_id=1, query="pricing") == []
    assert service.search_unresolved_action_items(user_id=1, query="launch") == []
    assert RagAnalysisContext().to_prompt_context() == "No previous RAG context is available."

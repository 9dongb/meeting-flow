from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.meeting import Meeting
from app.schemas.analysis import FollowUpEmailAnalysis, MeetingAnalysisResult, ParticipantAnalysis
from app.services.ai import service as ai_service
from app.services.ai.groq_analyzer import AIConfigurationError, AIProviderError
from app.services.rag.schemas import RagAnalysisContext
from app.services.rag.service import get_rag_service


def register(
    client: TestClient,
    email: str = "user@example.com",
    password: str = "password123",
    name: str = "테스트 사용자",
) -> None:
    response = client.post("/auth/register", json={"name": name, "email": email, "password": password})
    assert response.status_code == 201


def login(client: TestClient, email: str = "user@example.com", password: str = "password123") -> None:
    response = client.post("/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200


def create_meeting(
    client: TestClient,
    title: str = "MVP 스모크 테스트",
    participants: list[dict[str, str]] | None = None,
) -> int:
    response = client.post(
        "/meetings",
        json={
            "title": title,
            "project_name": "MeetingFlow AI",
            "meeting_date": "2026-05-24",
            "transcript": "액션 아이템과 승인 기반 Mock 연동을 확인한다.",
            "participants": [{"name": "민지"}] if participants is None else participants,
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
    assert me_response.json()["name"] == "테스트 사용자"
    assert me_response.json()["email"] == "user@example.com"

    update_response = client.patch("/auth/me", json={"name": "수정된 이름"})
    assert update_response.status_code == 200
    assert update_response.json()["name"] == "수정된 이름"

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
        "permission_granted": False,
        "email": None,
        "calendar_id": "primary",
        "synced_count": 0,
        "failed_count": 0,
        "skipped_count": 0,
        "last_error": None,
    }
    notion_status = client.get("/integrations/notion/status")
    assert notion_status.status_code == 200
    assert notion_status.json() == {"connected": False, "workspace_name": None, "owner_email": None}


def test_protected_routes_require_authentication(client: TestClient) -> None:
    assert client.get("/meetings").status_code == 401
    assert client.post("/meetings", json={"title": "No Auth"}).status_code == 401
    assert client.get("/meetings/1").status_code == 401
    assert client.post("/meetings/1/analyze").status_code == 401
    assert client.post("/meetings/1/follow-up-email-draft").status_code == 401
    assert client.post("/meetings/1/notion-draft").status_code == 401
    assert client.get("/meetings/1/action-items").status_code == 401
    assert client.get("/integrations/notion/status").status_code == 401


def test_create_get_analyze_and_update_action_item(client: TestClient) -> None:
    register(client)
    meeting_id = create_meeting(client)

    meetings_response = client.get("/meetings")
    assert meetings_response.status_code == 200
    assert len(meetings_response.json()) == 1

    analysis_response = client.post(f"/meetings/{meeting_id}/analyze")
    assert analysis_response.status_code == 200
    analysis = analysis_response.json()
    assert analysis["is_analyzable"] is True
    assert analysis["meeting_date"] == "2026-05-24"
    assert "action_items" in analysis

    analyzed_meeting_response = client.get(f"/meetings/{meeting_id}")
    assert analyzed_meeting_response.status_code == 200
    assert analyzed_meeting_response.json()["title"] == "MVP 스모크 테스트"
    assert analyzed_meeting_response.json()["meeting_date"] == "2026-05-24"
    assert analyzed_meeting_response.json()["follow_up_email_drafts"] == []

    draft_response = client.post(f"/meetings/{meeting_id}/follow-up-email-draft")
    assert draft_response.status_code == 200
    draft = draft_response.json()
    assert draft["subject"].startswith("[후속 공유]")
    assert "액션 아이템" in draft["body"]

    analysis_update_response = client.patch(
        f"/meetings/{meeting_id}/analysis",
        json={
            "title": "LLM 회의 제목 수정",
            "meeting_date": "2026-05-25",
            "summary": "수정된 분석 요약입니다.",
            "participants": [{"name": "민지", "email": "minji@example.com"}],
            "decisions": [{"content": "수정된 결정사항", "confidence": 0.95}],
            "action_items": [
                {
                    "assignee": "민지",
                    "description": "수정된 액션 아이템",
                    "due_date": "2026-05-31",
                    "priority": "high",
                    "status": "pending",
                    "confidence": 0.9,
                }
            ],
            "unresolved_issues": [{"content": "수정된 확인 사항", "owner": "민지", "next_step": "다음 회의 확인"}],
        },
    )
    assert analysis_update_response.status_code == 200
    updated_analysis = analysis_update_response.json()
    assert updated_analysis["title"] == "LLM 회의 제목 수정"
    assert updated_analysis["summary"] == "수정된 분석 요약입니다."
    assert updated_analysis["decisions"][0]["content"] == "수정된 결정사항"

    action_items_response = client.get(f"/meetings/{meeting_id}/action-items")
    assert action_items_response.status_code == 200
    action_items = action_items_response.json()
    assert len(action_items) >= 1

    board_response = client.get("/action-items")
    assert board_response.status_code == 200
    board_items = board_response.json()
    assert len(board_items) >= 1
    assert board_items[0]["meeting_title"] == "LLM 회의 제목 수정"

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


def test_notion_oauth_status_and_draft_creation(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    from app.api.routes import notion as notion_route
    from app.services.integrations.notion import NotionDraftService

    register(client)
    meeting_id = create_meeting(client)
    client.post(f"/meetings/{meeting_id}/analyze")

    unconnected_response = client.post(f"/meetings/{meeting_id}/notion-draft")
    assert unconnected_response.status_code == 409

    monkeypatch.setattr(
        notion_route,
        "exchange_code_for_notion_token",
        lambda code, redirect_uri: {
            "access_token": "notion-access-token",
            "refresh_token": "notion-refresh-token",
            "workspace_id": "workspace-1",
            "workspace_name": "Product Workspace",
            "bot_id": "bot-1",
            "owner": {"user": {"person": {"email": "owner@example.com"}}},
        },
    )
    client.cookies.set(notion_route.NOTION_STATE_COOKIE, "state-1")
    callback_response = client.get(
        "/integrations/notion/callback?code=code-1&state=state-1",
        follow_redirects=False,
    )
    assert callback_response.status_code == 302

    status_response = client.get("/integrations/notion/status")
    assert status_response.status_code == 200
    assert status_response.json() == {
        "connected": True,
        "workspace_name": "Product Workspace",
        "owner_email": "owner@example.com",
    }

    monkeypatch.setattr(
        NotionDraftService,
        "_create_page",
        lambda self, access_token, title, markdown: {
            "id": "page-1",
            "url": "https://www.notion.so/page-1",
        },
    )
    draft_response = client.post(f"/meetings/{meeting_id}/notion-draft")
    assert draft_response.status_code == 200
    draft = draft_response.json()
    assert draft["page_id"] == "page-1"
    assert draft["url"] == "https://www.notion.so/page-1"
    assert draft["log"]["status"] == "success"


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
    assert join_response.json()["member_count"] == 2
    assert {member["email"] for member in join_response.json()["members"]} == {"owner@example.com", "teammate@example.com"}

    meetings_response = client.get("/meetings")
    assert meetings_response.status_code == 200
    assert meetings_response.json()[0]["title"] == "Shared Team Meeting"

    board_response = client.get("/action-items")
    assert board_response.status_code == 200
    assert len(board_response.json()) >= 1


def test_analysis_enriches_participant_email_from_team_members(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class ParticipantOnlyAnalyzer:
        def analyze(self, meeting: Meeting, rag_context: RagAnalysisContext | None = None):
            return MeetingAnalysisResult(
                is_analyzable=True,
                meeting_title="팀 싱크",
                participants=[
                    ParticipantAnalysis(name="민지", confidence=0.9),
                    ParticipantAnalysis(name="준호", confidence=0.9),
                ],
                summary="팀 싱크에서 진행 상황을 공유했다.",
                follow_up_email=FollowUpEmailAnalysis(subject="팀 싱크 정리", body="공유드립니다.", recipients=[]),
            )

    monkeypatch.setattr(ai_service, "get_meeting_analyzer", lambda: ParticipantOnlyAnalyzer())

    register(client, email="minji@example.com", name="민지")
    owner_team = client.get("/teams/current").json()
    client.post("/auth/logout")

    register(client, email="junho@example.com", name="준호")
    join_response = client.post("/teams/join", json={"invite_code": owner_team["invite_code"]})
    assert join_response.status_code == 200

    meeting_id = create_meeting(client, title="팀 싱크", participants=[])
    analysis_response = client.post(f"/meetings/{meeting_id}/analyze")
    assert analysis_response.status_code == 200
    participants = analysis_response.json()["participants"]
    assert {participant["email"] for participant in participants} == {"minji@example.com", "junho@example.com"}

    meeting_response = client.get(f"/meetings/{meeting_id}")
    assert {participant["email"] for participant in meeting_response.json()["participants"]} == {
        "minji@example.com",
        "junho@example.com",
    }


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


def test_mock_fallback_only_for_missing_configuration() -> None:
    settings = SimpleNamespace(environment="local", ai_mock_fallback=True)

    assert ai_service.should_use_mock_fallback(settings, AIConfigurationError("GROQ_API_KEY is not configured."))
    assert not ai_service.should_use_mock_fallback(settings, AIProviderError("Groq API returned 401"))
    assert not ai_service.should_use_mock_fallback(
        SimpleNamespace(environment="production", ai_mock_fallback=True),
        AIConfigurationError("GROQ_API_KEY is not configured."),
    )


def test_analysis_result_uses_today_when_llm_returns_no_date() -> None:
    result = MeetingAnalysisResult(
        is_analyzable=True,
        meeting_title="주간 회의",
        meeting_date=None,
        participants=[],
        summary="제품 출시 일정을 논의했다.",
        follow_up_email=FollowUpEmailAnalysis(subject="후속 공유", body="회의 정리", recipients=[]),
    )

    normalized = ai_service.normalize_analysis_result(result)

    assert normalized.meeting_date is not None


def test_unanalyzable_result_does_not_keep_forced_items() -> None:
    result = MeetingAnalysisResult(
        is_analyzable=False,
        analysis_failure_reason="회의 맥락을 확인할 수 없습니다.",
        meeting_title=None,
        meeting_date=None,
        participants=[ParticipantAnalysis(name="민지", confidence=0.2)],
        summary="억지 요약",
        topics=["억지 주제"],
        follow_up_email=FollowUpEmailAnalysis(subject="후속 공유", body="회의 정리", recipients=[]),
    )

    normalized = ai_service.normalize_analysis_result(result)

    assert normalized.meeting_date is not None
    assert normalized.summary == ""
    assert normalized.participants == []
    assert normalized.topics == []
    assert normalized.decisions == []
    assert normalized.action_items == []


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

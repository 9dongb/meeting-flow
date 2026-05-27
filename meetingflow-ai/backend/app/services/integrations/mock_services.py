from sqlalchemy.orm import Session

from app.models.enums import IntegrationStatus, IntegrationType
from app.models.integration_action_log import IntegrationActionLog
from app.models.meeting import Meeting


def create_mock_log(
    db: Session,
    meeting: Meeting,
    integration_type: IntegrationType,
    payload: dict,
) -> IntegrationActionLog:
    log = IntegrationActionLog(
        meeting_id=meeting.id,
        integration_type=integration_type,
        status=IntegrationStatus.mock_success,
        payload_json=payload,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def render_markdown(meeting: Meeting) -> str:
    decisions = "\n".join(f"- {decision.content}" for decision in meeting.decisions) or "- 없음"
    actions = "\n".join(
        f"- [{item.status}] {item.description} / 담당: {item.assignee or '미정'} / 마감: {item.due_date or '미정'}"
        for item in meeting.action_items
    ) or "- 없음"
    issues = "\n".join(f"- {issue.content}" for issue in meeting.unresolved_issues) or "- 없음"

    return (
        f"# {meeting.title}\n\n"
        f"- 프로젝트: {meeting.project_name or '미정'}\n"
        f"- 회의일: {meeting.meeting_date or '미정'}\n\n"
        f"## 요약\n{meeting.summary or '아직 분석되지 않았습니다.'}\n\n"
        f"## 결정사항\n{decisions}\n\n"
        f"## 액션 아이템\n{actions}\n\n"
        f"## 후속 확인 사항\n{issues}\n"
    )

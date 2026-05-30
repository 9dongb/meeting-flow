from datetime import date, timedelta

from app.models.meeting import Meeting
from app.schemas.analysis import (
    ActionItemAnalysis,
    DecisionAnalysis,
    FollowUpEmailAnalysis,
    MeetingAnalysisResult,
    ParticipantAnalysis,
    UnresolvedIssueAnalysis,
)
from app.services.rag.schemas import RagAnalysisContext


class MockMeetingAnalyzer:
    def analyze(self, meeting: Meeting, rag_context: RagAnalysisContext | None = None) -> MeetingAnalysisResult:
        participant_names = [participant.name for participant in meeting.participants] or ["담당자"]
        lead = participant_names[0]
        due_date = date.today() + timedelta(days=7)

        return MeetingAnalysisResult(
            is_analyzable=True,
            analysis_failure_reason=None,
            meeting_title=meeting.title,
            meeting_date=meeting.meeting_date or date.today(),
            participants=[
                ParticipantAnalysis(
                    name=participant.name,
                    email=participant.email,
                    role=None,
                    source_text=participant.name,
                    confidence=0.8,
                )
                for participant in meeting.participants
            ],
            summary=(
                f"{meeting.title} 회의에서는 프로젝트 현황, 다음 실행 항목, "
                "외부 연동 전 검토 절차를 중심으로 논의했습니다."
            ),
            topics=[
                "회의 이후 후속 업무 자동화 흐름",
                "액션 아이템 담당자와 마감일 정리",
                "Notion, Calendar, Gmail 연동 전 사용자 승인 UX",
            ],
            decisions=[
                DecisionAnalysis(
                    content="외부 연동은 자동 실행하지 않고 사용자의 명시적 승인 이후 Mock 단계부터 검증한다.",
                    reason="초안 검토와 등록 전 확인이 필요한 업무 도구 특성 때문입니다.",
                    source_text=meeting.transcript[:180] or "회의 원문에서 후속 업무 승인 흐름을 확인했습니다.",
                    confidence=0.88,
                )
            ],
            action_items=[
                ActionItemAnalysis(
                    assignee=lead,
                    description="회의 결과 화면에서 액션 아이템을 검토하고 담당자/마감일을 보정한다.",
                    due_date=due_date,
                    priority="high",
                    confidence=0.91,
                    source_text=meeting.transcript[:180] or "액션 아이템 검토 UI가 필요합니다.",
                ),
                ActionItemAnalysis(
                    assignee=participant_names[-1],
                    description="후속 메일 초안을 확인하고 발송 전 승인 플로우를 점검한다.",
                    due_date=due_date + timedelta(days=2),
                    priority="medium",
                    confidence=0.82,
                    source_text="후속 메일은 초안 생성 중심으로 처리합니다.",
                ),
            ],
            unresolved_issues=[
                UnresolvedIssueAnalysis(
                    content="실제 STT, Groq, Pinecone 연동 범위와 우선순위를 확정해야 합니다.",
                    owner=lead,
                    next_step="다음 스프린트에서 provider 구현체와 통합 테스트 범위를 결정합니다.",
                    source_text="이번 단계에서는 실제 외부 API 연동보다 교체 가능한 구조가 중요합니다.",
                )
            ],
            follow_up_email=FollowUpEmailAnalysis(
                subject=f"[후속 공유] {meeting.title} 회의 정리 및 액션 아이템",
                body=(
                    "안녕하세요.\n\n"
                    f"{meeting.title} 회의 요약과 액션 아이템 초안을 공유드립니다.\n"
                    "각 담당자는 마감일과 우선순위를 검토한 뒤 필요한 수정 사항을 남겨주세요.\n\n"
                    "감사합니다."
                ),
                recipients=[],
            ),
        )

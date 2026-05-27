import sys
from datetime import date, timedelta
from pathlib import Path

from sqlalchemy import select

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.core.security import get_password_hash
from app.db.session import Base, SessionLocal, engine
from app.models.action_item import ActionItem
from app.models.decision import Decision
from app.models.follow_up_email_draft import FollowUpEmailDraft
from app.models.meeting import Meeting
from app.models.participant import Participant
from app.models.unresolved_issue import UnresolvedIssue
from app.models.user import User
from app.models.enums import ActionPriority, ActionStatus


DEMO_EMAIL = "demo@meetingflow.ai"
DEMO_PASSWORD = "password123"


def seed_demo_data() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == DEMO_EMAIL))
        if not user:
            user = User(email=DEMO_EMAIL, hashed_password=get_password_hash(DEMO_PASSWORD))
            db.add(user)
            db.flush()

        demo_titles = ["제품 주간 싱크", "엔터프라이즈 고객 온보딩", "런칭 체크리스트 리뷰"]
        existing = db.scalars(select(Meeting).where(Meeting.user_id == user.id, Meeting.title.in_(demo_titles))).all()
        for meeting in existing:
            db.delete(meeting)
        db.flush()

        today = date.today()
        meetings = [
            Meeting(
                user_id=user.id,
                title="제품 주간 싱크",
                meeting_date=today - timedelta(days=2),
                transcript=(
                    "이번 주에는 분석 결과 화면의 원문 접기 기능과 액션 아이템 칸반 보드를 우선 적용한다. "
                    "민지는 완료 버튼 UX를 정리하고, 준호는 API 응답에 회의 제목을 포함한다."
                ),
                summary="분석 결과 화면과 칸반 기반 후속 업무 관리 흐름을 정리했습니다.",
                participants=[Participant(name="민지"), Participant(name="준호"), Participant(name="Alex")],
                decisions=[
                    Decision(
                        content="대시보드는 회의 목록보다 액션 아이템 칸반을 중심으로 구성한다.",
                        reason="서비스의 핵심 가치가 회의 이후 실행 관리이기 때문입니다.",
                        source_text="액션 아이템 칸반 보드를 우선 적용한다.",
                        confidence=0.92,
                    )
                ],
                action_items=[
                    ActionItem(
                        assignee="민지",
                        description="액션 아이템 카드에서 완료 버튼과 다시 열기 흐름을 점검한다.",
                        due_date=today + timedelta(days=1),
                        priority=ActionPriority.high,
                        status=ActionStatus.in_progress,
                        confidence=0.91,
                        source_text="민지는 완료 버튼 UX를 정리한다.",
                    ),
                    ActionItem(
                        assignee="준호",
                        description="사용자 전체 액션 아이템 API 응답에 회의 제목과 회의일을 포함한다.",
                        due_date=today + timedelta(days=2),
                        priority=ActionPriority.medium,
                        status=ActionStatus.done,
                        confidence=0.88,
                        source_text="준호는 API 응답에 회의 제목을 포함한다.",
                    ),
                ],
                unresolved_issues=[
                    UnresolvedIssue(
                        content="드래그앤드롭을 이번 MVP에 넣을지 다음 단계로 미룰지 결정 필요",
                        owner="Alex",
                        next_step="칸반 사용성 확인 후 결정",
                        source_text="칸반 보드를 우선 적용한다.",
                    )
                ],
                follow_up_email_drafts=[
                    FollowUpEmailDraft(
                        subject="[후속 공유] 제품 주간 싱크",
                        body="칸반 대시보드 중심으로 후속 업무 관리 흐름을 정리했습니다.",
                        recipients=[],
                    )
                ],
            ),
            Meeting(
                user_id=user.id,
                title="엔터프라이즈 고객 온보딩",
                meeting_date=today - timedelta(days=1),
                transcript=(
                    "고객사 보안 검토 자료는 금요일까지 초안을 만든다. "
                    "Calendar 등록은 Mock 단계로 유지하고, 실제 초대 발송은 승인 모달 이후로 제한한다."
                ),
                summary="고객 온보딩을 위한 보안 자료와 승인 기반 외부 연동 범위를 논의했습니다.",
                participants=[Participant(name="수연"), Participant(name="민지")],
                decisions=[
                    Decision(
                        content="외부 캘린더 등록은 사용자 승인 전까지 Mock으로 유지한다.",
                        reason="자동 등록으로 인한 업무 혼선을 막기 위해서입니다.",
                        source_text="Calendar 등록은 Mock 단계로 유지한다.",
                        confidence=0.89,
                    )
                ],
                action_items=[
                    ActionItem(
                        assignee="수연",
                        description="고객사 보안 검토 자료 초안을 작성한다.",
                        due_date=today + timedelta(days=3),
                        priority=ActionPriority.high,
                        status=ActionStatus.pending,
                        confidence=0.93,
                        source_text="보안 검토 자료는 금요일까지 초안을 만든다.",
                    ),
                    ActionItem(
                        assignee="민지",
                        description="승인 모달에서 Calendar Mock 실행 전 확인 문구를 다듬는다.",
                        due_date=today + timedelta(days=4),
                        priority=ActionPriority.medium,
                        status=ActionStatus.pending,
                        confidence=0.84,
                        source_text="실제 초대 발송은 승인 모달 이후로 제한한다.",
                    ),
                ],
                follow_up_email_drafts=[
                    FollowUpEmailDraft(
                        subject="[후속 공유] 엔터프라이즈 고객 온보딩",
                        body="보안 자료 초안과 Calendar 승인 UX를 다음 작업으로 진행합니다.",
                        recipients=[],
                    )
                ],
            ),
            Meeting(
                user_id=user.id,
                title="런칭 체크리스트 리뷰",
                meeting_date=today,
                transcript=(
                    "런칭 전 README의 실행 방법을 다시 확인한다. "
                    "Alex는 데모 데이터 seed 스크립트를 만들고, 준호는 실패 상태 UI를 점검한다."
                ),
                summary="런칭 시연을 위한 문서, 데모 데이터, 실패 상태 UI를 점검했습니다.",
                participants=[Participant(name="Alex"), Participant(name="준호")],
                decisions=[
                    Decision(
                        content="시연용 데이터는 별도 seed 스크립트로 관리한다.",
                        reason="로컬 DB를 초기화해도 같은 칸반 예시를 재현하기 위해서입니다.",
                        source_text="데모 데이터 seed 스크립트를 만든다.",
                        confidence=0.9,
                    )
                ],
                action_items=[
                    ActionItem(
                        assignee="Alex",
                        description="시연용 회의록과 액션 아이템 seed 스크립트를 추가한다.",
                        due_date=today,
                        priority=ActionPriority.high,
                        status=ActionStatus.done,
                        confidence=0.95,
                        source_text="Alex는 데모 데이터 seed 스크립트를 만든다.",
                    ),
                    ActionItem(
                        assignee="준호",
                        description="대시보드 로딩과 실패 상태 디자인을 점검한다.",
                        due_date=today + timedelta(days=1),
                        priority=ActionPriority.high,
                        status=ActionStatus.in_progress,
                        confidence=0.87,
                        source_text="준호는 실패 상태 UI를 점검한다.",
                    ),
                ],
                follow_up_email_drafts=[
                    FollowUpEmailDraft(
                        subject="[후속 공유] 런칭 체크리스트 리뷰",
                        body="시연용 seed 데이터와 대시보드 상태 UI를 확인합니다.",
                        recipients=[],
                    )
                ],
            ),
        ]

        db.add_all(meetings)
        db.commit()
        print(f"Seeded demo data for {DEMO_EMAIL} / {DEMO_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_data()

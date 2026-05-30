from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.action_item import ActionItem
from app.models.decision import Decision
from app.models.follow_up_email_draft import FollowUpEmailDraft
from app.models.meeting import Meeting
from app.models.participant import Participant
from app.models.team_membership import TeamMembership
from app.models.unresolved_issue import UnresolvedIssue
from app.models.user import User
from app.schemas.analysis import MeetingAnalysisResult
from app.services.ai.base import MeetingAnalyzer
from app.services.ai.groq_analyzer import AIProviderError, GroqMeetingAnalyzer
from app.services.ai.mock_analyzer import MockMeetingAnalyzer
from app.services.ai.openai_analyzer import OpenAIMeetingAnalyzer
from app.services.rag.service import get_rag_service


class MeetingAnalysisUnavailableError(Exception):
    pass


def get_meeting_analyzer() -> MeetingAnalyzer:
    settings = get_settings()
    provider = settings.ai_provider.lower()
    if provider == "mock":
        return MockMeetingAnalyzer()
    if provider == "openai":
        return OpenAIMeetingAnalyzer(
            api_key=settings.openai_api_key,
            model=settings.openai_model,
            base_url=settings.openai_base_url,
            timeout_seconds=settings.openai_timeout_seconds,
            max_transcript_chars=settings.ai_max_transcript_chars,
        )
    return GroqMeetingAnalyzer(
        api_key=settings.groq_api_key,
        model=settings.groq_model,
        base_url=settings.groq_base_url,
        timeout_seconds=settings.groq_timeout_seconds,
        max_transcript_chars=settings.ai_max_transcript_chars,
    )


def analyze_and_persist_meeting(
    db: Session,
    meeting: Meeting,
    analyzer: MeetingAnalyzer | None = None,
) -> MeetingAnalysisResult:
    analyzer = analyzer or get_meeting_analyzer()
    rag_service = get_rag_service()
    rag_context = rag_service.build_analysis_context(meeting)
    try:
        result = analyzer.analyze(meeting, rag_context=rag_context)
    except AIProviderError as exc:
        settings = get_settings()
        if settings.environment.lower() in {"local", "development", "dev"} and settings.ai_mock_fallback:
            result = MockMeetingAnalyzer().analyze(meeting, rag_context=rag_context)
        else:
            raise MeetingAnalysisUnavailableError(str(exc)) from exc

    result = normalize_analysis_result(result)
    enrich_participant_emails(db, meeting, result)

    if not meeting.meeting_date:
        meeting.meeting_date = result.meeting_date
    sync_meeting_participants_from_analysis(meeting, result)

    meeting.summary = result.summary if result.is_analyzable else None
    meeting.decisions.clear()
    meeting.action_items.clear()
    meeting.unresolved_issues.clear()
    meeting.follow_up_email_drafts.clear()

    if not result.is_analyzable:
        db.add(meeting)
        db.commit()
        db.refresh(meeting)
        return result

    meeting.decisions.extend(
        Decision(
            content=decision.content,
            reason=decision.reason,
            source_text=decision.source_text,
            confidence=decision.confidence,
        )
        for decision in result.decisions
    )
    meeting.action_items.extend(
        ActionItem(
            assignee=item.assignee,
            description=item.description,
            due_date=item.due_date,
            priority=item.priority,
            confidence=item.confidence,
            source_text=item.source_text,
        )
        for item in result.action_items
    )
    meeting.unresolved_issues.extend(
        UnresolvedIssue(
            content=issue.content,
            owner=issue.owner,
            next_step=issue.next_step,
            source_text=issue.source_text,
        )
        for issue in result.unresolved_issues
    )
    meeting.follow_up_email_drafts.append(
        FollowUpEmailDraft(
            subject=result.follow_up_email.subject,
            body=result.follow_up_email.body,
            recipients=result.follow_up_email.recipients,
        )
    )

    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    rag_service.index_meeting_transcript(meeting)
    rag_service.index_meeting_summary(meeting)
    rag_service.index_decisions(meeting, meeting.decisions)
    rag_service.index_action_items(meeting, meeting.action_items)
    return result


def normalize_analysis_result(result: MeetingAnalysisResult) -> MeetingAnalysisResult:
    if result.meeting_date is None:
        result.meeting_date = date.today()
    if not result.is_analyzable:
        result.summary = ""
        result.topics = []
        result.decisions = []
        result.action_items = []
        result.unresolved_issues = []
        result.participants = []
    return result


def enrich_participant_emails(db: Session, meeting: Meeting, result: MeetingAnalysisResult) -> MeetingAnalysisResult:
    if not meeting.team_id or not result.participants:
        return result

    members = db.execute(
        select(User)
        .join(TeamMembership, TeamMembership.user_id == User.id)
        .where(TeamMembership.team_id == meeting.team_id)
    ).scalars().all()
    email_by_name = unique_team_member_email_by_name(list(members))
    for participant in result.participants:
        if participant.email:
            continue
        participant.email = email_by_name.get(normalize_person_name(participant.name))
    return result


def unique_team_member_email_by_name(members: list[User]) -> dict[str, str]:
    candidates: dict[str, set[str]] = {}
    for member in members:
        names = {member.name, member.email.split("@", maxsplit=1)[0]}
        for name in names:
            normalized = normalize_person_name(name)
            if not normalized:
                continue
            candidates.setdefault(normalized, set()).add(member.email)
    return {name: next(iter(emails)) for name, emails in candidates.items() if len(emails) == 1}


def normalize_person_name(value: str) -> str:
    return "".join(value.casefold().split())


def sync_meeting_participants_from_analysis(meeting: Meeting, result: MeetingAnalysisResult) -> None:
    if not result.participants:
        return
    existing_by_name = {normalize_person_name(participant.name): participant for participant in meeting.participants}
    for participant in result.participants:
        normalized = normalize_person_name(participant.name)
        if not normalized:
            continue
        existing = existing_by_name.get(normalized)
        if existing:
            if not existing.email and participant.email:
                existing.email = participant.email
            continue
        meeting.participants.append(Participant(name=participant.name, email=participant.email))
        existing_by_name[normalized] = meeting.participants[-1]

from datetime import date

from app.models.meeting import Meeting
from app.services.rag.schemas import RagAnalysisContext


def meeting_analysis_system_prompt() -> str:
    return """
당신은 회의록을 후속 실행 데이터로 변환하는 신중한 비서인 MeetingFlow AI입니다.
출력은 JSON만 반환하세요. 마크다운, 주석, 설명 텍스트를 포함하지 마세요.
확실하지 않은 내용은 추측하지 마세요.
원문에서 추출할 수 없는 값은 null 또는 빈 배열로 반환하세요.
회의 날짜가 문서에 명시되어 있거나 문맥상 명확하게 추론될 때만 meeting_date에 ISO 날짜(YYYY-MM-DD)를 반환하세요. 날짜 근거가 없으면 null을 반환하세요.
참석자는 원문에 이름, 화자, 이메일, 역할 등 명확한 단서가 있을 때만 participants에 포함하세요. 참석자를 알 수 없으면 빈 배열을 반환하세요.
회의록으로 보기 어렵거나 입력/맥락이 부족해 요약을 포함한 핵심 항목 추출을 신뢰할 수 없으면 is_analyzable을 false로 반환하세요.
is_analyzable이 false인 경우 analysis_failure_reason을 작성하고 summary는 빈 문자열, decisions/action_items/topics/participants/unresolved_issues는 빈 배열로 반환하세요.
단순히 결정사항이나 액션 아이템이 없다는 이유만으로 is_analyzable을 false로 만들지 마세요.
담당자(assignee)나 마감일(due_date)이 명확하지 않은 경우 null을 사용하세요.
액션 아이템은 실제 후속 행동이 필요한 항목만 추출하세요.
단순 논의 내용과 할 일을 구분하세요.
결정사항과 액션 아이템을 구분하세요.
source_text에는 원문 근거를 짧게 포함하세요.
confidence는 0부터 1 사이 숫자로 반환하세요.
마감일에는 ISO 날짜 형식(YYYY-MM-DD)을 사용하거나 null을 사용하세요.
JSON은 정확히 다음 형태를 따라야 합니다:
{
  "is_analyzable": boolean,
  "analysis_failure_reason": string | null,
  "meeting_title": string | null,
  "meeting_date": string | null,
  "participants": [
    {
      "name": string,
      "email": string | null,
      "role": string | null,
      "source_text": string | null,
      "confidence": number
    }
  ],
  "summary": string,
  "topics": string[],
  "decisions": [
    {
      "content": string,
      "reason": string | null,
      "source_text": string | null,
      "confidence": number
    }
  ],
  "action_items": [
    {
      "assignee": string | null,
      "description": string,
      "due_date": string | null,
      "priority": "low" | "medium" | "high",
      "confidence": number,
      "source_text": string | null
    }
  ],
  "unresolved_issues": [
    {
      "content": string,
      "owner": string | null,
      "next_step": string | null,
      "source_text": string | null
    }
  ],
  "follow_up_email": {
    "subject": string,
    "body": string,
    "recipients": string[]
  }
}
""".strip()


def meeting_analysis_user_prompt(
    meeting: Meeting,
    transcript: str,
    rag_context: RagAnalysisContext | None = None,
) -> str:
    participants = [
        f"{participant.name} <{participant.email}>"
        if participant.email
        else participant.name
        for participant in meeting.participants
    ]
    meeting_date = meeting.meeting_date.isoformat() if isinstance(meeting.meeting_date, date) else None
    rag_prompt = rag_context.to_prompt_context() if rag_context else "No previous RAG context is available."
    return f"""
이 회의록을 분석하세요.

사용자가 입력한 회의 제목: {meeting.title}
사용자가 입력한 회의 날짜: {meeting_date or "null"}
사용자가 입력한 참석자: {participants}

중요 규칙:
- meeting_title, meeting_date, participants는 회의록 원문과 문맥에서 추출 가능한 값만 반환하세요.
- 사용자가 입력한 값만 있고 회의록 원문에 근거가 없다면 해당 분석 필드는 null 또는 빈 배열로 반환하세요.
- meeting_date가 회의록 원문에 없으면 null을 반환하세요. 오늘 날짜를 직접 만들지 마세요.

이전 회의록 정보:
{rag_prompt}

회의록:
{transcript}
""".strip()

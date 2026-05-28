import json
import re
from datetime import date

import httpx
from pydantic import ValidationError

from app.models.meeting import Meeting
from app.schemas.analysis import MeetingAnalysisResult
from app.services.rag.schemas import RagAnalysisContext


class AIProviderError(Exception):
    pass


class AIConfigurationError(AIProviderError):
    pass


class AIResponseParseError(AIProviderError):
    pass


class GroqMeetingAnalyzer:
    def __init__(
        self,
        api_key: str | None,
        model: str,
        base_url: str = "https://api.groq.com/openai/v1",
        timeout_seconds: float = 45.0,
        max_transcript_chars: int = 20000,
    ) -> None:
        self.api_key = api_key
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds
        self.max_transcript_chars = max_transcript_chars

    def analyze(self, meeting: Meeting, rag_context: RagAnalysisContext | None = None) -> MeetingAnalysisResult:
        if not self.api_key:
            raise AIConfigurationError("GROQ_API_KEY is not configured.")

        transcript = self._prepare_transcript(meeting.transcript)
        payload = {
            "model": self.model,
            "temperature": 0.1,
            "max_completion_tokens": 4096,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": self._system_prompt()},
                {"role": "user", "content": self._user_prompt(meeting, transcript, rag_context)},
            ],
        }

        try:
            response = httpx.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=self.timeout_seconds,
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text[:500]
            raise AIProviderError(f"Groq API returned {exc.response.status_code}: {detail}") from exc
        except httpx.HTTPError as exc:
            raise AIProviderError(f"Groq API request failed: {exc}") from exc

        try:
            content = response.json()["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
            raise AIResponseParseError("Groq response did not include a valid message content.") from exc

        return self._parse_content(content)

    def _prepare_transcript(self, transcript: str) -> str:
        transcript = transcript.strip()
        if len(transcript) <= self.max_transcript_chars:
            return transcript
        omitted = len(transcript) - self.max_transcript_chars
        return (
            transcript[: self.max_transcript_chars]
            + f"\n\n[TRUNCATED: {omitted} characters omitted because transcript exceeded the MVP limit.]"
        )

    def _parse_content(self, content: str) -> MeetingAnalysisResult:
        raw = self._extract_json(content)
        try:
            return MeetingAnalysisResult.model_validate_json(raw)
        except ValidationError as exc:
            raise AIResponseParseError(f"Groq JSON did not match the required analysis schema: {exc}") from exc

    def _extract_json(self, content: str) -> str:
        content = content.strip()
        if content.startswith("```"):
            fenced = re.search(r"```(?:json)?\s*(\{.*\})\s*```", content, flags=re.DOTALL)
            if fenced:
                return fenced.group(1)
        return content

    def _system_prompt(self) -> str:
        return """
당신은 회의록을 후속 실행 데이터로 변환하는 신중한 비서인 MeetingFlow AI입니다.
JSON만 반환하세요. 마크다운, 주석, 설명 텍스트를 포함하지 마세요.
불확실한 정보는 추측하지 마세요.
담당자(assignee)나 마감일(due_date)이 명시되지 않은 경우 null을 사용하세요.
실제 후속 조치가 필요한 실행 항목(action items)만 추출하세요.
논의 주제(topics)와 결정 사항(decisions), 실행 항목을 분리하세요.
결정 사항과 실행 항목을 분리하세요.
출처 텍스트(source_text)에는 해당 항목을 뒷받침하는 회의록의 짧은 인용구나 짧은 의역을 포함하세요.
모든 신뢰도(confidence) 값은 0과 1 사이의 숫자여야 합니다.
마감일에는 ISO 날짜 형식(YYYY-MM-DD)을 사용하거나 null을 사용하세요.
JSON은 정확히 다음 형태를 따라야 합니다:
{
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

    def _user_prompt(
        self,
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

회의 제목: {meeting.title}
회의 날짜: {meeting_date or "null"}
참석자: {participants}

이전 회의록 정보:
{rag_prompt}

회의록:
{transcript}
""".strip()

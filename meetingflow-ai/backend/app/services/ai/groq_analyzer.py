import json
import re

import httpx
from pydantic import ValidationError

from app.models.meeting import Meeting
from app.schemas.analysis import MeetingAnalysisResult
from app.services.ai.prompts import meeting_analysis_system_prompt, meeting_analysis_user_prompt
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
        return meeting_analysis_system_prompt()

    def _user_prompt(
        self,
        meeting: Meeting,
        transcript: str,
        rag_context: RagAnalysisContext | None = None,
    ) -> str:
        return meeting_analysis_user_prompt(meeting, transcript, rag_context)

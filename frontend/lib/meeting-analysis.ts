import { todayIsoDate } from "@/lib/utils";
import type { Meeting, MeetingAnalysisResult, MeetingAnalysisUpdatePayload } from "@/types";

export function analysisFromMeeting(meeting: Meeting): MeetingAnalysisResult {
  return {
    is_analyzable: Boolean(meeting.summary),
    analysis_failure_reason: meeting.summary ? null : "아직 분석 결과가 저장되지 않았습니다.",
    meeting_title: meeting.title,
    meeting_date: meeting.meeting_date,
    participants: meeting.participants.map((participant) => ({
      name: participant.name,
      email: participant.email,
      role: null,
      source_text: participant.source_text ?? null,
      confidence: 1
    })),
    summary: meeting.summary || "아직 저장된 요약이 없습니다.",
    topics: [],
    decisions:
      meeting.decisions?.map((decision) => ({
        content: decision.content,
        reason: decision.reason,
        source_text: decision.source_text,
        confidence: decision.confidence
      })) ?? [],
    action_items:
      meeting.action_items?.map((item) => ({
        assignee: item.assignee,
        description: item.description,
        due_date: item.due_date,
        priority: item.priority,
        confidence: item.confidence,
        source_text: item.source_text
      })) ?? [],
    unresolved_issues:
      meeting.unresolved_issues?.map((issue) => ({
        content: issue.content,
        owner: issue.owner,
        next_step: issue.next_step,
        source_text: issue.source_text
      })) ?? []
  };
}

export function analysisToEditPayload(result: MeetingAnalysisResult, meeting: Meeting): MeetingAnalysisUpdatePayload {
  const statusByDescription = new Map((meeting.action_items ?? []).map((item) => [item.description, item.status]));
  return {
    title: result.meeting_title || meeting.title,
    meeting_date: result.meeting_date ?? todayIsoDate(),
    summary: result.summary,
    participants: result.participants.map((participant) => ({
      name: participant.name,
      email: participant.email ?? null,
      source_text: participant.source_text ?? null
    })),
    decisions: result.decisions.map((decision) => ({
      content: decision.content,
      reason: decision.reason ?? null,
      source_text: decision.source_text ?? null,
      confidence: decision.confidence
    })),
    action_items: result.action_items.map((item) => ({
      assignee: item.assignee ?? null,
      description: item.description,
      due_date: item.due_date ?? null,
      priority: item.priority,
      status: statusByDescription.get(item.description) ?? "pending",
      confidence: item.confidence,
      source_text: item.source_text ?? null
    })),
    unresolved_issues: result.unresolved_issues.map((issue) => ({
      content: issue.content,
      owner: issue.owner ?? null,
      next_step: issue.next_step ?? null,
      source_text: issue.source_text ?? null
    }))
  };
}

export function buildMailtoHref(draft: { subject: string; body: string; recipients?: string[] | null }) {
  const recipients = (draft.recipients ?? [])
    .map(normalizeRecipientEmail)
    .filter((recipient): recipient is string => Boolean(recipient))
    .map(encodeURIComponent)
    .join(",");
  const params = [`subject=${encodeURIComponent(draft.subject)}`, `body=${encodeURIComponent(draft.body)}`].join("&");

  return `mailto:${recipients}?${params}`;
}

function normalizeRecipientEmail(recipient: string): string | null {
  const trimmed = recipient.trim();
  const bracketMatch = trimmed.match(/<([^<>\s@]+@[^<>\s@]+)>$/);
  const email = bracketMatch?.[1] ?? trimmed;
  const parts = email.split("@");

  if (parts.length !== 2 || !parts[0] || !parts[1] || /\s/.test(email)) {
    return null;
  }
  return email;
}

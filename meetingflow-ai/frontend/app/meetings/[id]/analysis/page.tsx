"use client";

import { Eye } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { AnalysisResult } from "@/components/meetings/analysis-result";
import { ParticipantsPopover, TranscriptModal } from "@/components/meetings/meeting-detail-overlays";
import { Button } from "@/components/ui/button";
import { EmptyState, Feedback, LoadingState } from "@/components/ui/feedback";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Meeting, MeetingAnalysisResult } from "@/types";

export default function MeetingAnalysisPage() {
  const params = useParams<{ id: string }>();
  const meetingId = Number(params.id);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [storedAnalysis, setStoredAnalysis] = useState<MeetingAnalysisResult | null>(null);
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!meetingId) return;

    const cached = window.sessionStorage.getItem(`meetingflow_analysis_${meetingId}`);
    if (cached) {
      try {
        setStoredAnalysis(JSON.parse(cached) as MeetingAnalysisResult);
      } catch {
        window.sessionStorage.removeItem(`meetingflow_analysis_${meetingId}`);
      }
    }

    api
      .getMeeting(meetingId)
      .then(setMeeting)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [meetingId]);

  const result = useMemo(() => {
    if (storedAnalysis) return storedAnalysis;
    if (!meeting) return null;
    return analysisFromMeeting(meeting);
  }, [meeting, storedAnalysis]);

  return (
    <AppShell>
      {loading ? (
        <LoadingState>분석 결과를 불러오는 중입니다.</LoadingState>
      ) : error ? (
        <Feedback variant="error">{error}</Feedback>
      ) : !meeting || !result ? (
        <EmptyState title="분석 결과를 찾을 수 없습니다." description="회의가 삭제되었거나 접근 권한이 없습니다." />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Analysis Result</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-normal">{meeting.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-slate-500">
                <span>{formatDate(meeting.meeting_date)}</span>
                <span aria-hidden="true">·</span>
                <ParticipantsPopover participants={meeting.participants} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setShowTranscriptModal(true)}>
                <Eye className="h-4 w-4" />
                원문 보기
              </Button>
            </div>
          </div>

          <AnalysisResult result={result} />

          {showTranscriptModal ? (
            <TranscriptModal transcript={meeting.transcript} onClose={() => setShowTranscriptModal(false)} />
          ) : null}
        </div>
      )}
    </AppShell>
  );
}

function analysisFromMeeting(meeting: Meeting): MeetingAnalysisResult {
  const latestDraft = meeting.follow_up_email_drafts?.at(-1);

  return {
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
      })) ?? [],
    follow_up_email: {
      subject: latestDraft?.subject ?? "[후속 공유] 회의 정리",
      body: latestDraft?.body ?? "저장된 후속 메일 초안이 없습니다.",
      recipients: latestDraft?.recipients ?? []
    }
  };
}

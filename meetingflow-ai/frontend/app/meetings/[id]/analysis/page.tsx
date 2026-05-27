"use client";

import { Eye, ListChecks } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { AnalysisResult } from "@/components/meetings/analysis-result";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, Feedback, LoadingState } from "@/components/ui/feedback";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Meeting, MeetingAnalysisResult } from "@/types";

export default function MeetingAnalysisPage() {
  const params = useParams<{ id: string }>();
  const meetingId = Number(params.id);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [storedAnalysis, setStoredAnalysis] = useState<MeetingAnalysisResult | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
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
              <p className="mt-3 text-sm text-slate-500">
                {formatDate(meeting.meeting_date)} · 참석자 {meeting.participants.length}명
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setShowTranscript((current) => !current)}>
                <Eye className="h-4 w-4" />
                원문 {showTranscript ? "닫기" : "보기"}
              </Button>
              <Link href={`/meetings/${meeting.id}/actions`}>
                <Button>
                  <ListChecks className="h-4 w-4" />
                  액션 아이템 검토
                </Button>
              </Link>
            </div>
          </div>

          {showTranscript ? (
            <Card>
              <CardHeader>
                <CardTitle>회의 원문</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap leading-7 text-slate-700">{meeting.transcript || "원문이 없습니다."}</p>
              </CardContent>
            </Card>
          ) : null}

          <AnalysisResult result={result} />
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

"use client";

import { FileText } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { IntegrationActions } from "@/components/meetings/integration-actions";
import { PriorityBadge, StatusBadge } from "@/components/meetings/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, Feedback, LoadingState } from "@/components/ui/feedback";
import { api } from "@/lib/api";
import { confidenceLabel, formatDate } from "@/lib/utils";
import type { Meeting } from "@/types";

export default function MeetingDetailPage() {
  const params = useParams<{ id: string }>();
  const meetingId = Number(params.id);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!meetingId) return;
    api
      .getMeeting(meetingId)
      .then(setMeeting)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [meetingId]);

  return (
    <AppShell>
      {error ? <Feedback variant="error" className="mb-5">{error}</Feedback> : null}
      {loading ? (
        <LoadingState>회의 정보를 불러오는 중입니다.</LoadingState>
      ) : !meeting ? (
        <EmptyState title="회의를 찾을 수 없습니다." description="삭제되었거나 접근 권한이 없는 회의입니다." />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">{meeting.project_name || "프로젝트 미지정"}</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-normal">{meeting.title}</h1>
              <p className="mt-3 text-sm text-slate-500">
                {formatDate(meeting.meeting_date)} · 참석자 {meeting.participants.length}명
              </p>
            </div>
            <Link href={`/meetings/${meeting.id}/actions`}>
              <Button variant="secondary">액션 아이템 검토</Button>
            </Link>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                회의 원문
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap leading-7 text-slate-700">{meeting.transcript || "원문이 없습니다."}</p>
            </CardContent>
          </Card>

          <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>요약 결과</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-7 text-slate-700">{meeting.summary || "아직 분석되지 않았습니다."}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>결정사항</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(meeting.decisions ?? []).length === 0 ? (
                  <p className="text-sm text-slate-500">아직 결정사항이 없습니다.</p>
                ) : (
                  (meeting.decisions ?? []).map((decision) => (
                    <div key={decision.id} className="rounded-md border border-border p-3">
                      <p className="text-sm font-medium">{decision.content}</p>
                      <p className="mt-2 text-xs text-slate-500">신뢰도 {confidenceLabel(decision.confidence)}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>액션 아이템</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(meeting.action_items ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">아직 액션 아이템이 없습니다.</p>
              ) : (
                (meeting.action_items ?? []).map((item) => (
                  <div key={item.id} className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-[1fr_auto_auto]">
                    <div>
                      <p className="text-sm font-medium">{item.description}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {item.assignee || "담당자 미정"} · {formatDate(item.due_date)}
                      </p>
                    </div>
                    <PriorityBadge priority={item.priority} />
                    <StatusBadge status={item.status} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <IntegrationActions meetingId={meeting.id} />
        </div>
      )}
    </AppShell>
  );
}

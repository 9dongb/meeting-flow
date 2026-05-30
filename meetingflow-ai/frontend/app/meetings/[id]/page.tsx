"use client";

import { Eye } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { IntegrationActions } from "@/components/meetings/integration-actions";
import { ParticipantsPopover, TranscriptModal } from "@/components/meetings/meeting-detail-overlays";
import { MeetingActionsMenu } from "@/components/meetings/meeting-actions-menu";
import { MeetingEditForm } from "@/components/meetings/meeting-edit-form";
import { PriorityBadge, StatusBadge } from "@/components/meetings/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, Feedback, LoadingState } from "@/components/ui/feedback";
import { api } from "@/lib/api";
import { confidenceLabel, formatDate } from "@/lib/utils";
import type { Meeting, MeetingUpdatePayload } from "@/types";

export default function MeetingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const meetingId = Number(params.id);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);

  useEffect(() => {
    if (!meetingId) return;
    api
      .getMeeting(meetingId)
      .then(setMeeting)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [meetingId]);

  async function updateMeeting(payload: MeetingUpdatePayload) {
    if (!meeting) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await api.updateMeeting(meeting.id, payload);
      setMeeting(updated);
      setEditing(false);
      setMessage("회의 정보를 수정했습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "회의 수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteMeeting() {
    if (!meeting || !window.confirm("이 회의와 연결된 액션 아이템을 모두 삭제할까요?")) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api.deleteMeeting(meeting.id);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "회의 삭제에 실패했습니다.");
      setSaving(false);
    }
  }

  return (
    <AppShell>
      {error ? <Feedback variant="error" className="mb-5">{error}</Feedback> : null}
      {message ? <Feedback variant="success" className="mb-5">{message}</Feedback> : null}
      {loading ? (
        <LoadingState>회의 정보를 불러오는 중입니다.</LoadingState>
      ) : !meeting ? (
        <EmptyState title="회의를 찾을 수 없습니다." description="삭제되었거나 접근 권한이 없는 회의입니다." />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-4 rounded-md border border-border bg-white px-5 py-5 shadow-sm md:flex-row md:items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">{meeting.project_name || "프로젝트 미지정"}</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-normal">{meeting.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-slate-500">
                <span>{formatDate(meeting.meeting_date)}</span>
                <span aria-hidden="true">·</span>
                <ParticipantsPopover participants={meeting.participants} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setShowTranscriptModal(true)}>
                <Eye className="h-4 w-4" />
                원문 보기
              </Button>
              <MeetingActionsMenu onEdit={() => setEditing(true)} onDelete={() => void deleteMeeting()} disabled={saving} />
            </div>
          </div>

          {editing ? (
            <Card>
              <CardHeader>
                <CardTitle>회의 정보 수정</CardTitle>
              </CardHeader>
              <CardContent>
                <MeetingEditForm
                  meeting={meeting}
                  saving={saving}
                  onCancel={() => setEditing(false)}
                  onSubmit={updateMeeting}
                />
              </CardContent>
            </Card>
          ) : null}

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
                    <div key={decision.id} className="rounded-md border border-border bg-white p-3 shadow-sm">
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
                  <div key={item.id} className="grid gap-3 rounded-md border border-border bg-white p-3 shadow-sm md:grid-cols-[1fr_auto_auto]">
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

          {showTranscriptModal ? (
            <TranscriptModal transcript={meeting.transcript} onClose={() => setShowTranscriptModal(false)} />
          ) : null}
        </div>
      )}
    </AppShell>
  );
}

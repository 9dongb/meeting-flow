"use client";

import { Eye, MoreHorizontal, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { AnalysisResult } from "@/components/meetings/analysis-result";
import { ParticipantsPopover, TranscriptModal } from "@/components/meetings/meeting-detail-overlays";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, Feedback, LoadingState } from "@/components/ui/feedback";
import { Input, Textarea } from "@/components/ui/input";
import { api } from "@/lib/api";
import { analysisFromMeeting, analysisToEditPayload, buildMailtoHref } from "@/lib/meeting-analysis";
import { formatDate, todayIsoDate } from "@/lib/utils";
import type {
  ActionPriority,
  ActionStatus,
  FollowUpEmailDraft,
  Meeting,
  MeetingAnalysisResult,
  MeetingAnalysisUpdatePayload,
  NotionStatus
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export default function MeetingAnalysisPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const meetingId = Number(params.id);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [storedAnalysis, setStoredAnalysis] = useState<MeetingAnalysisResult | null>(null);
  const [, setLatestEmailDraft] = useState<FollowUpEmailDraft | null>(null);
  const [notionStatus, setNotionStatus] = useState<NotionStatus | null>(null);
  const [latestNotionUrl, setLatestNotionUrl] = useState<string | null>(null);
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [editingAnalysis, setEditingAnalysis] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingAnalysis, setSavingAnalysis] = useState(false);
  const [deletingMeeting, setDeletingMeeting] = useState(false);
  const [generatingEmailDraft, setGeneratingEmailDraft] = useState(false);
  const [generatingNotionDraft, setGeneratingNotionDraft] = useState(false);
  const [error, setError] = useState("");
  const [draftError, setDraftError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!meetingId) return;
    setEditingAnalysis(new URLSearchParams(window.location.search).get("edit") === "1");

    const cached = window.sessionStorage.getItem(`meetingflow_analysis_${meetingId}`);
    if (cached) {
      try {
        setStoredAnalysis(JSON.parse(cached) as MeetingAnalysisResult);
      } catch {
        window.sessionStorage.removeItem(`meetingflow_analysis_${meetingId}`);
      }
    }

    Promise.all([api.getMeeting(meetingId), api.getNotionStatus()])
      .then(([meetingData, notionData]) => {
        setMeeting(meetingData);
        setNotionStatus(notionData);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [meetingId]);

  const result = useMemo(() => {
    const baseResult = storedAnalysis ?? (meeting ? analysisFromMeeting(meeting) : null);
    return baseResult;
  }, [meeting, storedAnalysis]);
  const displayTitle = result?.meeting_title || meeting?.title || "분석 결과";
  const displayDate = result?.meeting_date ?? todayIsoDate();

  async function generateEmailDraft() {
    if (!meetingId) return;
    setGeneratingEmailDraft(true);
    setDraftError("");
    setMessage("");
    try {
      const draft = await api.generateFollowUpEmailDraft(meetingId);
      setLatestEmailDraft(draft);
      setMeeting((current) =>
        current
          ? {
              ...current,
              follow_up_email_drafts: [...(current.follow_up_email_drafts ?? []), draft]
            }
          : current
      );
      setMessage("후속 이메일 초안을 작성하고 메일 앱을 열었습니다.");
      window.location.href = buildMailtoHref(draft);
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : "후속 이메일 초안 작성에 실패했습니다.");
    } finally {
      setGeneratingEmailDraft(false);
    }
  }

  function connectNotion() {
    window.location.href = `${API_BASE_URL}/integrations/notion/connect`;
  }

  async function generateNotionDraft() {
    if (!meetingId) return;
    setGeneratingNotionDraft(true);
    setDraftError("");
    setMessage("");
    setLatestNotionUrl(null);
    try {
      const draft = await api.createNotionDraft(meetingId);
      setLatestNotionUrl(draft.url ?? null);
      setMessage("Notion 회의록 초안을 작성했습니다.");
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : "Notion 초안 작성에 실패했습니다.");
    } finally {
      setGeneratingNotionDraft(false);
    }
  }

  async function saveAnalysis(payload: MeetingAnalysisUpdatePayload) {
    if (!meetingId) return;
    setSavingAnalysis(true);
    setError("");
    setDraftError("");
    setMessage("");
    try {
      const updated = await api.updateMeetingAnalysis(meetingId, payload);
      setMeeting(updated);
      const updatedResult = analysisFromMeeting(updated);
      setStoredAnalysis(updatedResult);
      window.sessionStorage.setItem(`meetingflow_analysis_${meetingId}`, JSON.stringify(updatedResult));
      setEditingAnalysis(false);
      setMessage("분석 결과를 수정했습니다.");
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : "분석 결과 수정에 실패했습니다.");
    } finally {
      setSavingAnalysis(false);
    }
  }

  async function deleteMeeting() {
    if (!meeting || !window.confirm("이 회의와 분석 결과를 삭제할까요?")) return;
    setDeletingMeeting(true);
    setError("");
    setDraftError("");
    setMessage("");
    try {
      await api.deleteMeeting(meeting.id);
      window.sessionStorage.removeItem(`meetingflow_analysis_${meeting.id}`);
      router.replace("/dashboard");
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : "회의 삭제에 실패했습니다.");
      setDeletingMeeting(false);
    }
  }

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
          {message ? <Feedback variant="success">{message}</Feedback> : null}
          {latestNotionUrl ? (
            <Feedback variant="success">
              <a className="font-medium underline underline-offset-2" href={latestNotionUrl} target="_blank" rel="noreferrer">
                Notion에서 초안 열기
              </a>
            </Feedback>
          ) : null}
          {draftError ? <Feedback variant="error">{draftError}</Feedback> : null}
          <div className="flex flex-col justify-between gap-4 rounded-md border border-border bg-white px-5 py-5 shadow-sm lg:flex-row lg:items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Analysis Result</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-normal">{displayTitle}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-slate-500">
                <span>{formatDate(displayDate)}</span>
                <span aria-hidden="true">·</span>
                <ParticipantsPopover participants={result.participants} />
              </div>
            </div>
            <AnalysisActionsMenu
              disabled={savingAnalysis || deletingMeeting}
              onEdit={() => setEditingAnalysis(true)}
              onShowTranscript={() => setShowTranscriptModal(true)}
              onDelete={() => void deleteMeeting()}
            />
          </div>

          {editingAnalysis ? (
            <AnalysisEditForm
              result={result}
              meeting={meeting}
              saving={savingAnalysis}
              onCancel={() => setEditingAnalysis(false)}
              onSubmit={saveAnalysis}
            />
          ) : (
            <AnalysisResult
              result={result}
              generatingEmailDraft={generatingEmailDraft}
              generatingNotionDraft={generatingNotionDraft}
              notionConnected={Boolean(notionStatus?.connected)}
              onGenerateEmailDraft={generateEmailDraft}
              onGenerateNotionDraft={generateNotionDraft}
              onConnectNotion={connectNotion}
            />
          )}

          {showTranscriptModal ? (
            <TranscriptModal transcript={meeting.transcript} onClose={() => setShowTranscriptModal(false)} />
          ) : null}
        </div>
      )}
    </AppShell>
  );
}

function AnalysisActionsMenu({
  disabled,
  onEdit,
  onShowTranscript,
  onDelete
}: {
  disabled?: boolean;
  onEdit: () => void;
  onShowTranscript: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div className="relative self-start">
      <button
        type="button"
        disabled={disabled}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
        aria-label="분석 결과 더보기"
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute right-0 top-10 z-30 w-36 rounded-md border border-border bg-white p-1 text-sm shadow-lg">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded px-2 py-2 text-left hover:bg-slate-50"
            onClick={() => run(onEdit)}
          >
            <Pencil className="h-4 w-4" />
            수정
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded px-2 py-2 text-left hover:bg-slate-50"
            onClick={() => run(onShowTranscript)}
          >
            <Eye className="h-4 w-4" />
            원문 보기
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-red-600 hover:bg-red-50"
            onClick={() => run(onDelete)}
          >
            <Trash2 className="h-4 w-4" />
            삭제
          </button>
        </div>
      ) : null}
    </div>
  );
}

function AnalysisEditForm({
  result,
  meeting,
  saving,
  onCancel,
  onSubmit
}: {
  result: MeetingAnalysisResult;
  meeting: Meeting;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (payload: MeetingAnalysisUpdatePayload) => void | Promise<void>;
}) {
  const [form, setForm] = useState<MeetingAnalysisUpdatePayload>(() => analysisToEditPayload(result, meeting));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit(form);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>분석 결과 수정</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={submit}>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
            <label className="space-y-2 text-sm font-medium">
              <span>회의 제목</span>
              <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
            </label>
            <label className="space-y-2 text-sm font-medium">
              <span>회의 날짜</span>
              <Input
                type="date"
                value={form.meeting_date ?? ""}
                onChange={(event) => setForm({ ...form, meeting_date: event.target.value || null })}
              />
            </label>
          </div>

          <label className="block space-y-2 text-sm font-medium">
            <span>회의 요약</span>
            <Textarea rows={5} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} />
          </label>

          <EditableList
            title="참석자"
            addLabel="참석자 추가"
            onAdd={() =>
              setForm({
                ...form,
                participants: [...form.participants, { name: "", email: "" }]
              })
            }
          >
            {form.participants.map((participant, index) => (
              <div key={index} className="grid gap-2 rounded-md border border-border p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <Input
                  placeholder="이름"
                  value={participant.name}
                  onChange={(event) => {
                    const participants = [...form.participants];
                    participants[index] = { ...participant, name: event.target.value };
                    setForm({ ...form, participants });
                  }}
                />
                <Input
                  placeholder="email@example.com"
                  value={participant.email ?? ""}
                  onChange={(event) => {
                    const participants = [...form.participants];
                    participants[index] = { ...participant, email: event.target.value || null };
                    setForm({ ...form, participants });
                  }}
                />
                <RemoveButton onClick={() => setForm({ ...form, participants: form.participants.filter((_, itemIndex) => itemIndex !== index) })} />
              </div>
            ))}
          </EditableList>

          <EditableList
            title="결정사항"
            addLabel="결정사항 추가"
            onAdd={() =>
              setForm({
                ...form,
                decisions: [...form.decisions, { content: "", reason: null, source_text: null, confidence: 1 }]
              })
            }
          >
            {form.decisions.map((decision, index) => (
              <div key={index} className="grid gap-2 rounded-md border border-border p-3">
                <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                  <Input
                    placeholder="결정사항"
                    value={decision.content}
                    onChange={(event) => {
                      const decisions = [...form.decisions];
                      decisions[index] = { ...decision, content: event.target.value };
                      setForm({ ...form, decisions });
                    }}
                    required
                  />
                  <RemoveButton onClick={() => setForm({ ...form, decisions: form.decisions.filter((_, itemIndex) => itemIndex !== index) })} />
                </div>
                <Input
                  placeholder="결정 이유"
                  value={decision.reason ?? ""}
                  onChange={(event) => {
                    const decisions = [...form.decisions];
                    decisions[index] = { ...decision, reason: event.target.value || null };
                    setForm({ ...form, decisions });
                  }}
                />
              </div>
            ))}
          </EditableList>

          <EditableList
            title="액션 아이템"
            addLabel="액션 아이템 추가"
            onAdd={() =>
              setForm({
                ...form,
                action_items: [
                  ...form.action_items,
                  {
                    assignee: null,
                    description: "",
                    due_date: null,
                    priority: "medium",
                    status: "pending",
                    confidence: 1,
                    source_text: null
                  }
                ]
              })
            }
          >
            {form.action_items.map((item, index) => (
              <div key={index} className="grid gap-2 rounded-md border border-border p-3">
                <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                  <Input
                    placeholder="할 일"
                    value={item.description}
                    onChange={(event) => {
                      const actionItems = [...form.action_items];
                      actionItems[index] = { ...item, description: event.target.value };
                      setForm({ ...form, action_items: actionItems });
                    }}
                    required
                  />
                  <RemoveButton onClick={() => setForm({ ...form, action_items: form.action_items.filter((_, itemIndex) => itemIndex !== index) })} />
                </div>
                <div className="grid gap-2 md:grid-cols-4">
                  <Input
                    placeholder="담당자"
                    value={item.assignee ?? ""}
                    onChange={(event) => {
                      const actionItems = [...form.action_items];
                      actionItems[index] = { ...item, assignee: event.target.value || null };
                      setForm({ ...form, action_items: actionItems });
                    }}
                  />
                  <Input
                    type="date"
                    value={item.due_date ?? ""}
                    onChange={(event) => {
                      const actionItems = [...form.action_items];
                      actionItems[index] = { ...item, due_date: event.target.value || null };
                      setForm({ ...form, action_items: actionItems });
                    }}
                  />
                  <select
                    className="h-10 rounded-md border border-border bg-white px-2 text-sm"
                    value={item.priority}
                    onChange={(event) => {
                      const actionItems = [...form.action_items];
                      actionItems[index] = { ...item, priority: event.target.value as ActionPriority };
                      setForm({ ...form, action_items: actionItems });
                    }}
                  >
                    <option value="low">낮음</option>
                    <option value="medium">중간</option>
                    <option value="high">높음</option>
                  </select>
                  <select
                    className="h-10 rounded-md border border-border bg-white px-2 text-sm"
                    value={item.status}
                    onChange={(event) => {
                      const actionItems = [...form.action_items];
                      actionItems[index] = { ...item, status: event.target.value as ActionStatus };
                      setForm({ ...form, action_items: actionItems });
                    }}
                  >
                    <option value="pending">대기</option>
                    <option value="in_progress">진행중</option>
                    <option value="done">완료</option>
                  </select>
                </div>
              </div>
            ))}
          </EditableList>

          <EditableList
            title="후속 확인 사항"
            addLabel="확인 사항 추가"
            onAdd={() =>
              setForm({
                ...form,
                unresolved_issues: [...form.unresolved_issues, { content: "", owner: null, next_step: null, source_text: null }]
              })
            }
          >
            {form.unresolved_issues.map((issue, index) => (
              <div key={index} className="grid gap-2 rounded-md border border-border p-3">
                <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                  <Input
                    placeholder="확인 사항"
                    value={issue.content}
                    onChange={(event) => {
                      const issues = [...form.unresolved_issues];
                      issues[index] = { ...issue, content: event.target.value };
                      setForm({ ...form, unresolved_issues: issues });
                    }}
                    required
                  />
                  <RemoveButton
                    onClick={() =>
                      setForm({ ...form, unresolved_issues: form.unresolved_issues.filter((_, itemIndex) => itemIndex !== index) })
                    }
                  />
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <Input
                    placeholder="담당자"
                    value={issue.owner ?? ""}
                    onChange={(event) => {
                      const issues = [...form.unresolved_issues];
                      issues[index] = { ...issue, owner: event.target.value || null };
                      setForm({ ...form, unresolved_issues: issues });
                    }}
                  />
                  <Input
                    placeholder="다음 단계"
                    value={issue.next_step ?? ""}
                    onChange={(event) => {
                      const issues = [...form.unresolved_issues];
                      issues[index] = { ...issue, next_step: event.target.value || null };
                      setForm({ ...form, unresolved_issues: issues });
                    }}
                  />
                </div>
              </div>
            ))}
          </EditableList>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" disabled={saving} onClick={onCancel}>
              <X className="h-4 w-4" />
              취소
            </Button>
            <Button disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "저장 중" : "저장"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function EditableList({
  title,
  addLabel,
  onAdd,
  children
}: {
  title: string;
  addLabel: string;
  onAdd: () => void;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <Button type="button" variant="secondary" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          {addLabel}
        </Button>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="danger" title="삭제" onClick={onClick}>
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

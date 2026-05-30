"use client";

import { AlertTriangle, CalendarClock, CheckCircle2, Copy, FileText, Users } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { ActionKanbanBoard } from "@/components/meetings/action-kanban";
import { MeetingActionsMenu } from "@/components/meetings/meeting-actions-menu";
import { MeetingEditForm } from "@/components/meetings/meeting-edit-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, Feedback, LoadingState } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { ActionItemWithMeeting, ActionStatus, GoogleCalendarStatus, Meeting, MeetingUpdatePayload, Team, TeamMember } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const MAX_VISIBLE_COLLABORATORS = 4;
const avatarStyles = [
  "bg-blue-600 text-white",
  "bg-emerald-600 text-white",
  "bg-amber-500 text-white",
  "bg-rose-600 text-white"
];

export default function DashboardPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [actionItems, setActionItems] = useState<ActionItemWithMeeting[]>([]);
  const [team, setTeam] = useState<Team | null>(null);
  const [calendarStatus, setCalendarStatus] = useState<GoogleCalendarStatus | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [editingMeetingId, setEditingMeetingId] = useState<number | null>(null);
  const [savingMeetingId, setSavingMeetingId] = useState<number | null>(null);

  const loadDashboard = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([api.listMeetings(), api.listAllActionItems(), api.getCurrentTeam(), api.getGoogleCalendarStatus()])
      .then(([meetingData, actionData, teamData, calendarData]) => {
        setMeetings(meetingData);
        setActionItems(actionData);
        setTeam(teamData);
        setCalendarStatus(calendarData);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const dueSoon = useMemo(
    () =>
      actionItems
        .filter((item) => item.status !== "done" && item.due_date)
        .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))
        .slice(0, 5),
    [actionItems]
  );
  const activeCount = actionItems.filter((item) => item.status !== "done").length;
  const doneCount = actionItems.filter((item) => item.status === "done").length;
  const highPriorityCount = actionItems.filter((item) => item.status !== "done" && item.priority === "high").length;

  async function updateActionStatus(item: ActionItemWithMeeting, status: ActionStatus) {
    setUpdatingId(item.id);
    setMessage("");
    setError("");
    try {
      const updated = await api.updateActionItem(item.id, { status });
      setActionItems((current) =>
        current.map((candidate) => (candidate.id === item.id ? { ...candidate, ...updated } : candidate))
      );
      setMessage(status === "done" ? "액션 아이템을 완료했습니다." : "액션 아이템 상태를 업데이트했습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "상태 업데이트에 실패했습니다.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteActionItem(item: ActionItemWithMeeting) {
    if (!window.confirm("이 액션 아이템을 삭제할까요?")) return;
    setUpdatingId(item.id);
    setMessage("");
    setError("");
    try {
      await api.deleteActionItem(item.id);
      setActionItems((current) => current.filter((candidate) => candidate.id !== item.id));
      setMessage("액션 아이템을 삭제했습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "액션 아이템 삭제에 실패했습니다.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function updateMeeting(meeting: Meeting, payload: MeetingUpdatePayload) {
    setSavingMeetingId(meeting.id);
    setMessage("");
    setError("");
    try {
      const updated = await api.updateMeeting(meeting.id, payload);
      setMeetings((current) => current.map((candidate) => (candidate.id === meeting.id ? updated : candidate)));
      setActionItems((current) =>
        current.map((item) => (item.meeting_id === meeting.id ? { ...item, meeting_title: updated.title, meeting_date: updated.meeting_date } : item))
      );
      setEditingMeetingId(null);
      setMessage("회의 정보를 수정했습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "회의 수정에 실패했습니다.");
    } finally {
      setSavingMeetingId(null);
    }
  }

  async function deleteMeeting(meeting: Meeting) {
    if (!window.confirm("이 회의와 연결된 액션 아이템을 모두 삭제할까요?")) return;
    setSavingMeetingId(meeting.id);
    setMessage("");
    setError("");
    try {
      await api.deleteMeeting(meeting.id);
      setMeetings((current) => current.filter((candidate) => candidate.id !== meeting.id));
      setActionItems((current) => current.filter((item) => item.meeting_id !== meeting.id));
      setMessage("회의를 삭제했습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "회의 삭제에 실패했습니다.");
    } finally {
      setSavingMeetingId(null);
    }
  }

  return (
    <AppShell>
      <div className="mb-8">
        <div>
          <p className="text-sm font-medium text-slate-500">{team ? team.name : "Dashboard"}</p>
          <h1 className="ai-gradient-text mt-1 text-2xl font-semibold tracking-normal">회의 후속 업무 보드</h1>
        </div>
      </div>

      {error ? <Feedback variant="error" className="mb-5">{error}</Feedback> : null}
      {message ? <Feedback variant="success" className="mb-5">{message}</Feedback> : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <section className="grid gap-4 md:grid-cols-4">
            <Metric title="최근 회의" value={meetings.length} icon={<FileText className="h-4 w-4" />} />
            <Metric title="미완료 액션" value={activeCount} icon={<CalendarClock className="h-4 w-4" />} />
            <Metric title="높은 우선순위" value={highPriorityCount} icon={<AlertTriangle className="h-4 w-4" />} />
            <Metric title="완료" value={doneCount} icon={<CheckCircle2 className="h-4 w-4" />} />
          </section>

          <div className="mt-6">
            <BoardContextBar
              team={team}
              dueSoon={dueSoon}
              activeCount={activeCount}
            />
          </div>
          {loading ? (
            <LoadingState>액션 보드를 불러오는 중입니다.</LoadingState>
          ) : actionItems.length === 0 ? (
            <Card>
              <EmptyState
                title="아직 관리할 액션 아이템이 없습니다."
                description="회의록을 생성하고 AI 분석을 실행하면 이곳에 후속 업무가 표시됩니다."
              />
            </Card>
          ) : (
            <ActionKanbanBoard
              items={actionItems}
              updatingId={updatingId}
              onStatusChange={updateActionStatus}
              onDelete={deleteActionItem}
            />
          )}
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>최근 회의</CardTitle>
                <Link href="/meetings" className="text-sm font-medium text-slate-500 hover:text-slate-900">
                  더보기
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="px-5 py-4">
                  <LoadingState>최근 회의를 불러오는 중입니다.</LoadingState>
                </div>
              ) : meetings.length === 0 ? (
                <EmptyState title="회의가 없습니다." description="새 회의록을 만들면 여기에 표시됩니다." />
              ) : (
                <div className="divide-y divide-border">
                  {meetings.slice(0, 5).map((meeting) => (
                    <div key={meeting.id} className="px-5 py-4 transition hover:bg-white/64">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                        <Link href={`/meetings/${meeting.id}`} className="min-w-0">
                          <p className="truncate font-medium">{meeting.title}</p>
                          <p className="mt-1 text-sm text-slate-500">{formatDate(meeting.meeting_date)}</p>
                        </Link>
                        <MeetingActionsMenu
                          disabled={savingMeetingId === meeting.id}
                          onEdit={() => setEditingMeetingId(meeting.id)}
                          onDelete={() => void deleteMeeting(meeting)}
                        />
                      </div>
                      {editingMeetingId === meeting.id ? (
                        <div className="mt-4 rounded-md border border-border bg-white/72 p-3">
                          <MeetingEditForm
                            meeting={meeting}
                            saving={savingMeetingId === meeting.id}
                            onCancel={() => setEditingMeetingId(null)}
                            onSubmit={(payload) => updateMeeting(meeting, payload)}
                          />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <TeamPanel team={team} onJoined={loadDashboard} onMessage={setMessage} onError={setError} />
          <CalendarPanel
            status={calendarStatus}
            onStatusChange={setCalendarStatus}
            onMessage={setMessage}
            onError={setError}
          />
        </aside>
      </section>
    </AppShell>
  );
}

function BoardContextBar({
  team,
  dueSoon,
  activeCount
}: {
  team: Team | null;
  dueSoon: ActionItemWithMeeting[];
  activeCount: number;
}) {
  const totalMemberCount = team?.member_count ?? 0;

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-border bg-white/72 px-4 py-3 shadow-sm backdrop-blur lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <AvatarStack members={team?.members ?? []} totalCount={totalMemberCount} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{team?.name ?? "현재 워크스페이스"}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {totalMemberCount > 0 ? `${totalMemberCount}명이 함께 보는 실행 보드` : "팀 구성원이 여기에 표시됩니다."}
          </p>
        </div>
      </div>
      <DueSoonSummary dueSoon={dueSoon} activeCount={activeCount} />
    </div>
  );
}

function AvatarStack({ members, totalCount }: { members: TeamMember[]; totalCount: number }) {
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const visible = members.slice(0, MAX_VISIBLE_COLLABORATORS);
  const hiddenCount = Math.max(0, totalCount - visible.length);

  if (visible.length === 0) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white bg-slate-100 text-slate-500 shadow-sm">
        <Users className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div className="relative shrink-0">
      <div className="flex -space-x-2">
        {visible.map((member, index) => (
          <button
            key={member.id}
            type="button"
            className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-xs font-semibold shadow-sm transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${avatarStyles[index % avatarStyles.length]}`}
            title={`${member.name} · ${member.email}`}
            onClick={() => setSelectedMember((current) => (current?.id === member.id ? null : member))}
          >
            {getInitial(member.name)}
          </button>
        ))}
        {hiddenCount > 0 ? (
          <button
            type="button"
            className="flex h-9 min-w-9 items-center justify-center rounded-full border-2 border-white bg-slate-900 px-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            title={`${hiddenCount}명 더 있음`}
            onClick={() => setSelectedMember(null)}
          >
            +{hiddenCount}
          </button>
        ) : null}
      </div>
      {selectedMember ? (
        <div className="absolute left-0 top-11 z-30 w-64 rounded-md border border-border bg-white p-3 text-sm shadow-lg">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              {getInitial(selectedMember.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{selectedMember.name}</p>
              <p className="mt-1 truncate text-xs text-slate-500">{selectedMember.email}</p>
              <p className="mt-2 inline-flex rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{selectedMember.role}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DueSoonSummary({ dueSoon, activeCount }: { dueSoon: ActionItemWithMeeting[]; activeCount: number }) {
  const firstDue = dueSoon[0];

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <span className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        미완료 {activeCount}개
      </span>
      <Link
        href={firstDue ? `/meetings/${firstDue.meeting_id}/actions` : "/dashboard"}
        className="inline-flex min-w-0 items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 transition hover:bg-amber-100"
      >
        <CalendarClock className="h-4 w-4 shrink-0" />
        <span className="truncate">
          {firstDue ? `가장 가까운 마감 ${formatDate(firstDue.due_date)} · ${dueSoon.length}개` : "마감 예정 항목 없음"}
        </span>
      </Link>
    </div>
  );
}

function CalendarPanel({
  status,
  onStatusChange,
  onMessage,
  onError
}: {
  status: GoogleCalendarStatus | null;
  onStatusChange: (status: GoogleCalendarStatus) => void;
  onMessage: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [updating, setUpdating] = useState(false);

  async function toggleSync() {
    if (!status?.permission_granted) {
      window.location.href = `${API_BASE_URL}/integrations/google-calendar/connect`;
      return;
    }
    setUpdating(true);
    onMessage("");
    onError("");
    try {
      const updated = await api.updateGoogleCalendarSettings({ sync_enabled: !status.sync_enabled });
      onStatusChange(updated);
      onMessage(updated.sync_enabled ? "Google Calendar 동기화를 켰습니다." : "Google Calendar 동기화를 껐습니다.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Google Calendar 설정 변경에 실패했습니다.");
    } finally {
      setUpdating(false);
    }
  }

  async function syncNow() {
    setUpdating(true);
    onMessage("");
    onError("");
    try {
      const updated = await api.syncGoogleCalendarNow();
      onStatusChange(updated);
      if (updated.failed_count > 0) {
        onError(`Calendar 동기화 실패 ${updated.failed_count}건이 있습니다. ${updated.last_error ?? ""}`.trim());
      } else {
        onMessage("Google Calendar 재동기화를 완료했습니다.");
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "Google Calendar 재동기화에 실패했습니다.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4" />
          Google Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium">
            {status?.permission_granted ? (status.sync_enabled ? "동기화 ON" : "연결됨 · 동기화 OFF") : "권한 필요"}
          </p>
          <p className="mt-1 truncate text-xs text-slate-500">
            {status?.permission_granted ? `${status.email} · ${status.calendar_id}` : "Calendar 이벤트 접근 권한을 승인해야 합니다."}
          </p>
        </div>
        {status?.permission_granted ? (
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md bg-emerald-50 px-2 py-2 text-emerald-700">
              <p className="font-semibold">{status.synced_count}</p>
              <p>완료</p>
            </div>
            <div className="rounded-md bg-red-50 px-2 py-2 text-red-700">
              <p className="font-semibold">{status.failed_count}</p>
              <p>실패</p>
            </div>
            <div className="rounded-md bg-slate-50 px-2 py-2 text-slate-600">
              <p className="font-semibold">{status.skipped_count}</p>
              <p>제외</p>
            </div>
          </div>
        ) : null}
        {status?.last_error ? <p className="line-clamp-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{status.last_error}</p> : null}
        <Button className="w-full" variant={status?.sync_enabled ? "secondary" : "default"} disabled={updating} onClick={toggleSync}>
          {status?.permission_granted ? (status.sync_enabled ? "동기화 끄기" : "동기화 켜기") : "Calendar 권한 연결"}
        </Button>
        {status?.permission_granted && status.sync_enabled ? (
          <Button className="w-full" variant="secondary" disabled={updating} onClick={syncNow}>
            지금 재동기화
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function TeamPanel({
  team,
  onJoined,
  onMessage,
  onError
}: {
  team: Team | null;
  onJoined: () => void;
  onMessage: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);

  async function copyInviteCode() {
    if (!team?.invite_code) return;
    await navigator.clipboard.writeText(team.invite_code).catch(() => undefined);
    onMessage("팀 초대 코드를 복사했습니다.");
  }

  async function joinTeam() {
    if (!inviteCode.trim()) return;
    setJoining(true);
    onError("");
    onMessage("");
    try {
      await api.joinTeam(inviteCode);
      setInviteCode("");
      onMessage("팀에 합류했습니다. 팀 보드를 다시 불러왔습니다.");
      onJoined();
    } catch (err) {
      onError(err instanceof Error ? err.message : "팀 합류에 실패했습니다.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          팀 워크스페이스
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="truncate text-sm font-medium">{team?.name ?? "팀 정보를 불러오는 중"}</p>
          <p className="mt-1 text-xs text-slate-500">
            {team ? `${team.member_count}명 · ${team.role}` : "같은 팀은 동일한 칸반 보드를 봅니다."}
          </p>
        </div>
        {team ? (
          <button
            className="ai-pill flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-xs"
            type="button"
            onClick={copyInviteCode}
          >
            <span className="min-w-0">
              <span className="block text-slate-500">초대 코드</span>
              <span className="block truncate font-mono font-medium text-slate-800">{team.invite_code}</span>
            </span>
            <Copy className="h-4 w-4 shrink-0 text-slate-500" />
          </button>
        ) : null}
        <div className="space-y-2">
          <Input
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value)}
            placeholder="초대 코드로 팀 합류"
          />
          <Button className="w-full" variant="secondary" disabled={joining || !inviteCode.trim()} onClick={joinTeam}>
            {joining ? "합류 중" : "팀 합류"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ title, value, icon }: { title: string; value: number; icon: ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
        </div>
        <div className="ai-brand-mark rounded-md p-2 text-white shadow-sm">{icon}</div>
      </CardContent>
    </Card>
  );
}

function getInitial(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}

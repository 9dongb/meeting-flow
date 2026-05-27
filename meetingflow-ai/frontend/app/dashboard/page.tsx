"use client";

import { AlertTriangle, CalendarClock, CheckCircle2, FileText, PlusCircle } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { ActionKanbanBoard } from "@/components/meetings/action-kanban";
import { StatusBadge } from "@/components/meetings/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, Feedback, LoadingState } from "@/components/ui/feedback";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { ActionItemWithMeeting, ActionStatus, Meeting } from "@/types";

export default function DashboardPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [actionItems, setActionItems] = useState<ActionItemWithMeeting[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([api.listMeetings(), api.listAllActionItems()])
      .then(([meetingData, actionData]) => {
        setMeetings(meetingData);
        setActionItems(actionData);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <AppShell>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-slate-500">Dashboard</p>
          <h1 className="ai-gradient-text mt-1 text-2xl font-semibold tracking-normal">회의 후속 업무 보드</h1>
        </div>
        <Link href="/meetings/new">
          <Button>
            <PlusCircle className="h-4 w-4" />새 회의록 생성
          </Button>
        </Link>
      </div>

      {error ? <Feedback variant="error" className="mb-5">{error}</Feedback> : null}
      {message ? <Feedback variant="success" className="mb-5">{message}</Feedback> : null}

      <section className="grid gap-4 md:grid-cols-4">
        <Metric title="최근 회의" value={meetings.length} icon={<FileText className="h-4 w-4" />} />
        <Metric title="미완료 액션" value={activeCount} icon={<CalendarClock className="h-4 w-4" />} />
        <Metric title="높은 우선순위" value={highPriorityCount} icon={<AlertTriangle className="h-4 w-4" />} />
        <Metric title="완료" value={doneCount} icon={<CheckCircle2 className="h-4 w-4" />} />
      </section>

      <section className="mt-6 grid gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div>
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
            <ActionKanbanBoard items={actionItems} updatingId={updatingId} onStatusChange={updateActionStatus} />
          )}
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>마감 임박</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dueSoon.length === 0 ? (
                <p className="text-sm text-slate-500">마감일이 있는 미완료 항목이 없습니다.</p>
              ) : (
                dueSoon.map((item) => (
                  <Link
                    key={item.id}
                    href={`/meetings/${item.meeting_id}/actions`}
                    className="ai-pill block rounded-md p-3 transition hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium leading-5">{item.description}</p>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {item.assignee || "담당자 미정"} · {formatDate(item.due_date)}
                    </p>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>최근 회의</CardTitle>
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
                  {meetings.slice(0, 6).map((meeting) => (
                    <Link key={meeting.id} href={`/meetings/${meeting.id}`} className="block px-5 py-4 transition hover:bg-white/64">
                      <p className="font-medium">{meeting.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{formatDate(meeting.meeting_date)}</p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </section>
    </AppShell>
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

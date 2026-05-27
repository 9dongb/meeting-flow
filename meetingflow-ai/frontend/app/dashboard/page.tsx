"use client";

import { CalendarClock, CheckCircle2, FileText, PlusCircle } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { StatusBadge } from "@/components/meetings/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, Feedback, LoadingState } from "@/components/ui/feedback";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Meeting } from "@/types";

export default function DashboardPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listMeetings()
      .then(setMeetings)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const actionItems = useMemo(() => meetings.flatMap((meeting) => meeting.action_items ?? []), [meetings]);
  const dueSoon = actionItems.filter((item) => item.status !== "done" && item.due_date).slice(0, 5);
  const doneCount = actionItems.filter((item) => item.status === "done").length;
  const pendingCount = actionItems.length - doneCount;

  return (
    <AppShell>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-slate-500">Dashboard</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal">회의 이후 업무 실행 현황</h1>
        </div>
        <Link href="/meetings/new">
          <Button>
            <PlusCircle className="h-4 w-4" />새 회의록 생성
          </Button>
        </Link>
      </div>

      {error ? <Feedback variant="error" className="mb-5">{error}</Feedback> : null}

      <section className="grid gap-4 md:grid-cols-4">
        <Metric title="최근 회의" value={meetings.length} icon={<FileText className="h-4 w-4" />} />
        <Metric title="전체 액션" value={actionItems.length} icon={<CheckCircle2 className="h-4 w-4" />} />
        <Metric title="대기/진행" value={pendingCount} icon={<CalendarClock className="h-4 w-4" />} />
        <Metric title="완료" value={doneCount} icon={<CheckCircle2 className="h-4 w-4" />} />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>최근 회의 목록</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="px-5 py-4">
                <LoadingState>최근 회의를 불러오는 중입니다.</LoadingState>
              </div>
            ) : meetings.length === 0 ? (
              <EmptyState
                title="첫 회의록을 만들어 보세요."
                description="AI 분석으로 구조화된 결과 화면까지 바로 확인할 수 있습니다."
              />
            ) : (
              <div className="divide-y divide-border">
                {meetings.map((meeting) => (
                  <Link
                    key={meeting.id}
                    href={`/meetings/${meeting.id}`}
                    className="grid gap-2 px-5 py-4 transition hover:bg-slate-50 sm:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <p className="font-medium">{meeting.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {meeting.project_name || "프로젝트 미지정"} · {formatDate(meeting.meeting_date)}
                      </p>
                    </div>
                    <p className="text-sm text-slate-500">{meeting.summary ? "분석 완료" : "분석 대기"}</p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>마감 임박 액션 아이템</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dueSoon.length === 0 ? (
                <p className="text-sm text-slate-500">마감일이 있는 대기 항목이 아직 없습니다.</p>
              ) : (
                dueSoon.map((item) => (
                  <div key={item.id} className="rounded-md border border-border bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium">{item.description}</p>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {item.assignee || "담당자 미정"} · {formatDate(item.due_date)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
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
        <div className="rounded-md bg-slate-100 p-2 text-slate-600">{icon}</div>
      </CardContent>
    </Card>
  );
}

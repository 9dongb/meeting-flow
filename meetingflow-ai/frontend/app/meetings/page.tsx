"use client";

import { FileText, PlusCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { MeetingActionsMenu } from "@/components/meetings/meeting-actions-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, Feedback, LoadingState } from "@/components/ui/feedback";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Meeting } from "@/types";

export default function MeetingsPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    api
      .listMeetings()
      .then(setMeetings)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function deleteMeeting(meeting: Meeting) {
    if (!window.confirm("이 회의와 연결된 액션 아이템을 모두 삭제할까요?")) return;
    setSavingId(meeting.id);
    setMessage("");
    setError("");
    try {
      await api.deleteMeeting(meeting.id);
      setMeetings((current) => current.filter((candidate) => candidate.id !== meeting.id));
      setMessage("회의를 삭제했습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "회의 삭제에 실패했습니다.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <AppShell>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-slate-500">Meetings</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">전체 회의 목록</h1>
        </div>
        <Link href="/meetings/new">
          <Button>
            <PlusCircle className="h-4 w-4" />새 회의록 생성
          </Button>
        </Link>
      </div>

      {error ? <Feedback variant="error" className="mb-5">{error}</Feedback> : null}
      {message ? <Feedback variant="success" className="mb-5">{message}</Feedback> : null}

      <Card className="overflow-visible">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            회의 {meetings.length}개
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="px-5 py-4">
              <LoadingState>회의 목록을 불러오는 중입니다.</LoadingState>
            </div>
          ) : meetings.length === 0 ? (
            <EmptyState title="회의가 없습니다." description="새 회의록을 만들면 여기에 표시됩니다." />
          ) : (
            <div className="divide-y divide-border">
              {meetings.map((meeting) => (
                <div key={meeting.id} className="px-5 py-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <Link href={`/meetings/${meeting.id}/analysis`} className="min-w-0">
                      <p className="truncate font-medium">{meeting.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatDate(meeting.meeting_date)} · 액션 아이템 {(meeting.action_items ?? []).length}개
                      </p>
                    </Link>
                    <MeetingActionsMenu
                      disabled={savingId === meeting.id}
                      onEdit={() => router.push(`/meetings/${meeting.id}/analysis?edit=1`)}
                      onDelete={() => void deleteMeeting(meeting)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}

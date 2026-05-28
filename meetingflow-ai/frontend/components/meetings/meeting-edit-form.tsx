"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import type { Meeting, MeetingUpdatePayload } from "@/types";

export function MeetingEditForm({
  meeting,
  saving,
  onCancel,
  onSubmit
}: {
  meeting: Meeting;
  saving?: boolean;
  onCancel: () => void;
  onSubmit: (payload: MeetingUpdatePayload) => void | Promise<void>;
}) {
  const [title, setTitle] = useState(meeting.title);
  const [meetingDate, setMeetingDate] = useState(meeting.meeting_date ?? "");
  const [transcript, setTranscript] = useState(meeting.transcript ?? "");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit({
      title,
      meeting_date: meetingDate || null,
      transcript
    });
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
        <label className="space-y-2 text-sm font-medium">
          <span>회의 제목</span>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>
        <label className="space-y-2 text-sm font-medium">
          <span>회의 날짜</span>
          <Input type="date" value={meetingDate} onChange={(event) => setMeetingDate(event.target.value)} />
        </label>
      </div>
      <label className="block space-y-2 text-sm font-medium">
        <span>회의 원문</span>
        <Textarea rows={8} value={transcript} onChange={(event) => setTranscript(event.target.value)} />
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          취소
        </Button>
        <Button disabled={saving}>{saving ? "저장 중" : "저장"}</Button>
      </div>
    </form>
  );
}

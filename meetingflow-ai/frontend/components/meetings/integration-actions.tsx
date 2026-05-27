"use client";

import { CalendarPlus, Clipboard, MailPlus, NotepadText } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

export function IntegrationActions({ meetingId }: { meetingId: number }) {
  const [message, setMessage] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  async function run(action: string, fn: () => Promise<{ message?: string; markdown?: string }>) {
    setLoading(action);
    setMessage("");
    try {
      const result = await fn();
      setMessage(result.message ?? "Markdown 내보내기 Mock이 완료되었습니다.");
      if (result.markdown) {
        setMarkdown(result.markdown);
        await navigator.clipboard?.writeText(result.markdown).catch(() => undefined);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Mock 실행에 실패했습니다.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>내보내기 및 연동</CardTitle>
        <p className="mt-2 text-sm text-slate-500">모든 외부 연동은 검토와 승인 이후 Mock으로만 실행됩니다.</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Button
            variant="secondary"
            disabled={loading !== null}
            onClick={() => run("markdown", () => api.exportMarkdown(meetingId))}
          >
            <Clipboard className="h-4 w-4" />
            Markdown 복사
          </Button>
          <Button variant="secondary" disabled={loading !== null} onClick={() => run("notion", () => api.notionMock(meetingId))}>
            <NotepadText className="h-4 w-4" />
            Notion Mock
          </Button>
          <Button
            variant="secondary"
            disabled={loading !== null}
            onClick={() => run("calendar", () => api.calendarMock(meetingId))}
          >
            <CalendarPlus className="h-4 w-4" />
            Calendar Mock
          </Button>
          <Button variant="secondary" disabled={loading !== null} onClick={() => run("gmail", () => api.gmailMock(meetingId))}>
            <MailPlus className="h-4 w-4" />
            Gmail Mock
          </Button>
        </div>
        {message ? <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">{message}</p> : null}
        {markdown ? (
          <pre className="mt-4 max-h-60 overflow-auto whitespace-pre-wrap rounded-md bg-slate-950 p-4 text-xs leading-6 text-slate-50">
            {markdown}
          </pre>
        ) : null}
      </CardContent>
    </Card>
  );
}

"use client";

import { ArrowLeft, FileText, Keyboard, Sparkles, Upload } from "lucide-react";
import mammoth from "mammoth";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, Feedback } from "@/components/ui/feedback";
import { Input, Textarea } from "@/components/ui/input";
import { api } from "@/lib/api";

type InputMode = "manual" | "upload";

export default function NewMeetingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<InputMode | null>(null);
  const [title, setTitle] = useState("제품 주간 싱크");
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 10));
  const [participants, setParticipants] = useState("민지 <minji@example.com>, 준호, Alex");
  const [transcript, setTranscript] = useState(
    "이번 주에는 회의록 분석 결과 화면과 액션 아이템 검토 흐름을 먼저 만든다. Notion과 Calendar, Gmail은 실제 전송 없이 사용자가 검토한 뒤 Mock 실행하는 방식으로 둔다."
  );
  const [selectedFileName, setSelectedFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!transcript.trim()) {
      setError("회의록 내용을 입력하거나 txt/docx 파일을 업로드해 주세요.");
      setLoading(false);
      return;
    }

    try {
      const meeting = await api.createMeeting({
        title: mode === "upload" ? selectedFileName.replace(/\.(txt|docx)$/i, "") || "업로드 회의록" : title,
        project_name: null,
        meeting_date: mode === "upload" ? new Date().toISOString().slice(0, 10) : meetingDate || null,
        transcript,
        participants: mode === "upload" ? [] : parseParticipants(participants)
      });
      const result = await api.analyzeMeeting(meeting.id);
      window.sessionStorage.setItem(`meetingflow_analysis_${meeting.id}`, JSON.stringify(result));
      setSuccess("AI 분석이 완료되었습니다. 결과 화면으로 이동합니다.");
      router.push(`/meetings/${meeting.id}/analysis`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "회의 분석 요청에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileLoading(true);
    setError("");
    setSuccess("");
    setSelectedFileName(file.name);

    try {
      const text = await readMeetingFile(file);
      setTranscript(text.trim());
      setSuccess("파일 내용을 불러왔습니다. AI 분석을 시작하세요.");
    } catch (err) {
      setTranscript("");
      setError(err instanceof Error ? err.message : "파일을 읽지 못했습니다.");
    } finally {
      setFileLoading(false);
    }
  }

  function selectMode(nextMode: InputMode) {
    setMode(nextMode);
    setError("");
    setSuccess("");
    setSelectedFileName("");
    if (nextMode === "upload") {
      setTranscript("");
    }
    if (nextMode === "manual" && !transcript.trim()) {
      setTranscript(
        "이번 주에는 회의록 분석 결과 화면과 액션 아이템 검토 흐름을 먼저 만든다. Notion과 Calendar, Gmail은 실제 전송 없이 사용자가 검토한 뒤 Mock 실행하는 방식으로 둔다."
      );
    }
  }

  return (
    <AppShell>
      <div className="mx-auto mb-8 max-w-4xl">
        <p className="text-sm font-medium text-slate-500">New Meeting</p>
        <h1 className="ai-gradient-text mt-1 text-2xl font-semibold tracking-normal">회의록 생성</h1>
      </div>

      {!mode ? (
        <section className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
          <button className="text-left" onClick={() => selectMode("manual")}>
            <Card className="h-full transition hover:-translate-y-0.5 hover:border-slate-400">
              <CardHeader>
                <div className="ai-brand-mark mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md text-white">
                  <Keyboard className="h-5 w-5" />
                </div>
                <CardTitle>직접 작성</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-slate-600">
                  회의록 텍스트를 바로 붙여넣고 AI 분석을 시작합니다.
                </p>
              </CardContent>
            </Card>
          </button>

          <button className="text-left" onClick={() => selectMode("upload")}>
            <Card className="h-full transition hover:-translate-y-0.5 hover:border-slate-400">
              <CardHeader>
                <div className="ai-brand-mark mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md text-white">
                  <Upload className="h-5 w-5" />
                </div>
                <CardTitle>파일 업로드</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-slate-600">
                  `.txt` 또는 Word `.docx` 파일에서 회의록 텍스트를 추출합니다.
                </p>
              </CardContent>
            </Card>
          </button>
        </section>
      ) : (
        <Card className={mode === "manual" ? "mx-auto max-w-4xl" : "mx-auto max-w-xl"}>
          <CardHeader>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <CardTitle>{mode === "manual" ? "직접 작성" : "파일 업로드"}</CardTitle>
                <p className="mt-2 text-sm text-slate-500">
                  {mode === "manual"
                    ? "회의 정보를 입력하고 분석을 시작합니다."
                    : "txt 또는 docx 파일 하나만 업로드하면 바로 분석할 수 있습니다."}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setMode(null);
                  setError("");
                  setSuccess("");
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                선택으로 돌아가기
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              {mode === "manual" ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
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
                    <span>참석자</span>
                    <Input value={participants} onChange={(event) => setParticipants(event.target.value)} />
                  </label>

                  <label className="block space-y-2 text-sm font-medium">
                    <span>회의록 텍스트</span>
                    <Textarea
                      rows={14}
                      value={transcript}
                      onChange={(event) => setTranscript(event.target.value)}
                      placeholder="회의록을 입력하세요."
                    />
                  </label>
                </>
              ) : (
                <label className="ai-pill block rounded-md border-dashed p-5">
                  <div className="flex flex-col items-center text-center">
                    <div className="ai-brand-mark mb-3 rounded-md p-3 text-white">
                      <FileText className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-medium">회의록 파일 업로드</p>
                    <p className="mt-1 text-xs text-slate-500">txt, docx 파일을 지원합니다.</p>
                    <Input
                      className="mt-5 bg-white/86"
                      type="file"
                      accept=".txt,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={onFileChange}
                    />
                  </div>
                </label>
              )}

              {mode === "upload" && selectedFileName ? (
                <EmptyState title={selectedFileName} description="파일 내용이 준비되었습니다." />
              ) : null}

              {error ? <Feedback variant="error">{error}</Feedback> : null}
              {success ? <Feedback variant="success">{success}</Feedback> : null}

              <Button className="w-full" disabled={loading || fileLoading}>
                <Sparkles className="h-4 w-4" />
                {loading ? "AI 분석 중" : fileLoading ? "파일 읽는 중" : "AI 분석 시작"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}

async function readMeetingFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "txt" || file.type === "text/plain") {
    return file.text();
  }
  if (extension === "docx") {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }
  throw new Error("txt 또는 docx 파일만 업로드할 수 있습니다.");
}

function parseParticipants(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const match = item.match(/(.+)<(.+)>/);
      if (!match) return { name: item };
      return { name: match[1].trim(), email: match[2].trim() };
    });
}

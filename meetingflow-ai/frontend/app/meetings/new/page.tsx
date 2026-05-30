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
const DEFAULT_TRANSCRIPT =
  "2026년 5월 20일 A 프로젝트 회의에서 MVP 출시 일정, QA 진행 상황, 디자인 수정 범위를 논의했다. MVP 출시는 기존 일정대로 진행하되 QA 리스크가 큰 기능은 우선순위를 조정하기로 했다. 결제 기능은 1차 출시 범위에서 제외하고, 디자인 수정안은 이번 주 금요일까지 확정한다. 김비수는 Redis 캐시 레이어 설계와 FastAPI 백엔드 적용을 2026년 2월 2일까지 진행한다. 이미희는 예외 케이스를 포함한 QA 시나리오를 2026년 1월 31일까지 최종 수정한다. 홍몸동은 일정 변경 내용을 마케팅과 사업팀에 공유하고 조율한다. 결제 기능의 2차 출시 포함 여부, 고객사 검수 일정, QA 리소스 추가 배정 가능 여부는 추가 확인이 필요하다.";

export default function NewMeetingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<InputMode | null>(null);
  const [title, setTitle] = useState("제품 주간 싱크");
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 10));
  const [participants, setParticipants] = useState("민지 <minji@example.com>, 준호, Alex");
  const [transcript, setTranscript] = useState(DEFAULT_TRANSCRIPT);
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
      setTranscript(DEFAULT_TRANSCRIPT);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto mb-8 max-w-4xl">
        <p className="text-sm font-medium text-slate-500">New Meeting</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">회의록 생성</h1>
      </div>

      {!mode ? (
        <section className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
          <button className="text-left" onClick={() => selectMode("manual")}>
            <Card className="h-full transition hover:-translate-y-0.5 hover:border-slate-400">
              <CardHeader>
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-[#0f6cbd]">
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
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-[#0f6cbd]">
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
                <label className="block rounded-md border border-dashed border-border bg-white p-5 shadow-sm">
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-3 rounded-md border border-blue-100 bg-blue-50 p-3 text-[#0f6cbd]">
                      <FileText className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-medium">회의록 파일 업로드</p>
                    <p className="mt-1 text-xs text-slate-500">txt, docx 파일을 지원합니다.</p>
                    <Input
                      className="mt-5"
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

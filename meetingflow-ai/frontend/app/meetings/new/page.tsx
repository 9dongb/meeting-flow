"use client";

import { ArrowLeft, FileText, Keyboard, Sparkles, Upload } from "lucide-react";
import mammoth from "mammoth";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { AiWorkingState } from "@/components/ui/ai-working-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Feedback } from "@/components/ui/feedback";
import { Input, Textarea } from "@/components/ui/input";
import sampleMeetings from "@/data/sample-meetings.json";
import { api } from "@/lib/api";

type InputMode = "manual" | "upload";
type SampleMeeting = (typeof sampleMeetings)[number];
const DEFAULT_SAMPLE = sampleMeetings[0];

export default function NewMeetingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<InputMode | null>(null);
  const [title, setTitle] = useState(DEFAULT_SAMPLE.title);
  const [meetingDate, setMeetingDate] = useState(DEFAULT_SAMPLE.meetingDate);
  const [participants, setParticipants] = useState(DEFAULT_SAMPLE.participants);
  const [transcript, setTranscript] = useState(DEFAULT_SAMPLE.transcript);
  const [selectedSampleId, setSelectedSampleId] = useState(DEFAULT_SAMPLE.id);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [showUploadPreview, setShowUploadPreview] = useState(false);
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
        meeting_date: mode === "upload" ? null : meetingDate || null,
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
    setSelectedSampleId("");
    setShowUploadPreview(false);

    try {
      const text = await readMeetingFile(file);
      setTranscript(text.trim());
      setShowUploadPreview(true);
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
      setSelectedSampleId("");
      setShowUploadPreview(false);
    }
    if (nextMode === "manual" && !transcript.trim()) {
      applySampleMeeting(DEFAULT_SAMPLE.id, "manual");
    }
  }

  function applySampleMeeting(sampleId: string, targetMode = mode) {
    const sample = sampleMeetings.find((item) => item.id === sampleId);
    if (!sample) return;

    setSelectedSampleId(sample.id);
    setError("");
    setSuccess("");
    setTranscript(sample.transcript);

    if (targetMode === "manual") {
      setTitle(sample.title);
      setMeetingDate(sample.meetingDate);
      setParticipants(sample.participants);
      setSelectedFileName("");
      return;
    }

    if (targetMode === "upload") {
      setSelectedFileName(sample.fileName);
      setShowUploadPreview(true);
      setSuccess("예시 파일 내용을 불러왔습니다. AI 분석을 시작하세요.");
    }
  }

  function clearUploadSelection() {
    setSelectedSampleId("");
    setSelectedFileName("");
    setTranscript("");
    setShowUploadPreview(false);
    setError("");
    setSuccess("");
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
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md border border-indigo-100 bg-indigo-50 text-[#5e6ad2]">
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
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md border border-indigo-100 bg-indigo-50 text-[#5e6ad2]">
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
        <Card className="mx-auto max-w-4xl">
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
              <SampleMeetingSelect
                mode={mode}
                selectedSampleId={selectedSampleId}
                onChange={(sampleId) => {
                  if (!sampleId) {
                    clearUploadSelection();
                    return;
                  }
                  applySampleMeeting(sampleId);
                }}
              />

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
                <div className="space-y-3">
                  <label className="block rounded-md border border-dashed border-border bg-white p-5 shadow-sm">
                    <div className="flex flex-col items-center text-center">
                      <div className="mb-3 rounded-md border border-indigo-100 bg-indigo-50 p-3 text-[#5e6ad2]">
                        <FileText className="h-6 w-6" />
                      </div>
                      <p className="max-w-full break-words text-sm font-medium">
                        {selectedFileName || "회의록 파일 업로드"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {selectedFileName ? "파일 내용이 준비되었습니다." : "txt, docx 파일을 지원합니다."}
                      </p>
                      <Input
                        className="mt-5"
                        type="file"
                        accept=".txt,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={onFileChange}
                      />
                    </div>
                  </label>

                  {transcript.trim() ? (
                    <div className="rounded-md border border-border bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-slate-900">추출된 내용</p>
                        <Button type="button" variant="secondary" onClick={() => setShowUploadPreview((open) => !open)}>
                          {showUploadPreview ? "접기" : "보기"}
                        </Button>
                      </div>
                      {showUploadPreview ? (
                        <p className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-white p-3 text-sm leading-6 text-slate-700">
                          {transcript}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}

              {error ? <Feedback variant="error">{error}</Feedback> : null}
              {success ? <Feedback variant="success">{success}</Feedback> : null}

              {loading ? (
                <AiWorkingState
                  title="AI가 회의록을 분석하고 있습니다"
                  description="요약, 결정사항, 담당자별 액션 아이템과 후속 확인 사항을 함께 정리하는 중입니다."
                  label="Analyzing"
                />
              ) : null}

              <Button className={`w-full ${loading ? "ai-button-working" : ""}`} disabled={loading || fileLoading}>
                <Sparkles className={`h-4 w-4 ${loading ? "ai-sparkle" : ""}`} />
                {loading ? "AI 분석 중" : fileLoading ? "파일 읽는 중" : "AI 분석 시작"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}

function SampleMeetingSelect({
  mode,
  selectedSampleId,
  onChange
}: {
  mode: InputMode;
  selectedSampleId: string;
  onChange: (sampleId: string) => void;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium">
      <span>예시 회의록</span>
      <select
        className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-[#5e6ad2] focus:shadow-[0_0_0_3px_rgba(94,106,210,0.16)]"
        value={selectedSampleId}
        onChange={(event) => onChange(event.target.value)}
      >
        {mode === "upload" ? <option value="">직접 파일 업로드</option> : null}
        {sampleMeetings.map((sample: SampleMeeting) => (
          <option key={sample.id} value={sample.id}>
            {sample.label}
          </option>
        ))}
      </select>
    </label>
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

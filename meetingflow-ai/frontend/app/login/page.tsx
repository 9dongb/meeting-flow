"use client";

import { ArrowRight, Bot, CalendarClock, CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("홍길동");
  const [email, setEmail] = useState("demo@meetingflow.ai");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (mode === "login") {
        await api.login(email, password);
      } else {
        await api.register(name, email, password);
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "인증 요청에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="work-surface grid min-h-screen grid-cols-1 lg:grid-cols-[480px_minmax(0,1fr)]">
      <section className="flex items-center justify-center border-r border-border bg-white px-6 py-12">
        <Card className="w-full max-w-md shadow-none">
          <CardHeader>
            <div className="mb-5 flex items-center gap-3">
              <span className="ai-brand-mark flex h-9 w-9 items-center justify-center rounded-md text-white">
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-950">MeetingFlow AI</p>
                <p className="text-xs text-slate-500">Execution workspace</p>
              </div>
            </div>
            <CardTitle>{mode === "login" ? "로그인" : "회원가입"}</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              회의 이후 실행 업무까지 정리하는 AI 워크스페이스에 접속합니다.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <a className="ai-button-primary inline-flex h-10 w-full items-center justify-center rounded-md px-3 text-sm font-semibold" href={`${API_BASE_URL}/auth/google/login`}>
                Google로 계속하기
              </a>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                이메일 로그인
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              {mode === "register" ? (
                <label className="block space-y-2 text-sm font-medium">
                  <span>이름</span>
                  <Input value={name} onChange={(event) => setName(event.target.value)} required />
                </label>
              ) : null}
              <label className="block space-y-2 text-sm font-medium">
                <span>이메일</span>
                <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </label>
              <label className="block space-y-2 text-sm font-medium">
                <span>비밀번호</span>
                <Input
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
              {error ? <p className="rounded-md border border-red-200 bg-red-50/85 px-3 py-2 text-sm text-red-700">{error}</p> : null}
              <Button className="w-full" disabled={loading}>
                {loading ? "처리 중" : mode === "login" ? "로그인" : "계정 만들기"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
            <button
              className="mt-4 w-full text-center text-sm text-slate-600 underline-offset-4 hover:underline"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "처음이라면 회원가입" : "이미 계정이 있다면 로그인"}
            </button>
          </CardContent>
        </Card>
      </section>
      <section className="hidden px-12 py-12 lg:block">
        <div className="flex h-full max-w-4xl flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
              <ShieldCheck className="h-4 w-4" />
              승인 기반 Mock 연동
            </div>
            <h1 className="mt-8 text-4xl font-semibold tracking-normal text-slate-950">
              회의록을 실행 가능한 후속 업무로 바꿉니다.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
              MeetingFlow AI는 요약에서 멈추지 않고 결정사항, 담당자, 마감일, 후속 메일 초안까지 한 번에 정리합니다.
            </p>
          </div>
          <div className="rounded-md border border-border bg-white shadow-sm">
            <div className="border-b border-border bg-[#fbfbfc] px-5 py-4">
              <p className="text-sm font-semibold text-slate-950">제품 주간 싱크</p>
              <p className="mt-1 text-xs text-slate-500">2026.05.31 · 참석자 5명 · 분석 완료</p>
            </div>
            <div className="grid gap-0 divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
              {[
                { label: "결정사항", value: "4", icon: CheckCircle2 },
                { label: "미완료 액션", value: "12", icon: CalendarClock },
                { label: "메일 초안", value: "1", icon: Mail }
              ].map((item) => (
                <div key={item.label} className="px-5 py-5">
                  <item.icon className="h-4 w-4 text-[#5e6ad2]" />
                  <p className="mt-4 text-2xl font-semibold text-slate-950">{item.value}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-border px-5 py-4">
              <div className="flex items-center justify-between gap-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <span>가장 가까운 마감</span>
                <span className="font-semibold">D-2 · QA 시나리오 확정</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

"use client";

import { ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
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
        await api.register(email, password);
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "인증 요청에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="work-surface grid min-h-screen grid-cols-1 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="flex items-center justify-center px-6 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="ai-gradient-text">{mode === "login" ? "로그인" : "회원가입"}</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              회의 이후 실행 업무까지 정리하는 AI 워크스페이스에 접속합니다.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
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
      <section className="hidden border-l border-white/60 bg-white/52 px-12 py-12 backdrop-blur-xl lg:block">
        <div className="flex h-full max-w-2xl flex-col justify-between">
          <div>
            <div className="ai-pill inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4" />
              승인 기반 Mock 연동
            </div>
            <h1 className="mt-8 text-4xl font-semibold tracking-normal text-slate-950">
              회의록을 <span className="ai-gradient-text">실행 가능한 후속 업무</span>로 바꿉니다.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
              MeetingFlow AI는 요약에서 멈추지 않고 결정사항, 담당자, 마감일, 후속 메일 초안까지 한 번에 정리합니다.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {["요약", "액션 아이템", "메일 초안"].map((item) => (
              <div key={item} className="ai-pill rounded-lg px-4 py-5 text-sm font-medium">
                <Mail className="mb-3 h-4 w-4 text-slate-500" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

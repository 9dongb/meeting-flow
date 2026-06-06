"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/layout/app-logo";
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
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f8] px-5 py-10">
      <section className="w-full max-w-[480px] text-center">
        <AppLogo className="mx-auto h-14 w-14" />
        <h1 className="mt-7 text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
          {mode === "login" ? "로그인" : "회원가입"}
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-slate-600 sm:text-base">
          회의 요약, 액션 아이템, 후속 업무를 한 곳에서 이어가세요.
        </p>

        <div className="mt-10 space-y-5">
          <a
            className="inline-flex h-14 w-full items-center justify-center rounded-full border border-[#d9d9dc] bg-white px-5 text-base font-semibold text-slate-950 shadow-[0_1px_2px_rgba(16,16,18,0.04)] transition hover:border-[#c9c9ce] hover:bg-[#fbfbfc]"
            href={`${API_BASE_URL}/auth/google/login`}
          >
            Google 계정으로 계속하기
          </a>

          <div className="flex items-center gap-5 text-sm font-medium text-slate-800">
            <span className="h-px flex-1 bg-[#d9d9dc]" />
            또는
            <span className="h-px flex-1 bg-[#d9d9dc]" />
          </div>

          <form className="space-y-4 text-left" onSubmit={onSubmit}>
            {mode === "register" ? (
              <Input
                aria-label="이름"
                className="h-14 rounded-full px-6 text-base placeholder:text-slate-400"
                placeholder="이름"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            ) : null}
            <Input
              aria-label="이메일 주소"
              className="h-14 rounded-full px-6 text-base placeholder:text-slate-400"
              type="email"
              placeholder="이메일 주소"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <Input
              aria-label="비밀번호"
              className="h-14 rounded-full px-6 text-base placeholder:text-slate-400"
              type="password"
              minLength={8}
              placeholder="비밀번호"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            {error ? <p className="rounded-md border border-red-200 bg-red-50/85 px-4 py-3 text-sm text-red-700">{error}</p> : null}
            <Button className="h-14 w-full rounded-full bg-slate-950 text-base hover:bg-slate-800" disabled={loading}>
              {loading ? "처리 중" : mode === "login" ? "계속" : "계정 만들기"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </div>

        <button
          className="mt-8 text-sm text-slate-600 underline-offset-4 hover:text-slate-950 hover:underline"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"}
        </button>
      </section>
    </main>
  );
}

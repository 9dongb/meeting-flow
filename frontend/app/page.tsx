import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FileText,
  Mail,
  NotebookTabs,
  Sparkles,
  Users
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { AppLogo } from "@/components/layout/app-logo";

const proofPoints = [
  { label: "분석 결과", value: "요약 · 결정 · 액션" },
  { label: "후속 처리", value: "일정 · 문서 · 메일" },
  { label: "팀 협업", value: "공유 보드 · 담당자 · 마감일" }
];

const metrics = [
  { label: "결정사항", value: "4", icon: CheckCircle2 },
  { label: "미완료 액션", value: "12", icon: CalendarClock },
  { label: "메일 초안", value: "1", icon: Mail }
];

const workflow = [
  {
    title: "회의록을 붙여넣거나 업로드",
    description: "회의 메모, 텍스트 파일, 문서 기반 회의록을 한곳에 모아 분석을 시작합니다.",
    icon: FileText
  },
  {
    title: "AI가 실행 단위로 정리",
    description: "요약에서 멈추지 않고 결정사항, 담당자, 마감일, 우선순위를 구조화합니다.",
    icon: Sparkles
  },
  {
    title: "팀과 후속 업무까지 연결",
    description: "공유 팀, 액션 보드, Google Calendar와 Notion 연동으로 다음 행동까지 이어갑니다.",
    icon: Users
  }
];

const actionItems = [
  { title: "QA 시나리오 확정", owner: "김민준", due: "D-2", status: "높음" },
  { title: "고객 인터뷰 질문지 공유", owner: "이지원", due: "오늘", status: "진행" },
  { title: "릴리즈 노트 초안 검토", owner: "박서연", due: "D-5", status: "보통" }
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export default function Home() {
  return (
    <main className="work-surface min-h-screen">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link className="flex items-center gap-2" href="/">
          <AppLogo className="h-10 w-10" />
          <span className="text-sm font-semibold text-slate-950">MeetingFlow AI</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link className="hidden rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-950 sm:inline-flex" href="/login?mode=login">
            로그인
          </Link>
          <Link className="ai-button-primary inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold" href="/login?mode=register">
            회원가입
            <ArrowRight className="h-4 w-4" />
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-8 px-5 pb-9 pt-4 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)] lg:items-center lg:pb-16 lg:pt-10">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
            <Sparkles className="h-4 w-4 text-[#5e6ad2]" />
            회의 후속 업무 자동화
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-normal text-slate-950 sm:mt-7 sm:text-5xl">
            MeetingFlow AI
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:mt-5 sm:text-lg sm:leading-8">
            회의록을 실행 가능한 후속 업무로 바꾸는 AI 워크스페이스입니다. 요약, 결정사항, 담당자, 마감일, 후속 메일 초안까지 한 흐름에서 정리합니다.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link className="ai-button-primary inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold" href="/login">
              시작하기
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm hover:bg-[#f7f7f8]" href={`${API_BASE_URL}/auth/google/login`}>
              Google로 계속하기
            </a>
          </div>
          <dl className="mt-8 hidden gap-3 sm:grid sm:grid-cols-3">
            {proofPoints.map((item) => (
              <div key={item.label} className="border-l border-border pl-4">
                <dt className="text-xs font-medium uppercase text-slate-400">{item.label}</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <ProductPreview />
      </section>

      <section className="border-y border-border bg-white">
        <div className="mx-auto grid w-full max-w-6xl gap-0 px-5 sm:px-8 md:grid-cols-3">
          {workflow.map((item) => (
            <FeatureBlock key={item.title} {...item} />
          ))}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div>
          <p className="text-sm font-semibold text-[#4f58c4]">업무 흐름</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-normal text-slate-950">
            회의가 끝난 뒤에 업무가 자연스럽게 이어집니다.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            회의 내용을 정리하는 순간 팀이 해야 할 일, 가장 가까운 마감, 외부 도구로 옮겨야 할 기록까지 함께 정리됩니다.
          </p>
        </div>
        <div className="grid gap-3">
          {[
            "회의 종료 후 AI 분석",
            "결정사항과 미완료 액션을 팀 보드에서 확인",
            "업무 핵심 내용을 Calendar와 Notion으로 연결"
          ].map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-md border border-border bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              {item}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function ProductPreview() {
  return (
    <div className="rounded-md border border-border bg-white shadow-soft">
      <div className="flex items-center justify-between border-b border-border bg-[#fbfbfc] px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">제품 주간 싱크</p>
          <p className="mt-1 text-xs text-slate-500">2026.05.31 · 참석자 5명 · 분석 완료</p>
        </div>
        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
          분석 완료
        </span>
      </div>

      <div className="grid grid-cols-3 divide-x divide-border">
        {metrics.map((item) => (
          <MetricTile key={item.label} {...item} />
        ))}
      </div>

      <div className="hidden gap-0 border-t border-border sm:grid lg:grid-cols-[1fr_0.8fr]">
        <div className="border-b border-border p-4 lg:border-b-0 lg:border-r">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-950">액션 아이템</p>
            <span className="text-xs font-medium text-slate-500">12개 중 3개 표시</span>
          </div>
          <div className="space-y-2">
            {actionItems.map((item) => (
              <div key={item.title} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-md border border-border px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.owner} · {item.due}</p>
                </div>
                <span className="self-start rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{item.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4">
          <p className="text-sm font-semibold text-slate-950">후속 연동</p>
          <div className="mt-3 space-y-3">
            <IntegrationRow icon={CalendarClock} label="Google Calendar" value="Action Item 연동" />
            <IntegrationRow icon={NotebookTabs} label="Notion" value="요약 정리 초안 생성" />
            <IntegrationRow icon={Mail} label="Gmail" value="후속 메일 초안 생성" />
          </div>
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <span className="font-semibold">가장 가까운 마감</span>
            <p className="mt-1">D-2 · QA 시나리오 확정</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricTile({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="px-4 py-5">
      <Icon className="h-4 w-4 text-[#5e6ad2]" />
      <p className="mt-4 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}

function FeatureBlock({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) {
  return (
    <div className="border-b border-border py-6 md:border-b-0 md:border-r md:px-6 md:last:border-r-0">
      <Icon className="h-5 w-5 text-[#5e6ad2]" />
      <h2 className="mt-4 text-base font-semibold tracking-normal text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function IntegrationRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-[#fbfbfc]">
        <Icon className="h-4 w-4 text-slate-600" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">{label}</p>
        <p className="truncate text-xs text-slate-500">{value}</p>
      </div>
    </div>
  );
}

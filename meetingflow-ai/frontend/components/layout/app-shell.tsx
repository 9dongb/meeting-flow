"use client";

import { Bot, LayoutDashboard, LogOut, PlusCircle, Save, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { FormEvent, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { clearClientAuthState } from "@/lib/auth";
import type { User } from "@/types";

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    api
      .me()
      .then((user) => {
        if (!mounted) return;
        setCurrentUser(user);
        setProfileName(user.name);
        setCheckingAuth(false);
      })
      .catch(() => {
        if (!mounted) return;
        router.replace("/login");
      });
    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (!profileOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current?.contains(event.target as Node)) return;
      setProfileOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileOpen]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profileName.trim()) return;
    setSavingProfile(true);
    setProfileError("");
    try {
      const updated = await api.updateMe(profileName);
      setCurrentUser(updated);
      setProfileName(updated.name);
      setProfileOpen(false);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "이름 저장에 실패했습니다.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function logout() {
    await api.logout().catch(() => undefined);
    clearClientAuthState();
    router.replace("/login");
  }

  if (checkingAuth) {
    return (
      <div className="work-surface flex min-h-screen items-center justify-center px-5">
        <div className="ai-pill w-full max-w-sm rounded-md px-5 py-4 text-sm text-slate-600">
          <div className="mb-3 flex items-center gap-2 font-medium">
            <span className="ai-brand-mark flex h-8 w-8 items-center justify-center rounded-md text-white">
              <Bot className="h-4 w-4" />
            </span>
            로그인 상태를 확인하는 중입니다.
          </div>
          <div className="ai-loader" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen work-surface text-slate-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-border bg-[#f4f4f5] px-4 py-4 lg:flex lg:flex-col">
          <Link href="/dashboard" className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-semibold">
            <span className="ai-brand-mark flex h-9 w-9 items-center justify-center rounded-md text-white shadow-sm">
              <Bot className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-slate-950">MeetingFlow AI</span>
              <span className="block text-xs font-medium text-slate-500">Execution workspace</span>
            </span>
          </Link>
          <nav className="mt-8 space-y-1">
            <Link href="/dashboard" className="flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-slate-700 transition hover:bg-[#ececef] hover:text-slate-950">
              <LayoutDashboard className="h-4 w-4" />
              대시보드
            </Link>
            <Link href="/meetings/new" className="flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-slate-700 transition hover:bg-[#ececef] hover:text-slate-950">
              <PlusCircle className="h-4 w-4" />
              새 회의록
            </Link>
          </nav>
          <div className="mt-auto rounded-md border border-border bg-white px-3 py-3 text-xs leading-5 text-slate-600 shadow-sm">
            <p className="font-semibold text-slate-900">AI Review</p>
            <p className="mt-1">회의 요약, 결정사항, 액션 아이템을 한 작업대에서 검토합니다.</p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="ai-topbar sticky top-0 z-20 border-b">
            <div className="flex h-14 items-center justify-between px-5">
              <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold lg:hidden">
                <span className="ai-brand-mark flex h-8 w-8 items-center justify-center rounded-md text-white shadow-sm">
                  <Bot className="h-4 w-4" />
                </span>
                <span>MeetingFlow AI</span>
              </Link>
              <div className="hidden text-sm font-medium text-slate-500 lg:block">회의 후속 업무 실행 콘솔</div>
              <nav className="hidden items-center gap-1 md:flex lg:hidden">
                <Link href="/dashboard" className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm hover:bg-[#f0f0f2]">
                  <LayoutDashboard className="h-4 w-4" />
                  대시보드
                </Link>
                <Link href="/meetings/new" className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm hover:bg-[#f0f0f2]">
                  <PlusCircle className="h-4 w-4" />새 회의록
                </Link>
              </nav>
              <div className="flex items-center gap-1">
            <div ref={profileRef} className="relative">
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm hover:bg-[#f0f0f2] focus:outline-none focus:ring-2 focus:ring-indigo-200"
                onClick={() => setProfileOpen((open) => !open)}
                aria-expanded={profileOpen}
              >
                <UserRound className="h-4 w-4" />
                <span className="hidden max-w-24 truncate sm:inline">{currentUser?.name ?? "프로필"}</span>
              </button>
              {profileOpen ? (
                <div className="absolute right-0 top-11 z-50 w-72 rounded-md border border-border bg-white p-3 text-sm shadow-lg">
                  <form className="space-y-3" onSubmit={saveProfile}>
                    <div>
                      <p className="font-semibold text-slate-900">내 프로필</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{currentUser?.email}</p>
                    </div>
                    <label className="block space-y-2 text-xs font-medium text-slate-600">
                      <span>이름</span>
                      <Input value={profileName} onChange={(event) => setProfileName(event.target.value)} required />
                    </label>
                    {profileError ? <p className="text-xs text-red-600">{profileError}</p> : null}
                    <Button className="w-full" disabled={savingProfile || !profileName.trim()}>
                      <Save className="h-4 w-4" />
                      {savingProfile ? "저장 중" : "저장"}
                    </Button>
                  </form>
                </div>
              ) : null}
            </div>
            <Button
              variant="ghost"
              title="로그아웃"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
              </div>
            </div>
          </header>
          <main className="px-5 py-8 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

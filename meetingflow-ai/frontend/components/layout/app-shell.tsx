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
        <div className="ai-pill w-full max-w-sm rounded-xl px-5 py-4 text-sm text-slate-600">
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
    <div className="min-h-screen work-surface">
      <header className="ai-topbar sticky top-0 z-20 border-b backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold">
            <span className="ai-brand-mark flex h-8 w-8 items-center justify-center rounded-md text-white shadow-sm">
              <Bot className="h-4 w-4" />
            </span>
            <span className="ai-gradient-text">MeetingFlow AI</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/dashboard" className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm hover:bg-slate-100">
              <LayoutDashboard className="h-4 w-4" />
              대시보드
            </Link>
            <Link href="/meetings/new" className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm hover:bg-slate-100">
              <PlusCircle className="h-4 w-4" />새 회의록
            </Link>
            <div ref={profileRef} className="relative">
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
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
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
    </div>
  );
}

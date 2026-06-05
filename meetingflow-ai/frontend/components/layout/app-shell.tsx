"use client";

import { LayoutDashboard, LogOut, Save, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { FormEvent, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppLogo } from "@/components/layout/app-logo";
import { api } from "@/lib/api";
import { clearClientAuthState } from "@/lib/auth";
import type { User } from "@/types";

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isMeetingDetailPage = pathname.startsWith("/meetings/") && pathname !== "/meetings/new";
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
            <AppLogo />
            로그인 상태를 확인하는 중입니다.
          </div>
          <div className="ai-loader" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen work-surface text-slate-950">
      <header className="ai-topbar sticky top-0 z-20 border-b">
        <div className="mx-auto flex min-h-14 max-w-screen-2xl flex-wrap items-center gap-2 px-4 py-2 sm:flex-nowrap sm:px-5 lg:px-8">
          <Link href="/dashboard" className="flex min-w-0 shrink-0 items-center gap-2 rounded-md pr-2 text-sm font-semibold">
            <AppLogo />
            <span className="truncate">MeetingFlow AI</span>
          </Link>

          <nav className="order-3 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto sm:order-none sm:ml-2">
            <TopNavLink href="/dashboard" active={pathname === "/dashboard"}>
              <LayoutDashboard className="h-4 w-4" />
              <span>대시보드</span>
            </TopNavLink>
            <TopNavLink href="/meetings" active={pathname === "/meetings" || isMeetingDetailPage}>
              <span>회의 목록</span>
            </TopNavLink>
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <div ref={profileRef} className="relative">
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm hover:bg-[#f0f0f2] focus:outline-none focus:ring-2 focus:ring-indigo-200"
                onClick={() => setProfileOpen((open) => !open)}
                aria-expanded={profileOpen}
              >
                <UserRound className="h-4 w-4" />
                <span className="hidden max-w-24 truncate md:inline">{currentUser?.name ?? "프로필"}</span>
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
            <Button variant="ghost" title="로그아웃" onClick={logout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-screen-2xl px-5 py-8 lg:px-8">{children}</main>
    </div>
  );
}

function TopNavLink({
  href,
  active,
  children
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium transition ${
        active
          ? "bg-white text-slate-950 shadow-sm ring-1 ring-border"
          : "text-slate-600 hover:bg-[#f0f0f2] hover:text-slate-950"
      }`}
    >
      {children}
    </Link>
  );
}

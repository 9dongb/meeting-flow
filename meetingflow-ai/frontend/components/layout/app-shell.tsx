"use client";

import { Bot, LayoutDashboard, LogOut, PlusCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { clearClientAuthState } from "@/lib/auth";

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let mounted = true;
    api
      .me()
      .then(() => {
        if (mounted) setCheckingAuth(false);
      })
      .catch(() => {
        if (!mounted) return;
        router.replace("/login");
      });
    return () => {
      mounted = false;
    };
  }, [router]);

  async function logout() {
    await api.logout().catch(() => undefined);
    clearClientAuthState();
    router.replace("/login");
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        로그인 상태를 확인하는 중입니다.
      </div>
    );
  }

  return (
    <div className="min-h-screen work-surface">
      <header className="sticky top-0 z-20 border-b border-border bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold">
            <Bot className="h-5 w-5" />
            MeetingFlow AI
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/dashboard" className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm hover:bg-slate-100">
              <LayoutDashboard className="h-4 w-4" />
              대시보드
            </Link>
            <Link href="/meetings/new" className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm hover:bg-slate-100">
              <PlusCircle className="h-4 w-4" />새 회의록
            </Link>
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

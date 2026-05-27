import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const variants = {
  error: "border-red-200 bg-red-50/85 text-red-700",
  success: "border-emerald-200 bg-emerald-50/85 text-emerald-700",
  info: "border-slate-200 bg-white/72 text-slate-700"
};

export function Feedback({
  children,
  variant = "info",
  className
}: {
  children: ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  return <p className={cn("rounded-md border px-3 py-2 text-sm shadow-sm backdrop-blur", variants[variant], className)}>{children}</p>;
}

export function LoadingState({ children = "불러오는 중입니다." }: { children?: ReactNode }) {
  return (
    <div className="ai-pill rounded-lg px-4 py-3">
      <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
        <span>{children}</span>
        <span className="ai-gradient-text text-xs font-semibold">AI working</span>
      </div>
      <div className="ai-loader mt-3" />
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="font-medium">{title}</p>
      {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
    </div>
  );
}

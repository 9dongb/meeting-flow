import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const variants = {
  error: "border-red-200 bg-red-50 text-red-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  info: "border-slate-200 bg-white text-slate-700"
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
  return <p className={cn("rounded-md border px-3 py-2 text-sm shadow-sm", variants[variant], className)}>{children}</p>;
}

export function LoadingState({ children = "불러오는 중입니다." }: { children?: ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
        <span>{children}</span>
        <span className="text-xs font-semibold text-[#0f6cbd]">Processing</span>
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

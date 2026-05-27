import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const variants = {
  error: "bg-red-50 text-red-700",
  success: "bg-emerald-50 text-emerald-700",
  info: "bg-slate-50 text-slate-700"
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
  return <p className={cn("rounded-md px-3 py-2 text-sm", variants[variant], className)}>{children}</p>;
}

export function LoadingState({ children = "불러오는 중입니다." }: { children?: ReactNode }) {
  return <Feedback>{children}</Feedback>;
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="font-medium">{title}</p>
      {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
    </div>
  );
}

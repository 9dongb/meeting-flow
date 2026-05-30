import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const tones = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  yellow: "border-amber-200 bg-amber-50 text-amber-800",
  red: "border-red-200 bg-red-50 text-red-700",
  blue: "border-indigo-200 bg-indigo-50 text-indigo-700"
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center whitespace-nowrap rounded border px-2 py-1 text-xs font-medium", tones[tone], className)}
      {...props}
    />
  );
}

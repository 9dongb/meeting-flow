import { Sparkles, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function AiWorkingState({
  title,
  description,
  label = "AI working",
  icon: Icon = Sparkles,
  compact = false,
  className
}: {
  title: string;
  description: ReactNode;
  label?: string;
  icon?: LucideIcon;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("ai-working-state rounded-md border shadow-sm", compact ? "px-3 py-3" : "px-4 py-4", className)}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className={cn("ai-working-icon", compact ? "h-8 w-8" : "h-9 w-9")}>
          <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p className={cn("font-semibold text-slate-950", compact ? "text-sm" : "text-base")}>{title}</p>
            <span className="ai-working-label">{label}</span>
          </div>
          <p className={cn("mt-1 leading-5 text-slate-600", compact ? "text-xs" : "text-sm")}>{description}</p>
          <div className={cn("ai-loader ai-loader-spectrum", compact ? "mt-3" : "mt-4")} />
        </div>
      </div>
    </div>
  );
}

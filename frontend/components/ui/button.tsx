import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "secondary" | "ghost" | "danger";

const variants: Record<ButtonVariant, string> = {
  default: "ai-button-primary",
  secondary: "border border-border bg-white text-slate-900 shadow-sm hover:bg-[#f7f7f8]",
  ghost: "text-slate-700 hover:bg-[#f0f0f2]",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700"
};

export function Button({
  className,
  variant = "default",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

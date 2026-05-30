import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#5e6ad2] focus:shadow-[0_0_0_3px_rgba(94,106,210,0.16)]",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-32 w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#5e6ad2] focus:shadow-[0_0_0_3px_rgba(94,106,210,0.16)]",
        className
      )}
      {...props}
    />
  );
}

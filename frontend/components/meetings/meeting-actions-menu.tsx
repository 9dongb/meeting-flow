"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

export function MeetingActionsMenu({
  onEdit,
  onDelete,
  disabled = false
}: {
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
        aria-label="회의 더보기"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute right-0 top-9 z-30 w-32 rounded-md border border-border bg-white p-1 text-sm shadow-lg">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded px-2 py-2 text-left hover:bg-slate-50"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              run(onEdit);
            }}
          >
            <Pencil className="h-4 w-4" />
            수정
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-red-600 hover:bg-red-50"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              run(onDelete);
            }}
          >
            <Trash2 className="h-4 w-4" />
            삭제
          </button>
        </div>
      ) : null}
    </div>
  );
}

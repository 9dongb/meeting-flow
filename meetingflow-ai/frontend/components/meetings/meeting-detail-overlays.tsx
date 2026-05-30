"use client";

import { Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { Participant } from "@/types";

export function ParticipantsPopover({ participants }: { participants: Participant[] }) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const participantSummary = formatParticipantSummary(participants);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={popoverRef} className="relative">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-slate-600 transition hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <Users className="h-4 w-4" />
        {participantSummary}
      </button>
      {open ? (
        <div className="ai-card absolute left-0 top-full z-20 mt-2 w-72 rounded-lg border bg-white p-3 text-left shadow-soft">
          <p className="mb-2 text-xs font-semibold uppercase text-slate-400">참석자</p>
          {participants.length === 0 ? (
            <p className="text-sm text-slate-500">등록된 참석자가 없습니다.</p>
          ) : (
            <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {participants.map((participant, index) => (
                <li key={`${participant.name}-${participant.email ?? index}`} className="rounded-md bg-white/70 px-3 py-2">
                  <p className="text-sm font-medium text-slate-900">{participant.name}</p>
                  {participant.email ? <p className="mt-0.5 truncate text-xs text-slate-500">{participant.email}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function TranscriptModal({ transcript, onClose }: { transcript: string; onClose: () => void }) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="transcript-title">
      <div className="ai-card flex max-h-[86vh] w-full max-w-3xl flex-col rounded-lg border bg-white shadow-soft">
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
          <h2 id="transcript-title" className="text-base font-semibold tracking-normal text-slate-950">
            회의 원문
          </h2>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-white/70 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
            onClick={onClose}
            aria-label="회의 원문 닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">
          <p className="whitespace-pre-wrap leading-7 text-slate-700">{transcript || "원문이 없습니다."}</p>
        </div>
      </div>
    </div>
  );
}

function formatParticipantSummary(participants: Participant[]) {
  if (participants.length === 0) return "참석자 없음";
  if (participants.length === 1) return `참석자 ${participants[0].name}`;
  return `참석자 ${participants[0].name} 외 ${participants.length - 1}명`;
}

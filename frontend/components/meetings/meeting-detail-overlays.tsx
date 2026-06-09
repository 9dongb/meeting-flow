"use client";

import { Users, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { Participant } from "@/types";

type PopoverParticipant = Participant & {
  source_text?: string | null;
};

const OUTSIDE_WORKSPACE_PARTICIPANT_LABEL = "워크스페이스 외부 참석자";

export function ParticipantsPopover({ participants }: { participants: PopoverParticipant[] }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const participantSummary = formatParticipantSummary(participants);
  const updatePosition = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 288;
    const estimatedHeight = Math.min(320, 88 + participants.length * 56);
    const belowTop = rect.bottom + 8;
    const aboveTop = rect.top - estimatedHeight - 8;
    const top = belowTop + estimatedHeight > window.innerHeight - 16 && aboveTop >= 16 ? aboveTop : belowTop;

    setPosition({
      left: Math.max(16, Math.min(rect.left, window.innerWidth - width - 16)),
      top: Math.max(16, top)
    });
  }, [participants.length]);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    function handleClickOutside(event: MouseEvent) {
      if (buttonRef.current?.contains(event.target as Node)) return;
      if (popoverRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  return (
    <div className="inline-flex">
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-slate-600 transition hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
        onClick={() => {
          updatePosition();
          setOpen((current) => !current);
        }}
        aria-expanded={open}
      >
        <Users className="h-4 w-4" />
        {participantSummary}
      </button>
      {open ? (
        <div
          ref={popoverRef}
          className="fixed z-50 w-72 rounded-lg border border-slate-200 bg-white p-3 text-left shadow-lg"
          style={{ left: position.left, top: position.top }}
        >
          <p className="mb-2 text-xs font-semibold uppercase text-slate-400">참석자</p>
          {participants.length === 0 ? (
            <p className="text-sm text-slate-500">등록된 참석자가 없습니다.</p>
          ) : (
            <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {participants.map((participant, index) => (
                <li key={`${participant.name}-${participant.email ?? index}`} className="rounded-md bg-slate-50 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-medium text-slate-900">{participant.name}</p>
                    {isAutoAddedParticipant(participant) ? (
                      <span className="shrink-0 rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium text-[#5e6ad2]">
                        자동 추가
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{participant.email || OUTSIDE_WORKSPACE_PARTICIPANT_LABEL}</p>
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
      <div className="flex max-h-[86vh] w-full max-w-3xl flex-col rounded-md border border-border bg-white shadow-xl">
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
          <h2 id="transcript-title" className="text-base font-semibold tracking-normal text-slate-950">
            회의 원문
          </h2>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
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

function isAutoAddedParticipant(participant: PopoverParticipant) {
  return Boolean(participant.source_text && participant.source_text !== "사용자 입력");
}

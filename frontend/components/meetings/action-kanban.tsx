"use client";

import { CheckCircle2, CircleDot, Clock3, MoreHorizontal, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { DragEvent } from "react";
import { useRef, useState } from "react";

import { PriorityBadge } from "@/components/meetings/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDueState } from "@/lib/utils";
import type { ActionItemWithMeeting, ActionStatus } from "@/types";

const columns: Array<{
  status: ActionStatus;
  title: string;
  icon: typeof CircleDot;
  description: string;
}> = [
  {
    status: "pending",
    title: "대기",
    icon: CircleDot,
    description: "아직 시작하지 않은 후속 업무"
  },
  {
    status: "in_progress",
    title: "진행중",
    icon: Clock3,
    description: "담당자가 처리 중인 업무"
  },
  {
    status: "done",
    title: "완료",
    icon: CheckCircle2,
    description: "처리된 업무 이력"
  }
];

export function ActionKanbanBoard({
  items,
  updatingId,
  onStatusChange,
  onDelete
}: {
  items: ActionItemWithMeeting[];
  updatingId: number | null;
  onStatusChange: (item: ActionItemWithMeeting, status: ActionStatus) => void | Promise<void>;
  onDelete: (item: ActionItemWithMeeting) => void | Promise<void>;
}) {
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [overStatus, setOverStatus] = useState<ActionStatus | null>(null);

  function findDraggedItem() {
    return items.find((item) => item.id === draggedId) ?? null;
  }

  function onDragStart(event: DragEvent<HTMLDivElement>, item: ActionItemWithMeeting) {
    if (updatingId === item.id) return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(item.id));
    setDraggedId(item.id);
  }

  function onDragEnd() {
    setDraggedId(null);
    setOverStatus(null);
  }

  function onDragOver(event: DragEvent<HTMLDivElement>, status: ActionStatus) {
    if (!draggedId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setOverStatus(status);
  }

  function onDrop(event: DragEvent<HTMLDivElement>, status: ActionStatus) {
    event.preventDefault();
    const item = findDraggedItem();
    setDraggedId(null);
    setOverStatus(null);
    if (!item || item.status === status) return;
    void onStatusChange(item, status);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {columns.map((column) => {
        const columnItems = items.filter((item) => item.status === column.status);
        return (
          <KanbanColumn
            key={column.status}
            status={column.status}
            title={column.title}
            description={column.description}
            icon={column.icon}
            items={columnItems}
            updatingId={updatingId}
            isDragOver={overStatus === column.status}
            onDragOver={(event) => onDragOver(event, column.status)}
            onDrop={(event) => onDrop(event, column.status)}
            onDragEnd={onDragEnd}
            onDragStart={onDragStart}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
          />
        );
      })}
    </div>
  );
}

function KanbanColumn({
  status,
  title,
  description,
  icon: Icon,
  items,
  updatingId,
  isDragOver,
  onDragOver,
  onDrop,
  onDragEnd,
  onDragStart,
  onStatusChange,
  onDelete
}: {
  status: ActionStatus;
  title: string;
  description: string;
  icon: typeof CircleDot;
  items: ActionItemWithMeeting[];
  updatingId: number | null;
  isDragOver: boolean;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onDragStart: (event: DragEvent<HTMLDivElement>, item: ActionItemWithMeeting) => void;
  onStatusChange: (item: ActionItemWithMeeting, status: ActionStatus) => void | Promise<void>;
  onDelete: (item: ActionItemWithMeeting) => void | Promise<void>;
}) {
  return (
    <Card
      className={`overflow-visible ${status === "done" ? "bg-slate-50" : ""} ${
        isDragOver ? "border-indigo-300 shadow-[0_14px_32px_rgba(94,106,210,0.14)]" : ""
      }`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {title}
            </CardTitle>
            <p className="mt-2 text-xs text-slate-500">{description}</p>
          </div>
          <span className="rounded-md border border-border bg-white px-2 py-1 text-xs font-medium text-slate-600">{items.length}</span>
        </div>
      </CardHeader>
      <CardContent className="min-h-72 space-y-3">
        {items.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-10 text-center text-sm text-slate-500">
            {status === "done" ? "완료된 항목이 없습니다." : "항목이 없습니다."}
          </p>
        ) : (
          items.map((item) => (
            <ActionItemCard
              key={item.id}
              item={item}
              updating={updatingId === item.id}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function ActionItemCard({
  item,
  updating,
  onDragStart,
  onDragEnd,
  onStatusChange,
  onDelete
}: {
  item: ActionItemWithMeeting;
  updating: boolean;
  onDragStart: (event: DragEvent<HTMLDivElement>, item: ActionItemWithMeeting) => void;
  onDragEnd: () => void;
  onStatusChange: (item: ActionItemWithMeeting, status: ActionStatus) => void | Promise<void>;
  onDelete: (item: ActionItemWithMeeting) => void | Promise<void>;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const suppressClickRef = useRef(false);

  const statusOptions = columns.filter((column) => column.status !== item.status);
  const dueState = getDueState(item.due_date, item.status);

  function handleDragStart(event: DragEvent<HTMLDivElement>) {
    suppressClickRef.current = true;
    onDragStart(event, item);
  }

  function handleDragEnd() {
    onDragEnd();
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  }

  return (
    <div
      draggable={!updating}
      onClick={() => {
        if (suppressClickRef.current) return;
        router.push(`/meetings/${item.meeting_id}`);
      }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className="cursor-pointer rounded-md border border-border bg-white p-3 shadow-sm transition hover:border-slate-300 hover:bg-[#fbfbfc] hover:shadow-md active:cursor-grabbing"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <p className="line-clamp-3 min-h-10 text-sm font-medium leading-5">{item.description}</p>
        <div className="relative">
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-[#f0f0f2] hover:text-slate-900"
            aria-label="액션 아이템 더보기"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setMenuOpen((current) => !current);
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-8 z-30 w-36 rounded-md border border-border bg-white p-1 text-sm shadow-lg">
              <p className="px-2 py-1 text-xs font-medium text-slate-400">상태변경</p>
              {statusOptions.map((option) => (
                <button
                  key={option.status}
                  type="button"
                  disabled={updating}
                  className="flex w-full items-center rounded px-2 py-2 text-left hover:bg-slate-50 disabled:opacity-50"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setMenuOpen(false);
                    void onStatusChange(item, option.status);
                  }}
                >
                  {option.title}
                </button>
              ))}
              <button
                type="button"
                disabled={updating}
                className="mt-1 flex w-full items-center gap-2 rounded px-2 py-2 text-left text-red-600 hover:bg-red-50 disabled:opacity-50"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setMenuOpen(false);
                  void onDelete(item);
                }}
              >
                <Trash2 className="h-4 w-4" />
                삭제
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {item.source_text ? (
        <p className="mt-3 line-clamp-2 rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs leading-5 text-slate-500">
          {item.source_text}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <PriorityBadge priority={item.priority} />
        <span className={`shrink-0 whitespace-nowrap rounded px-2 py-1 font-medium ${dueState.className}`}>{dueState.label}</span>
        <span className="min-w-0 truncate font-medium text-slate-700">{item.assignee || "담당자 미정"}</span>
      </div>
    </div>
  );
}

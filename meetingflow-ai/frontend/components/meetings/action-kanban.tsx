"use client";

import { CheckCircle2, CircleDot, Clock3, RotateCcw } from "lucide-react";
import Link from "next/link";
import type { DragEvent } from "react";
import { useState } from "react";

import { PriorityBadge, StatusBadge } from "@/components/meetings/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { confidenceLabel, formatDate } from "@/lib/utils";
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
  onStatusChange
}: {
  items: ActionItemWithMeeting[];
  updatingId: number | null;
  onStatusChange: (item: ActionItemWithMeeting, status: ActionStatus) => void | Promise<void>;
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
  onStatusChange
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
}) {
  return (
    <Card
      className={`${status === "done" ? "bg-white/62" : ""} ${
        isDragOver ? "border-blue-300 shadow-[0_18px_50px_rgba(66,133,244,0.18)]" : ""
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
          <span className="ai-pill rounded-md px-2 py-1 text-xs font-medium text-slate-600">{items.length}</span>
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
  onStatusChange
}: {
  item: ActionItemWithMeeting;
  updating: boolean;
  onDragStart: (event: DragEvent<HTMLDivElement>, item: ActionItemWithMeeting) => void;
  onDragEnd: () => void;
  onStatusChange: (item: ActionItemWithMeeting, status: ActionStatus) => void | Promise<void>;
}) {
  return (
    <div
      draggable={!updating}
      onDragStart={(event) => onDragStart(event, item)}
      onDragEnd={onDragEnd}
      className="cursor-grab rounded-md border border-white/70 bg-white/78 p-3 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <p className="line-clamp-2 min-h-10 text-sm font-medium leading-5">{item.description}</p>
        <PriorityBadge priority={item.priority} />
      </div>

      <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1 text-xs text-slate-500">
        <StatusBadge status={item.status} />
        <span className="truncate">{item.assignee || "담당자 미정"}</span>
        <span className="whitespace-nowrap rounded bg-slate-100/80 px-2 py-1 text-slate-600">마감 {formatDate(item.due_date)}</span>
      </div>

      <Link href={`/meetings/${item.meeting_id}`} className="mt-3 block truncate text-xs font-medium text-slate-600 hover:underline">
        {item.meeting_title}
      </Link>

      <p className="mt-2 whitespace-nowrap text-xs text-slate-500">AI 신뢰도 {confidenceLabel(item.confidence)}</p>

      {item.source_text ? (
        <p className="mt-3 line-clamp-2 rounded border border-slate-200/70 bg-white/60 px-2 py-1.5 text-xs leading-5 text-slate-500">
          {item.source_text}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {item.status === "pending" ? (
          <Button variant="secondary" className="h-8" disabled={updating} onClick={() => onStatusChange(item, "in_progress")}>
            <Clock3 className="h-4 w-4" />
            시작
          </Button>
        ) : null}
        {item.status !== "done" ? (
          <Button className="h-8" disabled={updating} onClick={() => onStatusChange(item, "done")}>
            <CheckCircle2 className="h-4 w-4" />
            완료
          </Button>
        ) : (
          <Button variant="secondary" className="h-8" disabled={updating} onClick={() => onStatusChange(item, "pending")}>
            <RotateCcw className="h-4 w-4" />
            다시 열기
          </Button>
        )}
      </div>
    </div>
  );
}

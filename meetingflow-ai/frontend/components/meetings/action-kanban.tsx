"use client";

import { CheckCircle2, CircleDot, Clock3, RotateCcw } from "lucide-react";
import Link from "next/link";

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
  onStatusChange: (item: ActionItemWithMeeting, status: ActionStatus) => void;
}) {
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
  onStatusChange
}: {
  status: ActionStatus;
  title: string;
  description: string;
  icon: typeof CircleDot;
  items: ActionItemWithMeeting[];
  updatingId: number | null;
  onStatusChange: (item: ActionItemWithMeeting, status: ActionStatus) => void;
}) {
  return (
    <Card className={status === "done" ? "bg-slate-50" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {title}
            </CardTitle>
            <p className="mt-2 text-xs text-slate-500">{description}</p>
          </div>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{items.length}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-slate-500">
            {status === "done" ? "완료된 항목이 없습니다." : "항목이 없습니다."}
          </p>
        ) : (
          items.map((item) => (
            <ActionItemCard key={item.id} item={item} updating={updatingId === item.id} onStatusChange={onStatusChange} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function ActionItemCard({
  item,
  updating,
  onStatusChange
}: {
  item: ActionItemWithMeeting;
  updating: boolean;
  onStatusChange: (item: ActionItemWithMeeting, status: ActionStatus) => void;
}) {
  return (
    <div className="rounded-md border border-border bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium leading-5">{item.description}</p>
        <PriorityBadge priority={item.priority} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <StatusBadge status={item.status} />
        <span>{item.assignee || "담당자 미정"}</span>
        <span>마감 {formatDate(item.due_date)}</span>
      </div>

      <Link href={`/meetings/${item.meeting_id}`} className="mt-3 block text-xs font-medium text-slate-600 hover:underline">
        {item.meeting_title}
      </Link>

      <p className="mt-2 text-xs text-slate-500">AI 신뢰도 {confidenceLabel(item.confidence)}</p>

      {item.source_text ? (
        <p className="mt-3 line-clamp-2 rounded bg-slate-50 px-2 py-1.5 text-xs leading-5 text-slate-500">{item.source_text}</p>
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

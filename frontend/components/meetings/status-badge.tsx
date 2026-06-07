import { Badge } from "@/components/ui/badge";
import type { ActionPriority, ActionStatus } from "@/types";

export function PriorityBadge({ priority }: { priority: ActionPriority }) {
  const tone = priority === "high" ? "red" : priority === "medium" ? "yellow" : "neutral";
  const label = priority === "high" ? "높음" : priority === "medium" ? "중간" : "낮음";
  return <Badge tone={tone}>{label}</Badge>;
}

export function StatusBadge({ status }: { status: ActionStatus }) {
  const tone = status === "done" ? "green" : status === "in_progress" ? "blue" : "neutral";
  const label = status === "done" ? "완료" : status === "in_progress" ? "진행중" : "대기";
  return <Badge tone={tone}>{label}</Badge>;
}

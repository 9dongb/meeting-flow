"use client";

import { CheckCircle2, RotateCcw, Save, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { PriorityBadge, StatusBadge } from "@/components/meetings/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Feedback, LoadingState } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { confidenceLabel } from "@/lib/utils";
import type { ActionItem, ActionPriority, ActionStatus } from "@/types";

export default function ActionItemsPage() {
  const params = useParams<{ id: string }>();
  const meetingId = Number(params.id);
  const [items, setItems] = useState<ActionItem[]>([]);
  const [view, setView] = useState<"active" | "completed">("active");
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  const activeItems = items.filter((item) => item.status !== "done");
  const completedItems = items.filter((item) => item.status === "done");
  const visibleItems = view === "active" ? activeItems : completedItems;

  useEffect(() => {
    if (!meetingId) return;
    api
      .listActionItems(meetingId)
      .then(setItems)
      .catch((err: Error) => setMessage({ type: "error", text: err.message }))
      .finally(() => setLoading(false));
  }, [meetingId]);

  async function updateItem(item: ActionItem) {
    setSavingId(item.id);
    setMessage(null);
    try {
      const updated = await api.updateActionItem(item.id, item);
      setItems((current) => current.map((candidate) => (candidate.id === updated.id ? updated : candidate)));
      setMessage({ type: "success", text: "수정되었습니다." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "수정에 실패했습니다." });
    } finally {
      setSavingId(null);
    }
  }

  async function deleteItem(id: number) {
    setSavingId(id);
    setMessage(null);
    try {
      await api.deleteActionItem(id);
      setItems((current) => current.filter((item) => item.id !== id));
      setMessage({ type: "success", text: "삭제되었습니다." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "삭제에 실패했습니다." });
    } finally {
      setSavingId(null);
    }
  }

  async function markDone(item: ActionItem) {
    await updateItem({ ...item, status: "done" });
    setView("active");
  }

  async function reopenItem(item: ActionItem) {
    await updateItem({ ...item, status: "pending" });
    setView("active");
  }

  function patchLocal(id: number, patch: Partial<ActionItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  return (
    <AppShell>
      <div className="mb-8">
        <p className="text-sm font-medium text-slate-500">Action Review</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-normal">액션 아이템 검토</h1>
      </div>

      {message ? <Feedback variant={message.type} className="mb-5">{message.text}</Feedback> : null}

      <Card>
        <CardHeader>
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <CardTitle>담당자별 할 일</CardTitle>
              <p className="mt-2 text-sm text-slate-500">
                미완료 항목을 기본 작업대로 보고, 완료된 항목은 별도 목록에서 확인합니다.
              </p>
            </div>
            <div className="inline-flex rounded-md border border-border bg-white p-1">
              <button
                className={`rounded px-3 py-1.5 text-sm font-medium ${view === "active" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                onClick={() => setView("active")}
              >
                미완료 {activeItems.length}
              </button>
              <button
                className={`rounded px-3 py-1.5 text-sm font-medium ${view === "completed" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                onClick={() => setView("completed")}
              >
                완료 {completedItems.length}
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {loading ? (
            <div className="p-5">
              <LoadingState>액션 아이템을 불러오는 중입니다.</LoadingState>
            </div>
          ) : (
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead className="border-b border-border bg-slate-50 text-left text-xs font-medium text-slate-500">
              <tr>
                <th className="px-4 py-3">담당자</th>
                <th className="px-4 py-3">할 일</th>
                <th className="px-4 py-3">마감일</th>
                <th className="px-4 py-3">우선순위</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">AI 신뢰도</th>
                <th className="px-4 py-3">원문 근거</th>
                <th className="px-4 py-3">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleItems.map((item) => (
                <tr key={item.id} className="bg-white align-top">
                  <td className="px-4 py-3">
                    <Input value={item.assignee ?? ""} onChange={(event) => patchLocal(item.id, { assignee: event.target.value })} />
                  </td>
                  <td className="px-4 py-3">
                    <Input value={item.description} onChange={(event) => patchLocal(item.id, { description: event.target.value })} />
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="date"
                      value={item.due_date ?? ""}
                      onChange={(event) => patchLocal(item.id, { due_date: event.target.value || null })}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="h-10 rounded-md border border-border bg-white px-2"
                      value={item.priority}
                      onChange={(event) => patchLocal(item.id, { priority: event.target.value as ActionPriority })}
                    >
                      <option value="low">낮음</option>
                      <option value="medium">중간</option>
                      <option value="high">높음</option>
                    </select>
                    <div className="mt-2">
                      <PriorityBadge priority={item.priority} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {view === "completed" ? (
                      <StatusBadge status={item.status} />
                    ) : (
                      <>
                        <select
                          className="h-10 rounded-md border border-border bg-white px-2"
                          value={item.status}
                          onChange={(event) => patchLocal(item.id, { status: event.target.value as ActionStatus })}
                        >
                          <option value="pending">대기</option>
                          <option value="in_progress">진행중</option>
                        </select>
                        <div className="mt-2">
                          <StatusBadge status={item.status} />
                        </div>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{confidenceLabel(item.confidence)}</td>
                  <td className="max-w-xs px-4 py-3 text-xs leading-5 text-slate-500">{item.source_text || "근거 없음"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {view === "completed" ? (
                        <Button variant="secondary" title="다시 열기" disabled={savingId === item.id} onClick={() => reopenItem(item)}>
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      ) : (
                        <>
                          <Button variant="secondary" title="저장" disabled={savingId === item.id} onClick={() => updateItem(item)}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button variant="secondary" title="완료" disabled={savingId === item.id} onClick={() => markDone(item)}>
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button variant="danger" title="삭제" disabled={savingId === item.id} onClick={() => deleteItem(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
          {!loading && visibleItems.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-500">
              {view === "active" ? "진행 중인 액션 아이템이 없습니다." : "완료된 액션 아이템이 없습니다."}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </AppShell>
  );
}

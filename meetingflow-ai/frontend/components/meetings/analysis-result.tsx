import { Mail } from "lucide-react";

import { PriorityBadge } from "@/components/meetings/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { confidenceLabel } from "@/lib/utils";
import type { MeetingAnalysisResult } from "@/types";

export function AnalysisResult({ result }: { result: MeetingAnalysisResult }) {
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>회의 요약</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="leading-7 text-slate-700">{result.summary}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>주요 논의 내용</CardTitle>
          </CardHeader>
          <CardContent>
            {result.topics.length === 0 ? (
              <p className="text-sm text-slate-500">저장된 주요 논의 내용이 없습니다.</p>
            ) : (
              <ul className="space-y-2 text-sm text-slate-700">
                {result.topics.map((topic) => (
                  <li key={topic}>- {topic}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>결정사항</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.decisions.length === 0 ? (
              <p className="text-sm text-slate-500">결정사항이 없습니다.</p>
            ) : (
              result.decisions.map((decision) => (
                <div key={decision.content} className="rounded-md border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{decision.content}</p>
                    <Badge tone="green">{confidenceLabel(decision.confidence)}</Badge>
                  </div>
                  {decision.reason ? <p className="mt-2 text-sm text-slate-500">{decision.reason}</p> : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>액션 아이템</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {result.action_items.length === 0 ? (
            <p className="text-sm text-slate-500">액션 아이템이 없습니다.</p>
          ) : (
            result.action_items.map((item) => (
              <div key={item.description} className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-[1fr_auto]">
                <div>
                  <p className="text-sm font-medium">{item.description}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    담당: {item.assignee || "미정"} · 마감: {item.due_date || "미정"} · 신뢰도 {confidenceLabel(item.confidence)}
                  </p>
                </div>
                <PriorityBadge priority={item.priority} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>후속 확인 사항</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.unresolved_issues.length === 0 ? (
              <p className="text-sm text-slate-500">후속 확인 사항이 없습니다.</p>
            ) : (
              result.unresolved_issues.map((issue) => (
                <div key={issue.content} className="rounded-md border border-border p-3">
                  <p className="text-sm font-medium">{issue.content}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    담당: {issue.owner || "미정"} · 다음 단계: {issue.next_step || "미정"}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              후속 메일 초안
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-semibold">{result.follow_up_email.subject}</p>
            <pre className="mt-3 whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">
              {result.follow_up_email.body}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

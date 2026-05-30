import { AlertTriangle, Mail } from "lucide-react";

import { PriorityBadge } from "@/components/meetings/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { confidenceLabel, formatDate } from "@/lib/utils";
import type { MeetingAnalysisResult } from "@/types";

export function AnalysisResult({ result }: { result: MeetingAnalysisResult }) {
  const isAnalyzable = result.is_analyzable ?? true;
  const participants = result.participants ?? [];

  if (!isAnalyzable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            분석 불가능한 회의록
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-slate-600">
            {result.analysis_failure_reason || "입력이나 맥락이 부족해 요약을 포함한 핵심 항목을 신뢰할 수 없습니다."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>회의 정보</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm text-slate-700 md:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-slate-500">회의록 제목</p>
            <p className="mt-1 font-medium">{result.meeting_title || "추출된 제목 없음"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">회의 날짜</p>
            <p className="mt-1 font-medium">{formatDate(result.meeting_date)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">참석자</p>
            {participants.length === 0 ? (
              <p className="mt-1 font-medium">참석자 없음</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {participants.map((participant, index) => (
                  <li key={`${participant.name}-${participant.email ?? index}`}>
                    <p className="font-medium">{participant.name}</p>
                    {participant.email ? <p className="truncate text-xs text-slate-500">{participant.email}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

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

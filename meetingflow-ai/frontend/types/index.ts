export type ActionPriority = "low" | "medium" | "high";
export type ActionStatus = "pending" | "in_progress" | "done";

export interface User {
  id: number;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  user: User;
}

export interface Participant {
  id?: number;
  name: string;
  email?: string | null;
}

export interface Decision {
  id: number;
  content: string;
  reason?: string | null;
  source_text?: string | null;
  confidence: number;
}

export interface ActionItem {
  id: number;
  meeting_id: number;
  assignee?: string | null;
  description: string;
  due_date?: string | null;
  priority: ActionPriority;
  status: ActionStatus;
  confidence: number;
  source_text?: string | null;
}

export interface ActionItemWithMeeting extends ActionItem {
  meeting_title: string;
  meeting_date?: string | null;
}

export interface UnresolvedIssue {
  id: number;
  content: string;
  owner?: string | null;
  next_step?: string | null;
  source_text?: string | null;
}

export interface FollowUpEmailDraft {
  id: number;
  subject: string;
  body: string;
  recipients?: string[] | null;
  created_at: string;
}

export interface Meeting {
  id: number;
  user_id: number;
  title: string;
  project_name?: string | null;
  meeting_date?: string | null;
  transcript: string;
  summary?: string | null;
  created_at: string;
  updated_at: string;
  participants: Participant[];
  decisions?: Decision[];
  action_items?: ActionItem[];
  unresolved_issues?: UnresolvedIssue[];
  follow_up_email_drafts?: FollowUpEmailDraft[];
}

export interface MeetingCreatePayload {
  title: string;
  project_name?: string | null;
  meeting_date?: string | null;
  transcript: string;
  participants: Array<{ name: string; email?: string | null }>;
}

export interface MeetingAnalysisResult {
  summary: string;
  topics: string[];
  decisions: Array<{
    content: string;
    reason?: string | null;
    source_text?: string | null;
    confidence: number;
  }>;
  action_items: Array<{
    assignee?: string | null;
    description: string;
    due_date?: string | null;
    priority: ActionPriority;
    confidence: number;
    source_text?: string | null;
  }>;
  unresolved_issues: Array<{
    content: string;
    owner?: string | null;
    next_step?: string | null;
    source_text?: string | null;
  }>;
  follow_up_email: {
    subject: string;
    body: string;
    recipients: string[];
  };
}

export interface MockIntegrationResponse {
  message: string;
  requires_user_approval: boolean;
  log: {
    id: number;
    integration_type: "notion" | "google_calendar" | "gmail" | "markdown";
    status: "mock_success" | "mock_failed";
    payload_json: Record<string, unknown>;
    created_at: string;
  };
}

export interface MarkdownExportResponse {
  markdown: string;
  log: MockIntegrationResponse["log"];
}

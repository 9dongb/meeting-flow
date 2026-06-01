export type ActionPriority = "low" | "medium" | "high";
export type ActionStatus = "pending" | "in_progress" | "done";

export interface User {
  id: number;
  name: string;
  email: string;
  active_team_id?: number | null;
  created_at: string;
}

export interface Team {
  id: number;
  name: string;
  invite_code: string;
  role: string;
  member_count: number;
  members: TeamMember[];
  created_at: string;
}

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
  joined_at: string;
}

export interface GoogleCalendarStatus {
  connected: boolean;
  sync_enabled: boolean;
  permission_granted: boolean;
  email?: string | null;
  calendar_id: string;
  synced_count: number;
  failed_count: number;
  skipped_count: number;
  last_error?: string | null;
}

export interface NotionStatus {
  connected: boolean;
  workspace_name?: string | null;
  owner_email?: string | null;
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
  calendar_sync_status?: string | null;
  calendar_sync_error?: string | null;
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
  team_id?: number | null;
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

export interface MeetingUpdatePayload {
  title?: string;
  project_name?: string | null;
  meeting_date?: string | null;
  transcript?: string;
  participants?: Array<{ name: string; email?: string | null }>;
}

export interface MeetingAnalysisUpdatePayload {
  title: string;
  meeting_date?: string | null;
  summary: string;
  participants: Array<{ name: string; email?: string | null }>;
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
    status: ActionStatus;
    confidence: number;
    source_text?: string | null;
  }>;
  unresolved_issues: Array<{
    content: string;
    owner?: string | null;
    next_step?: string | null;
    source_text?: string | null;
  }>;
}

export interface MeetingAnalysisResult {
  is_analyzable: boolean;
  analysis_failure_reason?: string | null;
  meeting_title?: string | null;
  meeting_date?: string | null;
  participants: Array<{
    name: string;
    email?: string | null;
    role?: string | null;
    source_text?: string | null;
    confidence: number;
  }>;
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
    status: "mock_success" | "mock_failed" | "success" | "failed";
    payload_json: Record<string, unknown>;
    created_at: string;
  };
}

export interface MarkdownExportResponse {
  markdown: string;
  log: MockIntegrationResponse["log"];
}

export interface NotionDraftResponse {
  page_id: string;
  url?: string | null;
  log: MockIntegrationResponse["log"];
}

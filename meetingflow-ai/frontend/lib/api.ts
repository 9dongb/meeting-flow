import type {
  ActionItem,
  ActionItemWithMeeting,
  ActionStatus,
  AuthResponse,
  GoogleCalendarStatus,
  MarkdownExportResponse,
  Meeting,
  MeetingAnalysisResult,
  MeetingCreatePayload,
  MeetingUpdatePayload,
  MockIntegrationResponse,
  Team
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
    cache: "no-store"
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "요청 처리 중 오류가 발생했습니다." }));
    throw new ApiError(toErrorMessage(error.detail), response.status, error.detail);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  register(email: string, password: string) {
    return request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
  },
  login(email: string, password: string) {
    return request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
  },
  me() {
    return request<AuthResponse["user"]>("/auth/me");
  },
  logout() {
    return request<void>("/auth/logout", { method: "POST" });
  },
  getCurrentTeam() {
    return request<Team>("/teams/current");
  },
  updateCurrentTeam(name: string) {
    return request<Team>("/teams/current", {
      method: "PATCH",
      body: JSON.stringify({ name })
    });
  },
  joinTeam(inviteCode: string) {
    return request<Team>("/teams/join", {
      method: "POST",
      body: JSON.stringify({ invite_code: inviteCode })
    });
  },
  getGoogleCalendarStatus() {
    return request<GoogleCalendarStatus>("/integrations/google-calendar/status");
  },
  updateGoogleCalendarSettings(payload: { sync_enabled?: boolean; calendar_id?: string }) {
    return request<GoogleCalendarStatus>("/integrations/google-calendar/settings", {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },
  syncGoogleCalendarNow() {
    return request<GoogleCalendarStatus>("/integrations/google-calendar/sync", { method: "POST" });
  },
  listMeetings() {
    return request<Meeting[]>("/meetings");
  },
  createMeeting(payload: MeetingCreatePayload) {
    return request<Meeting>("/meetings", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  getMeeting(id: number) {
    return request<Meeting>(`/meetings/${id}`);
  },
  updateMeeting(id: number, payload: MeetingUpdatePayload) {
    return request<Meeting>(`/meetings/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },
  deleteMeeting(id: number) {
    return request<void>(`/meetings/${id}`, { method: "DELETE" });
  },
  analyzeMeeting(id: number) {
    return request<MeetingAnalysisResult>(`/meetings/${id}/analyze`, { method: "POST" });
  },
  listActionItems(meetingId: number) {
    return request<ActionItem[]>(`/meetings/${meetingId}/action-items`);
  },
  listAllActionItems() {
    return request<ActionItemWithMeeting[]>("/action-items");
  },
  updateActionItem(id: number, payload: Partial<ActionItem> & { status?: ActionStatus }) {
    return request<ActionItem>(`/action-items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },
  deleteActionItem(id: number) {
    return request<void>(`/action-items/${id}`, { method: "DELETE" });
  },
  exportMarkdown(meetingId: number) {
    return request<MarkdownExportResponse>(`/meetings/${meetingId}/export/markdown`, { method: "POST" });
  },
  notionMock(meetingId: number) {
    return request<MockIntegrationResponse>(`/meetings/${meetingId}/integrations/notion/mock`, {
      method: "POST"
    });
  },
  calendarMock(meetingId: number) {
    return request<MockIntegrationResponse>(`/meetings/${meetingId}/integrations/google-calendar/mock`, {
      method: "POST"
    });
  },
  gmailMock(meetingId: number) {
    return request<MockIntegrationResponse>(`/meetings/${meetingId}/integrations/gmail/mock`, {
      method: "POST"
    });
  }
};

function toErrorMessage(detail: unknown) {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (item && typeof item === "object" && "msg" in item) {
          return String(item.msg);
        }
        return String(item);
      })
      .join(" ");
  }
  return "요청 처리 중 오류가 발생했습니다.";
}

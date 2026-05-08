import { getTokenClient } from "@/lib/getTokenClient";

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING_USER" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type TicketUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

export type SupportTicket = {
  ticket_id: string;
  conversation_id: string;
  status: TicketStatus;
  priority: TicketPriority;
  subject: string;
  summary: string;
  user: TicketUser | null;
  guest_identifier: string | null;
  last_message_at: string;
  unread_count: number;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
};

export type SupportTicketListResponse = {
  items: SupportTicket[];
  page: number;
  limit: number;
  total: number;
};

export type SupportConversation = Record<string, unknown> | null;

export type SupportMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  message: string;
  message_type: "text" | "escalation_prompt" | "escalation_confirmation" | "system_note";
  created_at: string;
};

export type SupportTicketDetailResponse = {
  ticket: SupportTicket;
  conversation: SupportConversation;
  messages: SupportMessage[];
};

export type SupportReplyResponse = {
  success: boolean;
  ticket: SupportTicket;
};

export type SupportPatchPayload = {
  status?: TicketStatus;
  priority?: TicketPriority;
  assigned_to?: string | null;
};

export type SupportStats = {
  open: number;
  in_progress: number;
  waiting_user: number;
  resolved_today: number;
  avg_first_response_seconds: number | null;
};

export class SupportAdminApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "SupportAdminApiError";
    this.status = status;
  }
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
  "";

function buildUrl(path: string): string {
  if (!API_BASE_URL) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getTokenClient();
  if (!token) {
    throw new SupportAdminApiError("Not authenticated", 401);
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const maybeMessage =
      typeof data === "object" && data && "error" in data
        ? String((data as { error?: string }).error || "")
        : "";
    throw new SupportAdminApiError(
      maybeMessage || `Request failed (${response.status})`,
      response.status
    );
  }

  return data as T;
}

export async function listSupportTickets(params: {
  status?: TicketStatus;
  priority?: TicketPriority;
  assigned_to?: string;
  search?: string;
  page: number;
  limit: number;
}): Promise<SupportTicketListResponse> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.priority) qs.set("priority", params.priority);
  if (params.assigned_to) qs.set("assigned_to", params.assigned_to);
  if (params.search) qs.set("search", params.search);
  qs.set("page", String(params.page));
  qs.set("limit", String(params.limit));

  return request<SupportTicketListResponse>(`/api/support-admin/tickets?${qs.toString()}`);
}

export async function getSupportTicketDetail(ticketId: string): Promise<SupportTicketDetailResponse> {
  return request<SupportTicketDetailResponse>(`/api/support-admin/tickets/${ticketId}`);
}

export async function replySupportTicket(ticketId: string, message: string): Promise<SupportReplyResponse> {
  return request<SupportReplyResponse>(`/api/support-admin/tickets/${ticketId}/reply`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export async function patchSupportTicket(ticketId: string, patch: SupportPatchPayload): Promise<{ ticket: SupportTicket }> {
  return request<{ ticket: SupportTicket }>(`/api/support-admin/tickets/${ticketId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function closeSupportTicket(ticketId: string): Promise<{ success?: boolean; ticket: SupportTicket }> {
  return request<{ success?: boolean; ticket: SupportTicket }>(`/api/support-admin/tickets/${ticketId}/close`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getSupportStats(): Promise<SupportStats> {
  try {
    return await request<SupportStats>("/api/support-admin/tickets/stats");
  } catch (error) {
    if (error instanceof SupportAdminApiError && error.status === 404) {
      return request<SupportStats>("/api/support-admin/stats");
    }
    throw error;
  }
}

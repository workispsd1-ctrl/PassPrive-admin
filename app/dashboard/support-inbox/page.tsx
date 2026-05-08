"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Inbox, Loader2, RefreshCcw, Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import {
  closeSupportTicket,
  getSupportStats,
  getSupportTicketDetail,
  listSupportTickets,
  patchSupportTicket,
  replySupportTicket,
  SupportAdminApiError,
  SupportMessage,
  SupportTicket,
  SupportStats,
  TicketPriority,
  TicketStatus,
} from "@/lib/supportAdminClient";

const STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_USER", "RESOLVED", "CLOSED"];
const PRIORITIES: TicketPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];

const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING_USER: "Waiting User",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};
const STATUS_CHIP_CLASS: Record<TicketStatus, string> = {
  OPEN: "bg-sky-50 text-sky-700 border-sky-200",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200",
  WAITING_USER: "bg-orange-50 text-orange-700 border-orange-200",
  RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CLOSED: "bg-slate-100 text-slate-600 border-slate-200",
};
const PRIORITY_CHIP_CLASS: Record<TicketPriority, string> = {
  LOW: "bg-slate-100 text-slate-600 border-slate-200",
  NORMAL: "bg-blue-50 text-blue-700 border-blue-200",
  HIGH: "bg-amber-50 text-amber-700 border-amber-200",
  URGENT: "bg-rose-50 text-rose-700 border-rose-200",
};

type PendingRetry = { ticketId: string; text: string } | null;

function formatLocal(iso?: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString();
}

function fromNow(iso?: string | null): string {
  if (!iso) return "-";
  const delta = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(delta / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function SupportInboxPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<SupportStats | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [pendingRetry, setPendingRetry] = useState<PendingRetry>(null);
  const [statusFilter, setStatusFilter] = useState<"" | TicketStatus>("");
  const [priorityFilter, setPriorityFilter] = useState<"" | TicketPriority>("");
  const [assignedFilter, setAssignedFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [assigneeInput, setAssigneeInput] = useState("");
  const [scrollPinned, setScrollPinned] = useState(true);

  const listPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const detailPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const guardAuth = useCallback((error: unknown): boolean => {
    if (error instanceof SupportAdminApiError && (error.status === 401 || error.status === 403)) {
      showToast({ title: "Access denied", description: "Please sign in as admin/superadmin.", type: "error" });
      router.replace("/sign-in");
      return true;
    }
    return false;
  }, [router]);

  const loadStats = useCallback(async () => {
    try {
      const data = await getSupportStats();
      setStats(data);
    } catch (error) {
      if (!guardAuth(error)) {
        showToast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load support stats.",
          type: "error",
        });
      }
    }
  }, [guardAuth]);

  const loadTickets = useCallback(async (showLoading = false) => {
    if (showLoading) setLoadingList(true);
    try {
      const data = await listSupportTickets({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        assigned_to: assignedFilter.trim() || undefined,
        search: search.trim() || undefined,
        page,
        limit,
      });
      setTickets(data.items || []);
      setTotal(data.total || 0);
      if (selectedId && !data.items.some((item) => item.ticket_id === selectedId)) {
        setSelectedId(null);
        setSelectedTicket(null);
        setMessages([]);
      }
    } catch (error) {
      if (!guardAuth(error)) {
        showToast({ title: "Error", description: "Failed to load tickets.", type: "error" });
      }
    } finally {
      if (showLoading) setLoadingList(false);
    }
  }, [assignedFilter, guardAuth, limit, page, priorityFilter, search, selectedId, statusFilter]);

  const loadTicketDetail = useCallback(
    async (ticketId: string, showLoading = false) => {
      if (showLoading) setLoadingDetail(true);
      try {
        const data = await getSupportTicketDetail(ticketId);
        setSelectedTicket(data.ticket);
        setMessages(data.messages || []);
        setAssigneeInput(data.ticket.assigned_to || "");
      } catch (error) {
        if (!guardAuth(error)) {
          showToast({ title: "Error", description: "Failed to load ticket conversation.", type: "error" });
        }
      } finally {
        if (showLoading) setLoadingDetail(false);
      }
    },
    [guardAuth]
  );

  useEffect(() => {
    void loadTickets(true);
    void loadStats();
  }, [loadTickets, loadStats]);

  useEffect(() => {
    if (listPollRef.current) clearInterval(listPollRef.current);
    listPollRef.current = setInterval(() => {
      void loadTickets(false);
      void loadStats();
    }, 5000);
    return () => {
      if (listPollRef.current) clearInterval(listPollRef.current);
    };
  }, [loadTickets, loadStats]);

  useEffect(() => {
    if (detailPollRef.current) clearInterval(detailPollRef.current);
    if (!selectedId) return;
    detailPollRef.current = setInterval(() => {
      void loadTicketDetail(selectedId, false);
    }, 2500);
    return () => {
      if (detailPollRef.current) clearInterval(detailPollRef.current);
    };
  }, [selectedId, loadTicketDetail]);

  useEffect(() => {
    if (!scrollPinned) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, scrollPinned]);

  const handleOpenTicket = async (ticketId: string) => {
    setSelectedId(ticketId);
    setScrollPinned(true);
    await loadTicketDetail(ticketId, true);
  };

  const handleThreadScroll = () => {
    const el = threadRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setScrollPinned(nearBottom);
  };

  const sendReply = async (messageText?: string) => {
    const text = (messageText ?? replyText).trim();
    if (!selectedId || !text || sending) return;
    setReplyText("");
    setSending(true);
    setPendingRetry(null);
    const optimistic: SupportMessage = {
      id: `temp-${Date.now()}`,
      role: "assistant",
      message: text,
      message_type: "text",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const response = await replySupportTicket(selectedId, text);
      if (!response.success) throw new Error("Reply failed.");
      await loadTicketDetail(selectedId, false);
      await loadTickets(false);
    } catch (error) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setReplyText(text);
      setPendingRetry({ ticketId: selectedId, text });
      if (!guardAuth(error)) {
        showToast({ title: "Send failed", description: "Reply failed. Please retry.", type: "error" });
      }
    } finally {
      setSending(false);
    }
  };

  const patchTicket = async (patch: { status?: TicketStatus; priority?: TicketPriority; assigned_to?: string | null }) => {
    if (!selectedId) return;
    try {
      const data =
        patch.status === "CLOSED"
          ? await closeSupportTicket(selectedId)
          : await patchSupportTicket(selectedId, patch);
      setSelectedTicket(data.ticket);
      setTickets((prev) => prev.map((item) => (item.ticket_id === data.ticket.ticket_id ? data.ticket : item)));
      showToast({ title: "Updated", description: "Ticket updated." });
    } catch (error) {
      if (!guardAuth(error)) {
        showToast({ title: "Error", description: "Could not update ticket.", type: "error" });
      }
    }
  };

  const pages = Math.max(1, Math.ceil(total / limit));
  const currentStats = useMemo(
    () => [
      { label: "Open", value: stats?.open ?? 0 },
      { label: "In Progress", value: stats?.in_progress ?? 0 },
      { label: "Waiting User", value: stats?.waiting_user ?? 0 },
      { label: "Resolved Today", value: stats?.resolved_today ?? 0 },
    ],
    [stats]
  );

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] gap-4">
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Inbox className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Support Inbox</h1>
            <p className="text-xs text-gray-500">{total} tickets</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => void Promise.all([loadTickets(false), loadStats()])}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {currentStats.map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs text-slate-500">{item.label}</p>
            <p className="text-2xl font-semibold text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        <section className="w-full max-w-[390px] bg-white border border-slate-200 rounded-2xl flex flex-col min-h-0 shadow-sm">
          <div className="p-3 border-b border-slate-100 space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={searchInput}
                placeholder="Search"
                className="pl-8 bg-slate-50 border-slate-200"
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  if (debounceRef.current) clearTimeout(debounceRef.current);
                  debounceRef.current = setTimeout(() => {
                    setPage(1);
                    setSearch(e.target.value);
                  }, 350);
                }}
              />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <select className="h-9 rounded-md border border-slate-200 px-2 text-sm bg-slate-50" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as "" | TicketStatus); setPage(1); }}>
                <option value="">All status</option>
                {STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}
              </select>
              <select className="h-9 rounded-md border border-slate-200 px-2 text-sm bg-slate-50" value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value as "" | TicketPriority); setPage(1); }}>
                <option value="">All priority</option>
                {PRIORITIES.map((priority) => <option key={priority} value={priority}>{PRIORITY_LABEL[priority]}</option>)}
              </select>
              <Input className="bg-slate-50 border-slate-200" placeholder="assigned_to (uuid or me)" value={assignedFilter} onChange={(e) => { setAssignedFilter(e.target.value); setPage(1); }} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {loadingList ? (
              <div className="h-full flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-gray-500" /></div>
            ) : tickets.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-500">No tickets found</div>
            ) : (
              <div className="space-y-2">
                {tickets.map((ticket) => (
                  <button
                    key={ticket.ticket_id}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border transition-all shadow-sm",
                      selectedId === ticket.ticket_id
                        ? "border-cyan-300 bg-cyan-50/70 ring-1 ring-cyan-100"
                        : "border-slate-200 hover:bg-slate-50"
                    )}
                    onClick={() => void handleOpenTicket(ticket.ticket_id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{ticket.user?.full_name || ticket.user?.email || ticket.guest_identifier || "Guest"}</p>
                      <span className="text-[10px] text-slate-500">{fromNow(ticket.last_message_at)}</span>
                    </div>
                    <p className="text-xs text-slate-600 truncate mt-1">{ticket.subject || ticket.summary || "No subject"}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={cn("text-[10px] rounded-full border px-2 py-0.5 font-medium", STATUS_CHIP_CLASS[ticket.status])}>{STATUS_LABEL[ticket.status]}</span>
                      <span className={cn("text-[10px] rounded-full border px-2 py-0.5 font-medium", PRIORITY_CHIP_CLASS[ticket.priority])}>{PRIORITY_LABEL[ticket.priority]}</span>
                      {ticket.unread_count > 0 && <span className="ml-auto text-[10px] bg-cyan-600 text-white rounded-full px-1.5 py-0.5">{ticket.unread_count}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-2 border-t border-slate-100 flex items-center justify-between">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
            <span className="text-xs text-slate-500">Page {page} / {pages}</span>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>Next</Button>
          </div>
        </section>

        <section className="flex-1 bg-white border border-slate-200 rounded-2xl flex flex-col min-h-0 shadow-sm">
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-500">Select a ticket to view conversation</div>
          ) : loadingDetail ? (
            <div className="flex-1 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-gray-500" /></div>
          ) : (
            <>
              <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold mr-3 text-slate-900">{selectedTicket?.subject || "Support Ticket"}</p>
                <select className="h-8 rounded-md border border-slate-200 px-2 text-xs bg-slate-50" value={selectedTicket?.status || "OPEN"} onChange={(e) => void patchTicket({ status: e.target.value as TicketStatus })}>
                  {STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}
                </select>
                <select className="h-8 rounded-md border border-slate-200 px-2 text-xs bg-slate-50" value={selectedTicket?.priority || "NORMAL"} onChange={(e) => void patchTicket({ priority: e.target.value as TicketPriority })}>
                  {PRIORITIES.map((priority) => <option key={priority} value={priority}>{PRIORITY_LABEL[priority]}</option>)}
                </select>
                <div className="flex items-center gap-1">
                  <Input className="h-8 w-52 text-xs border-slate-200 bg-slate-50" placeholder="Assignee UUID (blank = unassign)" value={assigneeInput} onChange={(e) => setAssigneeInput(e.target.value)} />
                  <Button size="sm" variant="outline" onClick={() => void patchTicket({ assigned_to: assigneeInput.trim() || null })}>Assign</Button>
                </div>
                <div className="ml-auto text-[11px] text-slate-500">Updated {formatLocal(selectedTicket?.updated_at)}</div>
              </div>

              <div
                ref={threadRef}
                onScroll={handleThreadScroll}
                className="flex-1 overflow-y-auto p-5 bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#f1f5f9_45%,_#eef2ff_100%)]"
              >
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-slate-500">No messages</div>
                ) : (
                  messages.map((msg) => {
                    const isUser = msg.role === "user";
                    return (
                      <div key={msg.id} className={cn("mb-3 flex", isUser ? "justify-start" : "justify-end")}>
                        <div className={cn("max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap shadow-sm", isUser ? "bg-white border border-slate-200 text-slate-900 rounded-tl-sm" : "bg-cyan-600 text-white rounded-tr-sm")}>
                          <p>{msg.message}</p>
                          <p className={cn("text-[10px] mt-1", isUser ? "text-slate-400" : "text-cyan-100")}>{formatLocal(msg.created_at)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {!scrollPinned && (
                <div className="px-4 py-1 text-center border-t border-slate-100">
                  <button className="text-xs text-cyan-700 hover:underline" onClick={() => { setScrollPinned(true); bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }}>
                    Jump to latest
                  </button>
                </div>
              )}

              <div className="p-4 border-t border-slate-100 bg-white">
                <div className="flex items-end gap-2">
                  <Textarea
                    rows={3}
                    value={replyText}
                    placeholder="Type your reply (Enter to send, Shift+Enter newline)"
                    className="border-slate-200 bg-slate-50 focus-visible:ring-cyan-500"
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendReply();
                      }
                    }}
                  />
                  <Button className="h-[76px] bg-cyan-600 hover:bg-cyan-700 text-white" disabled={sending || !replyText.trim()} onClick={() => void sendReply()}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
                {pendingRetry && pendingRetry.ticketId === selectedId && (
                  <div className="mt-2 flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-2 py-1">
                    <p className="text-xs text-red-700">Last reply failed.</p>
                    <Button size="sm" variant="outline" onClick={() => void sendReply(pendingRetry.text)}>
                      Retry
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

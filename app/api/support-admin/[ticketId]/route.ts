import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { authorizeAdmin } from "../_lib";

type RouteContext = { params: Promise<{ ticketId: string }> };

const VALID_STATUSES = new Set(["OPEN", "IN_PROGRESS", "WAITING_USER", "RESOLVED", "CLOSED"]);
const VALID_PRIORITIES = new Set(["LOW", "NORMAL", "HIGH", "URGENT"]);

async function buildTicketOut(ticket: Record<string, unknown>) {
  const userId = ticket.user_id as string | null;
  let user: { id: string; full_name: string | null; email: string | null; phone: string | null } | null = null;

  if (userId) {
    const { data: profile } = await supabaseAdmin
      .from("users")
      .select("id, full_name, email, phone")
      .eq("id", userId)
      .maybeSingle();
    user = (profile as typeof user) ?? null;
  }

  return {
    ticket_id: ticket.id as string,
    conversation_id: ticket.conversation_id as string | null,
    status: ticket.status as string,
    priority: ticket.priority as string,
    subject: ticket.subject as string | null,
    summary: ticket.summary as string | null,
    user,
    guest_identifier: ticket.guest_identifier as string | null,
    assigned_to: ticket.assigned_to as string | null,
    source: ticket.source as string | null,
    created_at: ticket.created_at as string,
    updated_at: ticket.updated_at as string,
    resolved_at: ticket.resolved_at as string | null,
    closed_at: ticket.closed_at as string | null,
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authorizeAdmin(request);
    if (auth.error) return auth.error;

    const { ticketId } = await context.params;

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from("support_tickets")
      .select(
        "id, conversation_id, user_id, guest_identifier, status, priority, subject, summary, assigned_to, source, created_at, updated_at, resolved_at, closed_at"
      )
      .eq("id", ticketId)
      .maybeSingle();

    if (ticketError) throw ticketError;
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const ticketOut = await buildTicketOut(ticket as Record<string, unknown>);

    // Load conversation
    let conversation = null;
    const convId = ticket.conversation_id as string | null;
    if (convId) {
      const { data: conv, error: convError } = await supabaseAdmin
        .from("chat_conversations")
        .select("id, user_id, guest_identifier, channel, status, handoff_requested_at, handed_off_at, metadata, created_at, updated_at")
        .eq("id", convId)
        .maybeSingle();
      if (convError) throw convError;
      conversation = conv;
    }

    // Load messages from chat_messages
    let messages: unknown[] = [];
    if (convId) {
      const { data: msgs, error: msgsError } = await supabaseAdmin
        .from("chat_messages")
        .select("id, conversation_id, role, message, message_type, model, sources, created_at")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });
      if (msgsError) throw msgsError;
      messages = msgs ?? [];
    }

    return NextResponse.json({ ticket: ticketOut, conversation, messages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch ticket";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authorizeAdmin(request);
    if (auth.error) return auth.error;

    const { ticketId } = await context.params;

    const body = (await request.json()) as {
      status?: string;
      priority?: string;
      assigned_to?: string | null;
    };

    const patch: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (!VALID_STATUSES.has(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      patch.status = body.status;
      if (body.status === "RESOLVED") patch.resolved_at = new Date().toISOString();
      if (body.status === "CLOSED") patch.closed_at = new Date().toISOString();
      // Reopen: clear resolved/closed timestamps
      if (body.status === "OPEN" || body.status === "IN_PROGRESS") {
        patch.resolved_at = null;
        patch.closed_at = null;
      }
    }

    if (body.priority !== undefined) {
      if (!VALID_PRIORITIES.has(body.priority)) {
        return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
      }
      patch.priority = body.priority;
    }

    if ("assigned_to" in body) {
      patch.assigned_to = body.assigned_to ?? null;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("support_tickets")
      .update(patch)
      .eq("id", ticketId)
      .select(
        "id, conversation_id, user_id, guest_identifier, status, priority, subject, summary, assigned_to, source, created_at, updated_at, resolved_at, closed_at"
      )
      .maybeSingle();

    if (updateError) throw updateError;
    if (!updated) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const ticketOut = await buildTicketOut(updated as Record<string, unknown>);
    return NextResponse.json({ ticket: ticketOut });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update ticket";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

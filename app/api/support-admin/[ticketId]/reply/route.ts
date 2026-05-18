import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { authorizeAdmin } from "../../_lib";

type RouteContext = { params: Promise<{ ticketId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authorizeAdmin(request);
    if (auth.error) return auth.error;

    const { ticketId } = await context.params;

    const body = (await request.json()) as { message?: string };
    const messageText = String(body.message || "").trim();
    if (!messageText) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from("support_tickets")
      .select("id, conversation_id, status")
      .eq("id", ticketId)
      .maybeSingle();

    if (ticketError) throw ticketError;
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const convId = ticket.conversation_id as string | null;
    if (!convId) {
      return NextResponse.json({ error: "Ticket has no linked conversation" }, { status: 400 });
    }

    // Insert agent reply into chat_messages
    const { data: newMessage, error: msgError } = await supabaseAdmin
      .from("chat_messages")
      .insert({
        conversation_id: convId,
        role: "assistant",
        message: messageText,
        message_type: "text",
        // model left null → signals this is an agent reply, not a bot reply
      })
      .select("id, conversation_id, role, message, message_type, model, sources, created_at")
      .single();

    if (msgError) throw msgError;

    // Advance OPEN → IN_PROGRESS on first agent reply; otherwise keep existing status
    const newStatus = ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status;

    const { data: updatedTicket, error: updateError } = await supabaseAdmin
      .from("support_tickets")
      .update({ status: newStatus })
      .eq("id", ticketId)
      .select(
        "id, conversation_id, user_id, guest_identifier, status, priority, subject, summary, assigned_to, source, created_at, updated_at, resolved_at, closed_at"
      )
      .maybeSingle();

    if (updateError) throw updateError;

    // Fetch user profile
    let user = null;
    const userId = updatedTicket?.user_id as string | null;
    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from("users")
        .select("id, full_name, email, phone")
        .eq("id", userId)
        .maybeSingle();
      user = profile ?? null;
    }

    const t = updatedTicket;
    const ticketOut = t
      ? {
          ticket_id: t.id,
          conversation_id: t.conversation_id,
          status: t.status,
          priority: t.priority,
          subject: t.subject,
          summary: t.summary,
          user,
          guest_identifier: t.guest_identifier,
          assigned_to: t.assigned_to,
          source: t.source,
          created_at: t.created_at,
          updated_at: t.updated_at,
          resolved_at: t.resolved_at,
          closed_at: t.closed_at,
        }
      : null;

    return NextResponse.json({ message: newMessage, ticket: ticketOut });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send reply";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

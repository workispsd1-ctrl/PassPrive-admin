import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { authorizeAdmin } from "./_lib";

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeAdmin(request);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || null;
    const priority = searchParams.get("priority") || null;
    const assignedTo = searchParams.get("assigned_to") || null;
    const search = searchParams.get("search")?.trim() || null;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("support_tickets")
      .select(
        "id, conversation_id, user_id, guest_identifier, status, priority, subject, summary, assigned_to, source, created_at, updated_at, resolved_at, closed_at",
        { count: "exact" }
      )
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (priority) query = query.eq("priority", priority);
    if (assignedTo === "me") {
      query = query.eq("assigned_to", auth.agent.id);
    } else if (assignedTo) {
      query = query.eq("assigned_to", assignedTo);
    }
    if (search) {
      query = query.or(`subject.ilike.%${search}%,summary.ilike.%${search}%`);
    }

    const { data: tickets, error, count } = await query;
    if (error) throw error;

    // Separately fetch user profiles (user_id refs auth.users, not public.users)
    const userIds = [
      ...new Set(
        (tickets || [])
          .map((t) => t.user_id as string | null)
          .filter(Boolean) as string[]
      ),
    ];

    const profileMap: Record<string, { id: string; full_name: string | null; email: string | null; phone: string | null }> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("users")
        .select("id, full_name, email, phone")
        .in("id", userIds);
      for (const p of profiles || []) {
        profileMap[p.id as string] = p as { id: string; full_name: string | null; email: string | null; phone: string | null };
      }
    }

    const items = (tickets || []).map((t) => ({
      ticket_id: t.id as string,
      conversation_id: t.conversation_id as string | null,
      status: t.status as string,
      priority: t.priority as string,
      subject: t.subject as string | null,
      summary: t.summary as string | null,
      user: (t.user_id ? profileMap[t.user_id as string] ?? null : null),
      guest_identifier: t.guest_identifier as string | null,
      assigned_to: t.assigned_to as string | null,
      source: t.source as string | null,
      created_at: t.created_at as string,
      updated_at: t.updated_at as string,
      resolved_at: t.resolved_at as string | null,
      closed_at: t.closed_at as string | null,
    }));

    return NextResponse.json({ items, page, limit, total: count ?? 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch tickets";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

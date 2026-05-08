import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { authorizeAdmin } from "../_lib";

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeAdmin(request);
    if (auth.error) return auth.error;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [openRes, inProgressRes, waitingRes, resolvedTodayRes] = await Promise.all([
      supabaseAdmin
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .eq("status", "OPEN"),
      supabaseAdmin
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .eq("status", "IN_PROGRESS"),
      supabaseAdmin
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .eq("status", "WAITING_USER"),
      supabaseAdmin
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .eq("status", "RESOLVED")
        .gte("updated_at", todayStart.toISOString()),
    ]);

    if (openRes.error) throw openRes.error;
    if (inProgressRes.error) throw inProgressRes.error;
    if (waitingRes.error) throw waitingRes.error;
    if (resolvedTodayRes.error) throw resolvedTodayRes.error;

    return NextResponse.json({
      open: openRes.count ?? 0,
      in_progress: inProgressRes.count ?? 0,
      waiting_user: waitingRes.count ?? 0,
      resolved_today: resolvedTodayRes.count ?? 0,
      avg_first_response_seconds: 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch stats";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

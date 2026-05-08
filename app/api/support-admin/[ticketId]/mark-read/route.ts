import { NextRequest, NextResponse } from "next/server";
import { authorizeAdmin } from "../../_lib";

type RouteContext = { params: Promise<{ ticketId: string }> };

// No unread_count column on support_tickets — this endpoint is a no-op for now.
// Unread state can be tracked client-side or via a separate read_receipts table.
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authorizeAdmin(request);
    if (auth.error) return auth.error;

    await context.params; // consume params

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

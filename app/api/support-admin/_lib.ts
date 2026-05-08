import { NextRequest, NextResponse } from "next/server";
import { supabaseFromToken } from "@/lib/supabaseHeadless";

const ALLOWED_ROLES = new Set(["admin", "superadmin"]);

function getBearerToken(request: NextRequest): string | null {
  const h = request.headers.get("authorization");
  return h?.startsWith("Bearer ") ? h.slice(7) : null;
}

type AgentInfo = { id: string; role: string; full_name: string | null };

async function resolveAgent(accessToken: string): Promise<AgentInfo | null> {
  const client = supabaseFromToken(accessToken);
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  if (authError || !user) return null;

  const { data: profile } = await client
    .from("users")
    .select("id, role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;
  return {
    id: profile.id as string,
    role: String(profile.role || "").trim().toLowerCase(),
    full_name: (profile.full_name as string) ?? null,
  };
}

type AuthResult =
  | { error: NextResponse; agent: null }
  | { error: null; agent: AgentInfo };

export async function authorizeAdmin(request: NextRequest): Promise<AuthResult> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      error: NextResponse.json(
        { error: "Missing SUPABASE_SERVICE_ROLE_KEY in server environment" },
        { status: 500 }
      ),
      agent: null,
    };
  }

  const token = getBearerToken(request);
  if (!token) {
    return {
      error: NextResponse.json({ error: "Missing authorization token" }, { status: 401 }),
      agent: null,
    };
  }

  const agent = await resolveAgent(token);
  if (!agent || !ALLOWED_ROLES.has(agent.role)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      agent: null,
    };
  }

  return { error: null, agent };
}

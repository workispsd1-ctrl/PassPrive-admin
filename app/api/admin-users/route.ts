import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseFromToken } from "@/lib/supabaseHeadless";

const ALLOWED_MANAGER_ROLES = new Set(["admin", "superadmin"]);
const ALLOWED_ASSIGNABLE_ROLES = new Set([
  "admin",
  "superadmin",
  "restaurantpartner",
  "storepartner",
  "storeowner",
  "user",
]);

type AdminUserPayload = {
  email?: string;
  password?: string;
  full_name?: string;
  phone?: string;
  role?: string;
};

async function getRequesterRole(accessToken: string) {
  const supabase = supabaseFromToken(accessToken);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  return String(profile?.role || "").trim().toLowerCase();
}

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
}

function normalizeAssignableRole(role: unknown) {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function sanitizeString(value: unknown) {
  const trimmed = String(value || "").trim();
  return trimmed.length ? trimmed : null;
}

async function authorizeManager(request: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      error: NextResponse.json(
        { error: "Missing SUPABASE_SERVICE_ROLE_KEY in server environment" },
        { status: 500 }
      ),
      role: null,
    };
  }

  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return {
      error: NextResponse.json({ error: "Missing authorization token" }, { status: 401 }),
      role: null,
    };
  }

  const requesterRole = await getRequesterRole(accessToken);
  if (!requesterRole || !ALLOWED_MANAGER_ROLES.has(requesterRole)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      role: null,
    };
  }

  return { error: null, role: requesterRole };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeManager(request);
    if (auth.error) return auth.error;

    const body = (await request.json()) as AdminUserPayload;
    const email = sanitizeString(body.email)?.toLowerCase();
    const password = String(body.password || "");
    const fullName = sanitizeString(body.full_name);
    const phone = sanitizeString(body.phone);
    const role = normalizeAssignableRole(body.role);

    if (!email || !password || !fullName || !role) {
      return NextResponse.json(
        { error: "Email, password, full name, and role are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    if (!ALLOWED_ASSIGNABLE_ROLES.has(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      phone: phone || undefined,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone,
        role,
      },
    });

    if (createError) throw createError;

    const authUserId = createdUser.user?.id;
    if (!authUserId) {
      throw new Error("User created, but missing auth user id");
    }

    const { error: profileError } = await supabaseAdmin.from("users").upsert(
      {
        id: authUserId,
        email,
        full_name: fullName,
        phone: phone || null,
        role,
      },
      { onConflict: "id" }
    );

    if (profileError) throw profileError;

    return NextResponse.json({
      ok: true,
      user: {
        id: authUserId,
        email,
        full_name: fullName,
        phone,
        role,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

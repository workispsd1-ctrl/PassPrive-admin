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

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdatePayload = {
  full_name?: string;
  phone?: string;
  role?: string;
};

async function getRequester(accessToken: string) {
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

  return {
    id: user.id,
    role: String(profile?.role || "").trim().toLowerCase(),
  };
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
      requester: null,
    };
  }

  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return {
      error: NextResponse.json({ error: "Missing authorization token" }, { status: 401 }),
      requester: null,
    };
  }

  const requester = await getRequester(accessToken);
  if (!requester || !ALLOWED_MANAGER_ROLES.has(requester.role)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      requester: null,
    };
  }

  return { error: null, requester };
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authorizeManager(request);
    if (auth.error) return auth.error;

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 });
    }

    const body = (await request.json()) as UpdatePayload;
    const fullName = sanitizeString(body.full_name);
    const phone = sanitizeString(body.phone);
    const role = normalizeAssignableRole(body.role);

    if (!fullName || !phone || !role) {
      return NextResponse.json(
        { error: "Full name, phone, and role are required" },
        { status: 400 }
      );
    }

    if (!ALLOWED_ASSIGNABLE_ROLES.has(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from("users")
      .select("id, email")
      .eq("id", id)
      .maybeSingle();

    if (existingUserError) {
      return NextResponse.json(
        { error: existingUserError.message || "Failed to load existing user", step: "load_user" },
        { status: 500 }
      );
    }
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { error: profileUpdateError } = await supabaseAdmin
      .from("users")
      .update({
        full_name: fullName,
        phone,
        role,
      })
      .eq("id", id);

    if (profileUpdateError) {
      const normalizedMessage = String(profileUpdateError.message || "");
      const roleChangeBlocked =
        normalizedMessage.toLowerCase().includes("role") &&
        normalizedMessage.toLowerCase().includes("change");

      return NextResponse.json(
        {
          error: roleChangeBlocked
            ? "Role updates are blocked by the users table trigger. Name and phone can still be edited, but role changes need the trigger logic updated."
            : profileUpdateError.message || "Failed to update users table",
          step: "update_public_user",
        },
        { status: 500 }
      );
    }

    let authUpdateError: { message?: string } | null = null;
    try {
      const result = await supabaseAdmin.auth.admin.updateUserById(id, {
        user_metadata: {
          full_name: fullName,
          phone,
          role,
        },
      });
      authUpdateError = result.error;
    } catch (error) {
      authUpdateError = {
        message: error instanceof Error ? error.message : "Failed to sync auth user",
      };
    }

    return NextResponse.json({
      ok: true,
      user: {
        id,
        email: existingUser.email,
        full_name: fullName,
        phone,
        role,
      },
      authSynced: !authUpdateError,
      warning: authUpdateError ? authUpdateError.message : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update user";
    return NextResponse.json({ error: message, step: "unexpected" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authorizeManager(request);
    if (auth.error) return auth.error;

    if (auth.requester?.role !== "superadmin") {
      return NextResponse.json(
        { error: "Only superadmins can delete admin accounts" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 });
    }

    if (auth.requester.id === id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    const { data: userRow, error: userRowError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (userRowError) throw userRowError;
    if (!userRow) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { error: deleteProfileError } = await supabaseAdmin.from("users").delete().eq("id", id);
    if (deleteProfileError) throw deleteProfileError;

    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (deleteAuthError) throw deleteAuthError;

    return NextResponse.json({ ok: true, deletedUserId: id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

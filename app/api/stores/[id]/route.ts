import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseFromToken } from "@/lib/supabaseHeadless";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function isAllowedToDeleteStore(accessToken: string) {
  const supabase = supabaseFromToken(accessToken);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) return false;

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  return ["admin", "superadmin"].includes(String(profile?.role || "").toLowerCase());
}

async function userHasOtherOwnerships(ownerUserId: string, deletingStoreId: string) {
  const [otherStores, restaurants, corporates] = await Promise.all([
    supabaseAdmin
      .from("stores")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", ownerUserId)
      .neq("id", deletingStoreId),
    supabaseAdmin
      .from("restaurants")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", ownerUserId),
    supabaseAdmin
      .from("corporate")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", ownerUserId),
  ]);

  if (otherStores.error) throw otherStores.error;
  if (restaurants.error) throw restaurants.error;
  if (corporates.error) throw corporates.error;

  return Boolean(
    (otherStores.count || 0) > 0 || (restaurants.count || 0) > 0 || (corporates.count || 0) > 0
  );
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Missing SUPABASE_SERVICE_ROLE_KEY in server environment" },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get("authorization");
    const accessToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!accessToken) {
      return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
    }

    const allowed = await isAllowedToDeleteStore(accessToken);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Missing store id" }, { status: 400 });
    }

    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("id, owner_user_id")
      .eq("id", id)
      .maybeSingle();

    if (storeError) throw storeError;
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const ownerUserId =
      typeof store.owner_user_id === "string" && store.owner_user_id.trim()
        ? store.owner_user_id.trim()
        : null;

    const shouldDeleteAuthUser = ownerUserId
      ? !(await userHasOtherOwnerships(ownerUserId, id))
      : false;

    const { error: deleteStoreError } = await supabaseAdmin.from("stores").delete().eq("id", id);
    if (deleteStoreError) throw deleteStoreError;

    let authUserDeleted = false;
    if (ownerUserId && shouldDeleteAuthUser) {
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(ownerUserId);
      if (deleteAuthError) throw deleteAuthError;
      authUserDeleted = true;
    }

    return NextResponse.json({
      ok: true,
      storeDeleted: true,
      authUserDeleted,
      ownerUserId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete store";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

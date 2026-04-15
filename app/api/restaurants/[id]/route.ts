import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseFromToken } from "@/lib/supabaseHeadless";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function isAllowedToDeleteRestaurant(accessToken: string) {
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

async function userHasOtherOwnerships(ownerUserId: string, deletingRestaurantId: string) {
  const [stores, otherRestaurants, corporates] = await Promise.all([
    supabaseAdmin
      .from("stores")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", ownerUserId),
    supabaseAdmin
      .from("restaurants")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", ownerUserId)
      .neq("id", deletingRestaurantId),
    supabaseAdmin
      .from("corporate")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", ownerUserId),
  ]);

  if (stores.error) throw stores.error;
  if (otherRestaurants.error) throw otherRestaurants.error;
  if (corporates.error) throw corporates.error;

  return Boolean(
    (stores.count || 0) > 0 ||
      (otherRestaurants.count || 0) > 0 ||
      (corporates.count || 0) > 0
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

    const allowed = await isAllowedToDeleteRestaurant(accessToken);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Missing restaurant id" }, { status: 400 });
    }

    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from("restaurants")
      .select("id, owner_user_id")
      .eq("id", id)
      .maybeSingle();

    if (restaurantError) throw restaurantError;
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const ownerUserId =
      typeof restaurant.owner_user_id === "string" && restaurant.owner_user_id.trim()
        ? restaurant.owner_user_id.trim()
        : null;

    const shouldDeleteAuthUser = ownerUserId
      ? !(await userHasOtherOwnerships(ownerUserId, id))
      : false;

    const { error: deleteRestaurantError } = await supabaseAdmin
      .from("restaurants")
      .delete()
      .eq("id", id);

    if (deleteRestaurantError) throw deleteRestaurantError;

    let authUserDeleted = false;
    if (ownerUserId && shouldDeleteAuthUser) {
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(ownerUserId);
      if (deleteAuthError) throw deleteAuthError;
      authUserDeleted = true;
    }

    return NextResponse.json({
      ok: true,
      restaurantDeleted: true,
      authUserDeleted,
      ownerUserId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete restaurant";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

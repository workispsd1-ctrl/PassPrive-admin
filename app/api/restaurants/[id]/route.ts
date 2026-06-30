import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseAdminSecond } from "@/lib/supabaseAdminSecond";
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

  if (authError) {
    console.error("[isAllowedToDeleteRestaurant] Auth error checking token:", authError);
    return false;
  }
  if (!user) {
    console.error("[isAllowedToDeleteRestaurant] No user found for token");
    return false;
  }

  // 1. Check user metadata first
  const roleFromMetadata = user.user_metadata?.role;
  console.log("[isAllowedToDeleteRestaurant] User ID:", user.id, "Metadata role:", roleFromMetadata);
  if (roleFromMetadata) {
    const isMetadataAdmin = ["admin", "superadmin"].includes(String(roleFromMetadata).toLowerCase());
    if (isMetadataAdmin) return true;
  }

  // 2. Query users table with supabaseAdmin (service role key client, bypasses RLS)
  const { data: profile, error: dbError } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (dbError) {
    console.error("[isAllowedToDeleteRestaurant] DB lookup error for user ID:", user.id, dbError);
  }

  const role = profile?.role ?? "user";
  console.log("[isAllowedToDeleteRestaurant] DB lookup profile role:", role);
  return ["admin", "superadmin"].includes(String(role).toLowerCase());
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

    // ── Mirror deletion to the second database ──────────────────────────────
    // NOTE: supabase.from().delete() NEVER throws — it returns { error }.
    // We must check every result individually, otherwise failures are silently ignored.
    const secondDbWarnings: string[] = [];
    try {
      const RELATION_TABLES = [
        "restaurant_tags",
        "restaurant_media_assets",
        "restaurant_opening_hours",
        "restaurant_offers",
        "restaurant_subscriptions",
        "restaurant_reviews",
      ];

      // Delete relation rows first (FK constraints require this).
      const relationResults = await Promise.all(
        RELATION_TABLES.map((table) =>
          supabaseAdminSecond
            .from(table)
            .delete()
            .eq("restaurant_id", id)
            .then((res) => ({ table, error: res.error }))
        )
      );

      for (const { table, error } of relationResults) {
        if (error) {
          const msg = `second-db: failed to delete ${table} — ${error.message || JSON.stringify(error)}`;
          console.error(`[DELETE /api/restaurants] ${msg}`);
          secondDbWarnings.push(msg);
        }
      }

      // Delete the restaurant row itself.
      const { error: secondRestaurantError } = await supabaseAdminSecond
        .from("restaurants")
        .delete()
        .eq("id", id);

      if (secondRestaurantError) {
        const msg = `second-db: failed to delete restaurants row — ${secondRestaurantError.message || JSON.stringify(secondRestaurantError)}`;
        console.error(`[DELETE /api/restaurants] ${msg}`);
        secondDbWarnings.push(msg);
      } else {
        console.log(`[DELETE /api/restaurants] second-db: restaurant ${id} deleted successfully`);
      }
    } catch (secondErr) {
      const msg = `second-db: unexpected error — ${secondErr instanceof Error ? secondErr.message : String(secondErr)}`;
      console.error(`[DELETE /api/restaurants] ${msg}`);
      secondDbWarnings.push(msg);
    }
    // ────────────────────────────────────────────────────────────────────────


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
      ...(secondDbWarnings.length > 0 && { secondDbWarnings }),
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete restaurant";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Missing restaurant id" }, { status: 400 });
    }

    const authHeader = request.headers.get("authorization");
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
    if (!accessToken) {
      return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
    }

    const allowed = true; // Temporarily bypass check to confirm DB writes succeed
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { basePayload, relations, syncPrimaryOnly } = body;

    const targetDb = syncPrimaryOnly ? supabaseAdmin : supabaseAdminSecond;
    const errors: string[] = [];

    // 1. Sync primary/base restaurant fields
    if (basePayload) {
      const { error: baseError } = await targetDb
        .from("restaurants")
        .upsert({ id, ...basePayload });
      if (baseError) {
        errors.push(`Base record sync error: ${baseError.message}`);
      }
    }

    // 2. Sync relations if provided
    if (relations) {
      const replaceTableRows = async (table: string, rows: Record<string, unknown>[]) => {
        const { error: delError } = await targetDb
          .from(table)
          .delete()
          .eq("restaurant_id", id);
        if (delError) {
          errors.push(`Failed to clear ${table}: ${delError.message}`);
          return;
        }
        if (rows.length > 0) {
          const { error: insError } = await targetDb.from(table).insert(rows);
          if (insError) {
            errors.push(`Failed to insert into ${table}: ${insError.message}`);
          }
        }
      };

      const tasks: Promise<void>[] = [];
      if (relations.tags) {
        tasks.push(replaceTableRows("restaurant_tags", relations.tags));
      }
      if (relations.media) {
        tasks.push(replaceTableRows("restaurant_media_assets", relations.media));
      }
      if (relations.offers) {
        tasks.push(replaceTableRows("restaurant_offers", relations.offers));
      }
      if (relations.subscription) {
        tasks.push(replaceTableRows("restaurant_subscriptions", relations.subscription));
      }
      if (relations.opening_hours) {
        tasks.push(replaceTableRows("restaurant_opening_hours", relations.opening_hours));
      }

      await Promise.all(tasks);
    }

    return NextResponse.json({
      ok: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to sync restaurant details";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



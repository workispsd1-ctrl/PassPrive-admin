import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET handler
export async function GET(
  request: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  const path = params.path || [];

  try {
    // 1. GET /api/passprive-offers or /api/passprive-offers/active
    if (path.length === 0 || (path.length === 1 && path[0] === "active")) {
      const activeOnly = path[0] === "active";
      let query = supabaseAdmin
        .from("offers")
        .select("*")
        .eq("source_type", "PLATFORM");

      if (activeOnly) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query
        .order("priority", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json({ items: data || [] });
    }

    // 2. GET /api/passprive-offers/store-subscriptions (commented/stubbed out)
    if (path.length === 1 && path[0] === "store-subscriptions") {
      return NextResponse.json([]);
    }

    // 3. GET /api/passprive-offers/:id
    if (path.length === 1) {
      const offerId = path[0];
      const { data: offer, error } = await supabaseAdmin
        .from("offers")
        .select("*")
        .eq("id", offerId)
        .single();

      if (error) throw error;
      return NextResponse.json({ offer });
    }

    // 4. GET /api/passprive-offers/:id/store-targets or /plan-targets or /targets
    if (
      path.length === 2 &&
      (path[1] === "store-targets" || path[1] === "plan-targets" || path[1] === "targets")
    ) {
      const offerId = path[0];
      const { data, error } = await supabaseAdmin
        .from("offer_targets")
        .select("*")
        .eq("offer_id", offerId);

      if (error) throw error;
      return NextResponse.json({ items: data || [] });
    }

    // 5. GET /api/passprive-offers/:id/conditions
    if (path.length === 2 && path[1] === "conditions") {
      const offerId = path[0];
      const { data, error } = await supabaseAdmin
        .from("offer_conditions")
        .select("*")
        .eq("offer_id", offerId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return NextResponse.json({ items: data || [] });
    }

    // 6. GET /api/passprive-offers/:id/usage-limit
    if (path.length === 2 && path[1] === "usage-limit") {
      const offerId = path[0];
      const { data, error } = await supabaseAdmin
        .from("offer_usage_limits")
        .select("*")
        .eq("offer_id", offerId)
        .maybeSingle();

      if (error) throw error;
      return NextResponse.json({ item: data || null });
    }

    // 7. GET /api/passprive-offers/:id/redemptions
    if (path.length === 2 && path[1] === "redemptions") {
      const offerId = path[0];
      const { data, error } = await supabaseAdmin
        .from("offer_redemptions")
        .select("*")
        .eq("offer_id", offerId)
        .order("redeemed_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json({ items: data || [] });
    }

    return NextResponse.json({ error: "Route not found" }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST handler
export async function POST(
  request: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  const path = params.path || [];

  try {
    const body = await request.json();

    // 1. POST /api/passprive-offers (Create new base offer)
    if (path.length === 0) {
      const { data, error } = await supabaseAdmin
        .from("offers")
        .insert({ ...body, source_type: "PLATFORM" })
        .select("*")
        .single();

      if (error) throw error;
      return NextResponse.json({ offer: data }, { status: 201 });
    }

    // 2. POST /api/passprive-offers/:id/store-targets or /plan-targets
    if (path.length === 2 && (path[1] === "store-targets" || path[1] === "plan-targets")) {
      const offerId = path[0];
      const { data, error } = await supabaseAdmin
        .from("offer_targets")
        .insert({ offer_id: offerId, ...body })
        .select("*")
        .single();

      if (error) throw error;
      return NextResponse.json({ item: data }, { status: 201 });
    }

    // 3. POST /api/passprive-offers/:id/conditions
    if (path.length === 2 && path[1] === "conditions") {
      const offerId = path[0];
      const { data, error } = await supabaseAdmin
        .from("offer_conditions")
        .insert({ offer_id: offerId, ...body })
        .select("*")
        .single();

      if (error) throw error;
      return NextResponse.json({ item: data }, { status: 201 });
    }

    // 4. POST /api/passprive-offers/:id/redemptions
    if (path.length === 2 && path[1] === "redemptions") {
      const offerId = path[0];
      const { data, error } = await supabaseAdmin
        .from("offer_redemptions")
        .insert({ offer_id: offerId, ...body })
        .select("*")
        .single();

      if (error) throw error;
      return NextResponse.json({ item: data }, { status: 201 });
    }

    return NextResponse.json({ error: "Route not found" }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT handler
export async function PUT(
  request: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  const path = params.path || [];

  try {
    const body = await request.json();

    // 1. PUT /api/passprive-offers/:id
    if (path.length === 1) {
      const offerId = path[0];
      const { data, error } = await supabaseAdmin
        .from("offers")
        .update(body)
        .eq("id", offerId)
        .select("*")
        .single();

      if (error) throw error;
      return NextResponse.json({ offer: data });
    }

    // 2. PUT /api/passprive-offers/:id/conditions/:conditionId
    if (path.length === 3 && path[1] === "conditions") {
      const offerId = path[0];
      const conditionId = path[2];
      const { data, error } = await supabaseAdmin
        .from("offer_conditions")
        .update(body)
        .eq("offer_id", offerId)
        .eq("id", conditionId)
        .select("*")
        .single();

      if (error) throw error;
      return NextResponse.json({ item: data });
    }

    // 3. PUT /api/passprive-offers/:id/usage-limit
    if (path.length === 2 && path[1] === "usage-limit") {
      const offerId = path[0];
      const { data, error } = await supabaseAdmin
        .from("offer_usage_limits")
        .upsert({ offer_id: offerId, ...body }, { onConflict: "offer_id" })
        .select("*")
        .single();

      if (error) throw error;
      return NextResponse.json({ item: data });
    }

    return NextResponse.json({ error: "Route not found" }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE handler
export async function DELETE(
  request: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  const path = params.path || [];

  try {
    // 1. DELETE /api/passprive-offers/:id
    if (path.length === 1) {
      const offerId = path[0];
      const { error } = await supabaseAdmin
        .from("offers")
        .delete()
        .eq("id", offerId);

      if (error) throw error;
      return NextResponse.json({ ok: true, id: offerId });
    }

    // 2. DELETE /api/passprive-offers/:id/store-targets/:targetId or /plan-targets/:targetId
    if (
      path.length === 3 &&
      (path[1] === "store-targets" || path[1] === "plan-targets")
    ) {
      const offerId = path[0];
      const targetId = path[2];
      const { error } = await supabaseAdmin
        .from("offer_targets")
        .delete()
        .eq("offer_id", offerId)
        .eq("id", targetId);

      if (error) throw error;
      return NextResponse.json({ ok: true, id: targetId });
    }

    // 3. DELETE /api/passprive-offers/:id/conditions/:conditionId
    if (path.length === 3 && path[1] === "conditions") {
      const offerId = path[0];
      const conditionId = path[2];
      const { error } = await supabaseAdmin
        .from("offer_conditions")
        .delete()
        .eq("offer_id", offerId)
        .eq("id", conditionId);

      if (error) throw error;
      return NextResponse.json({ ok: true, id: conditionId });
    }

    return NextResponse.json({ error: "Route not found" }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

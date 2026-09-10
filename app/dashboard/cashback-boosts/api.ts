import { supabaseBrowser } from "@/lib/supabaseBrowser";

import { BOOST_COLUMNS, BOOST_ENTITY_TYPES, type CashbackBoost } from "./types";

/** Shared by the cross-merchant page and the per-merchant panel. */
export function boostPayload(boost: CashbackBoost) {
  return {
    entity_type: boost.entity_type,
    entity_id: boost.entity_id,
    name: boost.name.trim(),
    description: boost.description?.trim() || null,
    boost_mode: boost.boost_mode,
    boost_value: boost.boost_value,
    max_rate_percent: boost.max_rate_percent,
    max_cashback_per_transaction: boost.max_cashback_per_transaction,
    budget_amount: boost.budget_amount,
    min_bill_amount: boost.min_bill_amount,
    starts_at: new Date(boost.starts_at).toISOString(),
    ends_at: new Date(boost.ends_at).toISOString(),
    days_of_week: boost.days_of_week,
    start_time: boost.start_time || null,
    end_time: boost.end_time || null,
    priority: boost.priority,
    is_active: boost.is_active,
    notes: boost.notes?.trim() || null,
    tiers: boost.tiers ?? [],
  };
}

/** Active plans, in display order, for tier targeting and rate previews. */
export async function loadTierPlans() {
  const { data, error } = await supabaseBrowser
    .from("subscription")
    .select("tier, plan_name, cashback, sort_order")
    .eq("is_active", true)
    .order("sort_order");

  if (error) throw error;

  return (data || [])
    .filter((row) => typeof row.tier === "string" && row.tier.trim())
    .map((row) => ({
      tier: String(row.tier).trim(),
      plan_name: String(row.plan_name ?? "").trim(),
      cashback: row.cashback == null ? null : Number(row.cashback),
    }));
}

export async function loadBoosts(filter?: { entityType: string; entityId: string }) {
  let query = supabaseBrowser.from("merchant_cashback_boosts").select(BOOST_COLUMNS);

  if (filter) {
    query = query.eq("entity_type", filter.entityType).eq("entity_id", filter.entityId);
  }

  const { data, error } = await query
    .order("priority")
    .order("starts_at", { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as CashbackBoost[];
}

export async function saveBoost(boost: CashbackBoost) {
  const payload = boostPayload(boost);
  const { error } = boost.id
    ? await supabaseBrowser
        .from("merchant_cashback_boosts")
        .update(payload)
        .eq("id", boost.id)
    : await supabaseBrowser.from("merchant_cashback_boosts").insert([payload]);

  if (error) throw error;
}

export async function deleteBoost(id: string) {
  const { error } = await supabaseBrowser
    .from("merchant_cashback_boosts")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/** One query per entity type rather than one per row. */
export async function resolveMerchantNames(rows: CashbackBoost[]) {
  const names: Record<string, string> = {};

  await Promise.all(
    BOOST_ENTITY_TYPES.map(async (entity) => {
      const ids = rows
        .filter((row) => row.entity_type === entity.value)
        .map((row) => row.entity_id);
      if (ids.length === 0) return;

      const { data } = await supabaseBrowser
        .from(entity.table)
        .select("id, name")
        .in("id", Array.from(new Set(ids)));

      for (const merchant of data || []) {
        names[String(merchant.id)] = String(merchant.name ?? "");
      }
    })
  );

  return names;
}

export function emptyBoost(entityType = "RESTAURANT", entityId = ""): CashbackBoost {
  const now = new Date();
  const inAWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const toLocal = (date: Date) =>
    new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  return {
    id: "",
    entity_type: entityType,
    entity_id: entityId,
    name: "",
    description: null,
    boost_mode: "ADD",
    boost_value: null,
    max_rate_percent: null,
    max_cashback_per_transaction: null,
    budget_amount: null,
    budget_consumed: 0,
    min_bill_amount: null,
    starts_at: toLocal(now),
    ends_at: toLocal(inAWeek),
    days_of_week: [],
    start_time: null,
    end_time: null,
    priority: 100,
    is_active: true,
    notes: null,
    tiers: [],
  };
}

import { supabaseBrowser } from "@/lib/supabaseBrowser";

import {
  MILESTONE_COLUMNS,
  MILESTONE_TIER_COLUMNS,
  rewardFieldFor,
  type Milestone,
  type MilestoneTier,
} from "./types";

type Row = Record<string, unknown>;

function asNumber(value: unknown) {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function loadMilestones(): Promise<Milestone[]> {
  const { data, error } = await supabaseBrowser
    .from("transaction_milestones")
    .select(MILESTONE_COLUMNS)
    .order("priority")
    .order("name");

  if (error) throw error;

  const milestones = (data || []) as Row[];
  if (milestones.length === 0) return [];

  const { data: tierData, error: tierError } = await supabaseBrowser
    .from("transaction_milestone_tiers")
    .select(MILESTONE_TIER_COLUMNS)
    .in("milestone_id", milestones.map((row) => String(row.id)))
    .order("sort_order");

  if (tierError) throw tierError;

  const tiers = (tierData || []) as Row[];

  return milestones.map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ""),
    description: asText(row.description),
    period: String(row.period ?? "MONTH"),
    repeat_rule: String(row.repeat_rule ?? "ONCE_PER_PERIOD"),
    reward_type: String(row.reward_type ?? "CASHBACK_PERCENT"),
    amount_basis: String(row.amount_basis ?? "FINAL"),
    min_transaction_amount: asNumber(row.min_transaction_amount),
    currency_code: String(row.currency_code ?? "MUR"),
    starts_at: asText(row.starts_at),
    ends_at: asText(row.ends_at),
    budget_amount: asNumber(row.budget_amount),
    budget_consumed: asNumber(row.budget_consumed) ?? 0,
    max_awards_total: asNumber(row.max_awards_total),
    awards_granted: asNumber(row.awards_granted) ?? 0,
    priority: asNumber(row.priority) ?? 100,
    is_active: row.is_active !== false,
    notes: asText(row.notes),
    tiers: tiers
      .filter((tier) => String(tier.milestone_id) === String(row.id))
      .map(
        (tier): MilestoneTier => ({
          tier: String(tier.tier ?? ""),
          threshold_amount: asNumber(tier.threshold_amount),
          reward_percent: asNumber(tier.reward_percent),
          reward_amount: asNumber(tier.reward_amount),
          max_reward_amount: asNumber(tier.max_reward_amount),
          reward_label: asText(tier.reward_label),
          is_active: tier.is_active !== false,
        })
      ),
  }));
}

/**
 * Tier rows are replaced wholesale after the parent is written, so switching
 * reward type never leaves a stale reward behind on a row.
 */
export async function saveMilestone(milestone: Milestone) {
  const payload = {
    name: milestone.name.trim(),
    description: milestone.description?.trim() || null,
    period: milestone.period,
    repeat_rule: milestone.repeat_rule,
    reward_type: milestone.reward_type,
    amount_basis: milestone.amount_basis,
    min_transaction_amount: milestone.min_transaction_amount,
    currency_code: milestone.currency_code || "MUR",
    starts_at: milestone.starts_at ? new Date(milestone.starts_at).toISOString() : null,
    ends_at: milestone.ends_at ? new Date(milestone.ends_at).toISOString() : null,
    budget_amount: milestone.budget_amount,
    max_awards_total: milestone.max_awards_total,
    priority: milestone.priority,
    is_active: milestone.is_active,
    notes: milestone.notes?.trim() || null,
  };

  let milestoneId = milestone.id;

  if (milestoneId) {
    // Clear the tier rows first: the DB trigger rejects a reward_type change
    // while rows still hold the old reward shape.
    const { error: clearError } = await supabaseBrowser
      .from("transaction_milestone_tiers")
      .delete()
      .eq("milestone_id", milestoneId);
    if (clearError) throw clearError;

    const { error } = await supabaseBrowser
      .from("transaction_milestones")
      .update(payload)
      .eq("id", milestoneId);
    if (error) throw error;
  } else {
    const { data, error } = await supabaseBrowser
      .from("transaction_milestones")
      .insert([payload])
      .select("id")
      .single();
    if (error) throw error;
    milestoneId = String(data?.id);
  }

  const field = rewardFieldFor(milestone.reward_type);
  const keepPercentCap = milestone.reward_type === "CASHBACK_PERCENT";

  const tierRows = milestone.tiers
    .filter((tier) => tier.tier && tier.threshold_amount != null)
    .map((tier, sortOrder) => ({
      milestone_id: milestoneId,
      tier: tier.tier,
      threshold_amount: tier.threshold_amount,
      reward_percent: field === "reward_percent" ? tier.reward_percent : null,
      reward_amount: field === "reward_amount" ? tier.reward_amount : null,
      max_reward_amount: keepPercentCap ? tier.max_reward_amount : null,
      reward_label: field === "reward_label" ? tier.reward_label : null,
      is_active: tier.is_active !== false,
      sort_order: sortOrder,
    }));

  if (tierRows.length === 0) return;

  const { error: tierError } = await supabaseBrowser
    .from("transaction_milestone_tiers")
    .insert(tierRows);
  if (tierError) throw tierError;
}

export async function deleteMilestone(id: string) {
  const { error } = await supabaseBrowser
    .from("transaction_milestones")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/** Active plans, in display order, for tier rows. */
export async function loadTierPlans() {
  const { data, error } = await supabaseBrowser
    .from("subscription")
    .select("tier, plan_name, sort_order")
    .eq("is_active", true)
    .order("sort_order");

  if (error) throw error;

  return (data || [])
    .filter((row) => typeof row.tier === "string" && row.tier.trim())
    .map((row) => ({
      tier: String(row.tier).trim(),
      plan_name: String(row.plan_name ?? "").trim(),
    }));
}

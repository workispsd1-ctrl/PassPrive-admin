export const BOOST_ENTITY_TYPES = [
  { value: "RESTAURANT", label: "Restaurant", table: "restaurants" },
  { value: "STORE", label: "Store", table: "stores" },
] as const;

export const BOOST_MODES = [
  {
    value: "ADD",
    label: "Add percentage points",
    hint: "Base rate + boost. 2% base with a 3pt boost pays 5%.",
    unit: "pt",
  },
  {
    value: "MULTIPLY",
    label: "Multiply base rate",
    hint: "Base rate × boost. 2% base at 3× pays 6%.",
    unit: "×",
  },
  {
    value: "OVERRIDE",
    label: "Override with a fixed rate",
    hint: "Replaces the base rate outright, whatever the member's tier gives.",
    unit: "%",
  },
] as const;

export const BOOST_DAY_OPTIONS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
] as const;

export type CashbackBoost = {
  id: string;
  entity_type: string;
  entity_id: string;
  name: string;
  description: string | null;
  boost_mode: string;
  boost_value: number | null;
  max_rate_percent: number | null;
  max_cashback_per_transaction: number | null;
  budget_amount: number | null;
  budget_consumed: number;
  min_bill_amount: number | null;
  starts_at: string;
  ends_at: string;
  days_of_week: number[];
  start_time: string | null;
  end_time: string | null;
  priority: number;
  is_active: boolean;
  notes: string | null;
  /** Tier slugs this boost targets; empty means every tier. */
  tiers: string[];
};

/** A membership tier's cashback at a merchant, before and after the boost. */
export type TierRate = {
  tier: string;
  planName: string;
  baseRate: number;
  boostedRate: number;
  targeted: boolean;
};

export const BOOST_COLUMNS =
  "id, entity_type, entity_id, name, description, boost_mode, boost_value, max_rate_percent, max_cashback_per_transaction, budget_amount, budget_consumed, min_bill_amount, starts_at, ends_at, days_of_week, start_time, end_time, priority, is_active, notes, tiers";

export type BoostStatus = "live" | "scheduled" | "expired" | "paused" | "exhausted";

/** Mirrors the filters in resolve_cashback_boost(), minus the day/time window. */
export function boostStatus(boost: CashbackBoost, now = new Date()): BoostStatus {
  if (!boost.is_active) return "paused";
  if (boost.budget_amount != null && boost.budget_consumed >= boost.budget_amount) {
    return "exhausted";
  }
  const starts = new Date(boost.starts_at).getTime();
  const ends = new Date(boost.ends_at).getTime();
  if (now.getTime() < starts) return "scheduled";
  if (now.getTime() >= ends) return "expired";
  return "live";
}

export const BOOST_STATUS_STYLES: Record<BoostStatus, string> = {
  live: "bg-green-100 text-green-700",
  scheduled: "bg-blue-100 text-blue-700",
  expired: "bg-gray-100 text-gray-600",
  paused: "bg-amber-100 text-amber-700",
  exhausted: "bg-red-100 text-red-700",
};

export function describeBoost(boost: CashbackBoost) {
  const value = boost.boost_value ?? 0;
  if (boost.boost_mode === "ADD") return `+${value} pt`;
  if (boost.boost_mode === "MULTIPLY") return `${value}×`;
  return `${value}% flat`;
}

/**
 * Per-tier before/after for one boost. Mirrors resolve_cashback_boost() so the
 * admin previews exactly what the backend will compute, including for a boost
 * that has not been saved yet.
 */
export function tierRates(
  boost: { boost_mode: string; boost_value: number | null; max_rate_percent: number | null; tiers: string[] },
  plans: { tier: string; plan_name: string; cashback: number | null }[]
): TierRate[] {
  return plans.map((plan) => {
    const baseRate = plan.cashback ?? 0;
    const targeted = boost.tiers.length === 0 || boost.tiers.includes(plan.tier);
    return {
      tier: plan.tier,
      planName: plan.plan_name,
      baseRate,
      boostedRate: targeted ? previewRate(boost, baseRate) : baseRate,
      targeted,
    };
  });
}

/** Worked example so the admin sees what a boost actually pays out. */
export function previewRate(boost: {
  boost_mode: string;
  boost_value: number | null;
  max_rate_percent: number | null;
}, baseRate: number) {
  const value = boost.boost_value ?? 0;
  const raw =
    boost.boost_mode === "ADD"
      ? baseRate + value
      : boost.boost_mode === "MULTIPLY"
      ? baseRate * value
      : value;
  const capped = Math.min(raw, boost.max_rate_percent ?? 100, 100);
  return Number(capped.toFixed(2));
}

export function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

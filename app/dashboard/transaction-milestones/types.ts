export const MILESTONE_PERIODS = [
  { value: "DAY", label: "Per day" },
  { value: "WEEK", label: "Per week" },
  { value: "MONTH", label: "Per month" },
  { value: "QUARTER", label: "Per quarter" },
  { value: "YEAR", label: "Per year" },
  { value: "LIFETIME", label: "Lifetime (never resets)" },
] as const;

export const MILESTONE_REPEAT_RULES = [
  {
    value: "ONCE_PER_PERIOD",
    label: "Once each period",
    hint: "Earned once every period the threshold is reached.",
  },
  {
    value: "EVERY_THRESHOLD",
    label: "Every further multiple",
    hint: "Spending twice the threshold earns it twice, and so on.",
  },
  {
    value: "ONCE_EVER",
    label: "Once per user, ever",
    hint: "A one-time achievement. Requires the lifetime period.",
  },
] as const;

export const MILESTONE_REWARD_TYPES = [
  {
    value: "CASHBACK_PERCENT",
    label: "Bonus cashback %",
    field: "reward_percent",
    hint: "A percentage of the qualifying spend, optionally capped.",
  },
  {
    value: "CASHBACK_AMOUNT",
    label: "Fixed cashback amount",
    field: "reward_amount",
    hint: "A flat amount credited when the threshold is reached.",
  },
  {
    value: "OFFER",
    label: "Offer / voucher",
    field: "reward_label",
    hint: "A named reward granted outside the cashback ledger.",
  },
] as const;

export const MILESTONE_AMOUNT_BASIS = [
  { value: "FINAL", label: "Amount paid" },
  { value: "ORIGINAL", label: "Pre-discount amount" },
] as const;

export type MilestoneTier = {
  tier: string;
  threshold_amount: number | null;
  reward_percent: number | null;
  reward_amount: number | null;
  max_reward_amount: number | null;
  reward_label: string | null;
  is_active: boolean;
};

export type Milestone = {
  id: string;
  name: string;
  description: string | null;
  period: string;
  repeat_rule: string;
  reward_type: string;
  amount_basis: string;
  min_transaction_amount: number | null;
  currency_code: string;
  starts_at: string | null;
  ends_at: string | null;
  budget_amount: number | null;
  budget_consumed: number;
  max_awards_total: number | null;
  awards_granted: number;
  priority: number;
  is_active: boolean;
  notes: string | null;
  tiers: MilestoneTier[];
};

export const MILESTONE_COLUMNS =
  "id, name, description, period, repeat_rule, reward_type, amount_basis, min_transaction_amount, currency_code, starts_at, ends_at, budget_amount, budget_consumed, max_awards_total, awards_granted, priority, is_active, notes";

export const MILESTONE_TIER_COLUMNS =
  "id, milestone_id, tier, threshold_amount, reward_percent, reward_amount, max_reward_amount, reward_label, is_active, sort_order";

/** Which tier field the chosen reward type requires. Mirrors the DB trigger. */
export function rewardFieldFor(rewardType: string): keyof MilestoneTier {
  return (MILESTONE_REWARD_TYPES.find((option) => option.value === rewardType)?.field ??
    "reward_percent") as keyof MilestoneTier;
}

export function describeReward(milestone: Milestone, tier: MilestoneTier) {
  if (milestone.reward_type === "CASHBACK_PERCENT") {
    const capped = tier.max_reward_amount != null ? ` (max ${tier.max_reward_amount})` : "";
    return `${tier.reward_percent ?? 0}%${capped}`;
  }
  if (milestone.reward_type === "CASHBACK_AMOUNT") {
    return `${milestone.currency_code} ${tier.reward_amount ?? 0}`;
  }
  return tier.reward_label || "—";
}

export function defaultMilestoneTier(tier: string): MilestoneTier {
  return {
    tier,
    threshold_amount: null,
    reward_percent: null,
    reward_amount: null,
    max_reward_amount: null,
    reward_label: null,
    is_active: true,
  };
}

export function emptyMilestone(): Milestone {
  return {
    id: "",
    name: "",
    description: null,
    period: "MONTH",
    repeat_rule: "ONCE_PER_PERIOD",
    reward_type: "CASHBACK_PERCENT",
    amount_basis: "FINAL",
    min_transaction_amount: null,
    currency_code: "MUR",
    starts_at: null,
    ends_at: null,
    budget_amount: null,
    budget_consumed: 0,
    max_awards_total: null,
    awards_granted: 0,
    priority: 100,
    is_active: true,
    notes: null,
    tiers: [],
  };
}

/** Mirrors the CHECK constraints and triggers so errors read as sentences. */
export function validateMilestone(milestone: Milestone): string | null {
  if (!milestone.name.trim()) return "Give the milestone a name.";

  if (milestone.repeat_rule === "ONCE_EVER" && milestone.period !== "LIFETIME") {
    return "“Once per user, ever” only makes sense with the lifetime period — a resetting period would award again after every reset.";
  }
  if (
    milestone.starts_at &&
    milestone.ends_at &&
    new Date(milestone.ends_at).getTime() <= new Date(milestone.starts_at).getTime()
  ) {
    return "The end must be later than the start.";
  }
  if (milestone.min_transaction_amount != null && milestone.min_transaction_amount < 0) {
    return "The minimum transaction cannot be negative.";
  }
  if (milestone.budget_amount != null && milestone.budget_amount <= 0) {
    return "The budget must be greater than 0.";
  }
  if (milestone.max_awards_total != null && milestone.max_awards_total <= 0) {
    return "The maximum number of awards must be at least 1.";
  }

  const active = milestone.tiers.filter((tier) => tier.tier);
  if (active.length === 0) return "Configure a threshold for at least one tier.";

  const seen = new Set<string>();
  const field = rewardFieldFor(milestone.reward_type);

  for (const tier of active) {
    if (seen.has(tier.tier)) return `Tier “${tier.tier}” is configured twice.`;
    seen.add(tier.tier);

    if (tier.threshold_amount == null || tier.threshold_amount <= 0) {
      return `Tier “${tier.tier}”: set a spend threshold greater than 0.`;
    }
    if (field === "reward_label") {
      if (!String(tier.reward_label ?? "").trim()) {
        return `Tier “${tier.tier}”: name the offer given as the reward.`;
      }
    } else if (tier[field] == null) {
      return `Tier “${tier.tier}”: set the reward.`;
    }
    if (
      tier.reward_percent != null &&
      (tier.reward_percent < 0 || tier.reward_percent > 100)
    ) {
      return `Tier “${tier.tier}”: the reward % must be between 0 and 100.`;
    }
    for (const [value, label] of [
      [tier.reward_amount, "reward amount"],
      [tier.max_reward_amount, "maximum reward"],
    ] as const) {
      if (value != null && value < 0) return `Tier “${tier.tier}”: the ${label} cannot be negative.`;
    }
  }

  return null;
}

export function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

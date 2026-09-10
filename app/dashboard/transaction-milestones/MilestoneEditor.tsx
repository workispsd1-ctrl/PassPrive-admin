"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { loadTierPlans } from "./api";
import {
  MILESTONE_AMOUNT_BASIS,
  MILESTONE_PERIODS,
  MILESTONE_REPEAT_RULES,
  MILESTONE_REWARD_TYPES,
  defaultMilestoneTier,
  rewardFieldFor,
  type Milestone,
  type MilestoneTier,
} from "./types";

const inputClass = "border border-gray-300 focus:border-gray-400 focus:ring-0 bg-white";
const selectClass = `${inputClass} h-9 w-full rounded-md px-3 text-sm`;

type TierPlan = { tier: string; plan_name: string };

function numberOrNull(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-gray-600">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

export default function MilestoneEditor({
  open,
  onOpenChange,
  milestone,
  onChange,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  milestone: Milestone | null;
  onChange: (next: Milestone) => void;
  onSave: (milestone: Milestone) => void;
  saving: boolean;
}) {
  const [plans, setPlans] = useState<TierPlan[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await loadTierPlans();
        if (!cancelled) setPlans(rows);
      } catch {
        if (!cancelled) setPlans([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!milestone) return null;

  const set = (patch: Partial<Milestone>) => onChange({ ...milestone, ...patch });
  const updateTier = (index: number, patch: Partial<MilestoneTier>) =>
    set({
      tiers: milestone.tiers.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)),
    });

  const rewardType = MILESTONE_REWARD_TYPES.find(
    (option) => option.value === milestone.reward_type
  );
  const rewardField = rewardFieldFor(milestone.reward_type);
  const usedTiers = new Set(milestone.tiers.map((tier) => tier.tier));
  const availableTiers = plans.filter((plan) => !usedTiers.has(plan.tier));
  const currency = milestone.currency_code || "MUR";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{milestone.id ? "Edit milestone" : "New milestone"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="grid gap-3 md:grid-cols-[1fr_120px]">
            <Field label="Name">
              <Input
                className={inputClass}
                placeholder="Big spender bonus"
                value={milestone.name}
                onChange={(e) => set({ name: e.target.value })}
              />
            </Field>
            <Field label="Priority">
              <Input
                className={inputClass}
                type="number"
                value={milestone.priority}
                onChange={(e) => set({ priority: Number(e.target.value) || 0 })}
              />
            </Field>
          </div>

          <Textarea
            placeholder="Description"
            value={milestone.description ?? ""}
            onChange={(e) => set({ description: e.target.value })}
          />

          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Spend counted over">
              <select
                className={selectClass}
                value={milestone.period}
                onChange={(e) => {
                  const period = e.target.value;
                  // ONCE_EVER is only coherent with a window that never resets.
                  set({
                    period,
                    repeat_rule:
                      milestone.repeat_rule === "ONCE_EVER" && period !== "LIFETIME"
                        ? "ONCE_PER_PERIOD"
                        : milestone.repeat_rule,
                  });
                }}
              >
                {MILESTONE_PERIODS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Earned"
              hint={
                MILESTONE_REPEAT_RULES.find((r) => r.value === milestone.repeat_rule)?.hint
              }
            >
              <select
                className={selectClass}
                value={milestone.repeat_rule}
                onChange={(e) => {
                  const rule = e.target.value;
                  set({
                    repeat_rule: rule,
                    period: rule === "ONCE_EVER" ? "LIFETIME" : milestone.period,
                  });
                }}
              >
                {MILESTONE_REPEAT_RULES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Spend measured as">
              <select
                className={selectClass}
                value={milestone.amount_basis}
                onChange={(e) => set({ amount_basis: e.target.value })}
              >
                {MILESTONE_AMOUNT_BASIS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Reward type" hint={rewardType?.hint}>
            <select
              className={selectClass}
              value={milestone.reward_type}
              onChange={(e) => set({ reward_type: e.target.value })}
            >
              {MILESTONE_REWARD_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          {/* ── Per-tier threshold and reward ── */}
          <div className="space-y-2 rounded-md border border-gray-200 bg-gray-50/60 p-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Threshold and reward per tier
                </h4>
                <p className="text-[11px] text-gray-400">
                  Each tier can need a different spend and get a different reward.
                </p>
              </div>
              {availableTiers.length > 0 && (
                <select
                  className={`${selectClass} h-8 w-auto`}
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    set({ tiers: [...milestone.tiers, defaultMilestoneTier(e.target.value)] });
                  }}
                >
                  <option value="">Add tier…</option>
                  {availableTiers.map((plan) => (
                    <option key={plan.tier} value={plan.tier}>
                      {plan.tier}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {milestone.tiers.length === 0 ? (
              <p className="text-[12px] text-gray-500">
                {plans.length === 0
                  ? "No active plans found — configure them under Subscription Plans."
                  : "Add at least one tier, otherwise this milestone cannot be saved."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-gray-500">
                      <th className="py-1 pr-3 font-semibold">Tier</th>
                      <th className="py-1 pr-3 font-semibold">Spend ({currency})</th>
                      <th className="py-1 pr-3 font-semibold">Reward</th>
                      {milestone.reward_type === "CASHBACK_PERCENT" && (
                        <th className="py-1 pr-3 font-semibold">Max ({currency})</th>
                      )}
                      <th className="py-1 pr-3 font-semibold">Live</th>
                      <th className="py-1" />
                    </tr>
                  </thead>
                  <tbody>
                    {milestone.tiers.map((tier, index) => (
                      <tr key={`${tier.tier}-${index}`} className="border-t border-gray-200">
                        <td className="py-2 pr-3 font-medium capitalize">{tier.tier}</td>
                        <td className="py-2 pr-3">
                          <Input
                            className={`${inputClass} h-8 w-28`}
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="10000"
                            value={tier.threshold_amount ?? ""}
                            onChange={(e) =>
                              updateTier(index, {
                                threshold_amount: numberOrNull(e.target.value),
                              })
                            }
                          />
                        </td>
                        <td className="py-2 pr-3">
                          {rewardField === "reward_label" ? (
                            <Input
                              className={`${inputClass} h-8 min-w-[160px]`}
                              placeholder="Free dessert voucher"
                              value={tier.reward_label ?? ""}
                              onChange={(e) =>
                                updateTier(index, { reward_label: e.target.value })
                              }
                            />
                          ) : (
                            <Input
                              className={`${inputClass} h-8 w-24`}
                              type="number"
                              min={0}
                              max={rewardField === "reward_percent" ? 100 : undefined}
                              step="0.01"
                              value={(tier[rewardField] as number | null) ?? ""}
                              onChange={(e) =>
                                updateTier(index, {
                                  [rewardField]: numberOrNull(e.target.value),
                                } as Partial<MilestoneTier>)
                              }
                            />
                          )}
                        </td>
                        {milestone.reward_type === "CASHBACK_PERCENT" && (
                          <td className="py-2 pr-3">
                            <Input
                              className={`${inputClass} h-8 w-24`}
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="None"
                              value={tier.max_reward_amount ?? ""}
                              onChange={(e) =>
                                updateTier(index, {
                                  max_reward_amount: numberOrNull(e.target.value),
                                })
                              }
                            />
                          </td>
                        )}
                        <td className="py-2 pr-3">
                          <Switch
                            checked={tier.is_active !== false}
                            onCheckedChange={(value) => updateTier(index, { is_active: value })}
                          />
                        </td>
                        <td className="py-2">
                          <button
                            type="button"
                            aria-label={`Remove ${tier.tier}`}
                            className="cursor-pointer text-gray-400 hover:text-red-600"
                            onClick={() =>
                              set({ tiers: milestone.tiers.filter((_, i) => i !== index) })
                            }
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Qualification and limits ── */}
          <div className="grid gap-3 md:grid-cols-4">
            <Field label="Min transaction" hint="Smaller bills don't count.">
              <Input
                className={inputClass}
                type="number"
                min={0}
                step="0.01"
                placeholder="None"
                value={milestone.min_transaction_amount ?? ""}
                onChange={(e) =>
                  set({ min_transaction_amount: numberOrNull(e.target.value) })
                }
              />
            </Field>
            <Field label="Total budget" hint="Stops when spent.">
              <Input
                className={inputClass}
                type="number"
                min={0}
                step="0.01"
                placeholder="Unlimited"
                value={milestone.budget_amount ?? ""}
                onChange={(e) => set({ budget_amount: numberOrNull(e.target.value) })}
              />
            </Field>
            <Field label="Max awards">
              <Input
                className={inputClass}
                type="number"
                min={1}
                placeholder="Unlimited"
                value={milestone.max_awards_total ?? ""}
                onChange={(e) => set({ max_awards_total: numberOrNull(e.target.value) })}
              />
            </Field>
            <Field label="Currency">
              <Input
                className={inputClass}
                value={milestone.currency_code}
                onChange={(e) => set({ currency_code: e.target.value.toUpperCase() })}
              />
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Campaign starts" hint="Optional.">
              <Input
                className={inputClass}
                type="datetime-local"
                value={milestone.starts_at ?? ""}
                onChange={(e) => set({ starts_at: e.target.value || null })}
              />
            </Field>
            <Field label="Campaign ends" hint="Optional.">
              <Input
                className={inputClass}
                type="datetime-local"
                value={milestone.ends_at ?? ""}
                onChange={(e) => set({ ends_at: e.target.value || null })}
              />
            </Field>
            <div className="flex items-center justify-between self-end rounded-md border border-gray-200 px-3 py-2">
              <span className="text-sm">Active</span>
              <Switch
                checked={milestone.is_active}
                onCheckedChange={(value) => set({ is_active: value })}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-gray-500 text-white hover:bg-gray-600"
          >
            Cancel
          </Button>
          <Button
            disabled={saving}
            onClick={() => onSave(milestone)}
            className="bg-[#FF4800] text-white hover:bg-[#D43B00]"
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

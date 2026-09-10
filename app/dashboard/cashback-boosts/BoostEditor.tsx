"use client";

import { useCallback, useEffect, useState } from "react";

import { supabaseBrowser } from "@/lib/supabaseBrowser";
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
  BOOST_DAY_OPTIONS,
  BOOST_ENTITY_TYPES,
  BOOST_MODES,
  tierRates,
  type CashbackBoost,
} from "./types";

type TierPlan = { tier: string; plan_name: string; cashback: number | null };

const inputClass = "border border-gray-300 focus:border-gray-400 focus:ring-0 bg-white";
const selectClass = `${inputClass} h-9 w-full rounded-md px-3 text-sm`;

type MerchantOption = { id: string; name: string };

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

/**
 * Mirrors the CHECK constraints on merchant_cashback_boosts so the admin gets a
 * readable message instead of a Postgres error.
 */
export function validateBoost(boost: CashbackBoost): string | null {
  if (!boost.name.trim()) return "Give the boost a name.";
  if (!boost.entity_id) return "Choose a merchant.";
  if (!boost.starts_at || !boost.ends_at) return "Set both a start and an end.";
  if (new Date(boost.ends_at).getTime() <= new Date(boost.starts_at).getTime()) {
    return "The end must be later than the start.";
  }

  const value = boost.boost_value;
  if (value == null) return "Set a boost value.";
  if (boost.boost_mode === "ADD" && (value <= 0 || value > 100)) {
    return "Added percentage points must be above 0 and at most 100.";
  }
  if (boost.boost_mode === "MULTIPLY" && (value <= 1 || value > 100)) {
    return "A multiplier must be greater than 1 — otherwise it is not a boost.";
  }
  if (boost.boost_mode === "OVERRIDE" && (value < 0 || value > 100)) {
    return "An override rate must be between 0 and 100.";
  }

  if (Boolean(boost.start_time) !== Boolean(boost.end_time)) {
    return "Set both a daily start and end time, or neither.";
  }
  if (
    boost.max_rate_percent != null &&
    (boost.max_rate_percent <= 0 || boost.max_rate_percent > 100)
  ) {
    return "The maximum rate must be between 0 and 100.";
  }
  for (const [value_, label] of [
    [boost.max_cashback_per_transaction, "cap per transaction"],
    [boost.budget_amount, "total budget"],
  ] as const) {
    if (value_ != null && value_ <= 0) return `The ${label} must be greater than 0.`;
  }
  if (boost.min_bill_amount != null && boost.min_bill_amount < 0) {
    return "The minimum bill cannot be negative.";
  }
  return null;
}

export default function BoostEditor({
  open,
  onOpenChange,
  boost,
  onChange,
  onSave,
  saving,
  merchantName,
  lockMerchant = false,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  boost: CashbackBoost | null;
  onChange: (next: CashbackBoost) => void;
  onSave: (boost: CashbackBoost) => void;
  saving: boolean;
  /** Name of the already-selected merchant, resolved by the list page. */
  merchantName?: string;
  /** Opened from a merchant's own page: the merchant is fixed, so hide the picker. */
  lockMerchant?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<MerchantOption[]>([]);
  const [searching, setSearching] = useState(false);
  // Only set when the admin picks from the results; otherwise the name the
  // parent already resolved for the list stands.
  const [pickedName, setPickedName] = useState<string | null>(null);
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

  const entityTable = BOOST_ENTITY_TYPES.find(
    (option) => option.value === boost?.entity_type
  )?.table;
  const selectedName = pickedName ?? merchantName ?? "";

  const runSearch = useCallback(
    async (term: string) => {
      if (!entityTable || term.trim().length < 2) {
        setOptions([]);
        return;
      }
      setSearching(true);
      const { data } = await supabaseBrowser
        .from(entityTable)
        .select("id, name")
        .ilike("name", `%${term.trim()}%`)
        .order("name")
        .limit(20);
      setOptions(
        (data || []).map((row) => ({ id: String(row.id), name: String(row.name ?? "") }))
      );
      setSearching(false);
    },
    [entityTable]
  );

  useEffect(() => {
    const timer = setTimeout(() => void runSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search, runSearch]);

  if (!boost) return null;

  const set = (patch: Partial<CashbackBoost>) => onChange({ ...boost, ...patch });
  const mode = BOOST_MODES.find((option) => option.value === boost.boost_mode);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{boost.id ? "Edit boost" : "New cashback boost"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Boost name">
              <Input
                className={inputClass}
                placeholder="Diwali double cashback"
                value={boost.name}
                onChange={(e) => set({ name: e.target.value })}
              />
            </Field>
            <Field label="Priority" hint="Lower wins if several boosts are live at once.">
              <Input
                className={inputClass}
                type="number"
                value={boost.priority}
                onChange={(e) => set({ priority: Number(e.target.value) || 0 })}
              />
            </Field>
          </div>

          {/* ── Merchant ── */}
          <div
            className="space-y-3 rounded-md border border-gray-200 bg-gray-50/60 p-3"
            hidden={lockMerchant}
          >
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Merchant
            </h4>
            <div className="grid gap-3 md:grid-cols-[160px_1fr]">
              <Field label="Type">
                <select
                  className={selectClass}
                  value={boost.entity_type}
                  onChange={(e) => {
                    set({ entity_type: e.target.value, entity_id: "" });
                    setPickedName("");
                    setSearch("");
                    setOptions([]);
                  }}
                >
                  {BOOST_ENTITY_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label={selectedName ? `Selected: ${selectedName}` : "Search by name"}
                hint={searching ? "Searching…" : "Type at least 2 characters."}
              >
                <Input
                  className={inputClass}
                  placeholder="Start typing a merchant name"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </Field>
            </div>

            {options.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded border border-gray-200 bg-white">
                {options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      set({ entity_id: option.id });
                      setPickedName(option.name);
                      setSearch("");
                      setOptions([]);
                    }}
                    className={`block w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                      boost.entity_id === option.id ? "bg-orange-50 font-medium" : ""
                    }`}
                  >
                    {option.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── The boost itself ── */}
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Boost type" hint={mode?.hint}>
              <select
                className={selectClass}
                value={boost.boost_mode}
                onChange={(e) => set({ boost_mode: e.target.value })}
              >
                {BOOST_MODES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={`Value (${mode?.unit ?? ""})`}>
              <Input
                className={inputClass}
                type="number"
                min={0}
                step="0.01"
                value={boost.boost_value ?? ""}
                onChange={(e) => set({ boost_value: numberOrNull(e.target.value) })}
              />
            </Field>
          </div>

          {/* ── Tier targeting and the resulting per-tier rates ── */}
          <div className="space-y-3 rounded-md border border-gray-200 bg-gray-50/60 p-3">
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Applies to tiers
              </h4>
              <p className="text-[11px] text-gray-400">
                Select none to boost every tier. Each tier is boosted from its own plan rate.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {plans.length === 0 ? (
                <span className="text-[12px] text-gray-500">
                  No active plans found — configure them under Subscription Plans.
                </span>
              ) : (
                plans.map((plan) => {
                  const selected = boost.tiers.includes(plan.tier);
                  return (
                    <button
                      key={plan.tier}
                      type="button"
                      onClick={() =>
                        set({
                          tiers: selected
                            ? boost.tiers.filter((tier) => tier !== plan.tier)
                            : [...boost.tiers, plan.tier],
                        })
                      }
                      className={`cursor-pointer rounded-full border px-3 py-1 text-xs capitalize transition ${
                        selected
                          ? "border-[#FF4800] bg-[#FF4800] text-white"
                          : "border-gray-300 bg-white text-gray-600"
                      }`}
                    >
                      {plan.tier}
                    </button>
                  );
                })
              )}
            </div>

            {plans.length > 0 && (
              <div className="overflow-x-auto rounded border border-gray-200 bg-white">
                <table className="w-full min-w-[420px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-500">
                      <th className="px-3 py-2 font-semibold">Tier</th>
                      <th className="px-3 py-2 font-semibold">Now</th>
                      <th className="px-3 py-2 font-semibold">With boost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tierRates(boost, plans).map((row) => (
                      <tr key={row.tier} className="border-b border-gray-200 last:border-b-0">
                        <td className="px-3 py-2">
                          <span className="font-medium capitalize text-[#1D293D]">{row.tier}</span>
                          {row.planName && (
                            <span className="ml-2 text-[11px] text-gray-400">{row.planName}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[#5b6473]">{row.baseRate}%</td>
                        <td className="px-3 py-2">
                          {row.targeted && row.boostedRate !== row.baseRate ? (
                            <span className="font-semibold text-green-700">
                              {row.boostedRate}%
                              <span className="ml-1 text-[11px] font-normal text-green-600">
                                +{Number((row.boostedRate - row.baseRate).toFixed(2))}
                              </span>
                            </span>
                          ) : (
                            <span className="text-gray-400">
                              {row.boostedRate}%
                              {!row.targeted && (
                                <span className="ml-1 text-[11px]">not targeted</span>
                              )}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <Textarea
            placeholder="Description — what this boost is for"
            value={boost.description ?? ""}
            onChange={(e) => set({ description: e.target.value })}
          />

          {/* ── Window ── */}
          <div className="grid gap-3 md:grid-cols-4">
            <Field label="Starts at">
              <Input
                className={inputClass}
                type="datetime-local"
                value={boost.starts_at}
                onChange={(e) => set({ starts_at: e.target.value })}
              />
            </Field>
            <Field label="Ends at">
              <Input
                className={inputClass}
                type="datetime-local"
                value={boost.ends_at}
                onChange={(e) => set({ ends_at: e.target.value })}
              />
            </Field>
            <Field label="Daily from" hint="Optional happy hour.">
              <Input
                className={inputClass}
                type="time"
                value={boost.start_time ?? ""}
                onChange={(e) => set({ start_time: e.target.value || null })}
              />
            </Field>
            <Field label="Daily to" hint="May wrap past midnight.">
              <Input
                className={inputClass}
                type="time"
                value={boost.end_time ?? ""}
                onChange={(e) => set({ end_time: e.target.value || null })}
              />
            </Field>
          </div>

          <Field label="Days of week — none selected means every day">
            <div className="flex flex-wrap gap-2">
              {BOOST_DAY_OPTIONS.map((day) => {
                const selected = (boost.days_of_week || []).includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() =>
                      set({
                        days_of_week: selected
                          ? boost.days_of_week.filter((value) => value !== day.value)
                          : [...boost.days_of_week, day.value].sort((a, b) => a - b),
                      })
                    }
                    className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition ${
                      selected
                        ? "border-[#FF4800] bg-[#FF4800] text-white"
                        : "border-gray-300 bg-white text-gray-600"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* ── Guard rails ── */}
          <div className="space-y-3 rounded-md border border-gray-200 bg-gray-50/60 p-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Limits
            </h4>
            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Max rate (%)" hint="Hard ceiling.">
                <Input
                  className={inputClass}
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  placeholder="None"
                  value={boost.max_rate_percent ?? ""}
                  onChange={(e) => set({ max_rate_percent: numberOrNull(e.target.value) })}
                />
              </Field>
              <Field label="Cap per txn (MUR)">
                <Input
                  className={inputClass}
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="None"
                  value={boost.max_cashback_per_transaction ?? ""}
                  onChange={(e) =>
                    set({ max_cashback_per_transaction: numberOrNull(e.target.value) })
                  }
                />
              </Field>
              <Field label="Total budget (MUR)" hint="Boost stops when spent.">
                <Input
                  className={inputClass}
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Unlimited"
                  value={boost.budget_amount ?? ""}
                  onChange={(e) => set({ budget_amount: numberOrNull(e.target.value) })}
                />
              </Field>
              <Field label="Minimum bill (MUR)">
                <Input
                  className={inputClass}
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="None"
                  value={boost.min_bill_amount ?? ""}
                  onChange={(e) => set({ min_bill_amount: numberOrNull(e.target.value) })}
                />
              </Field>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
            <span className="text-sm">Active</span>
            <Switch
              checked={boost.is_active}
              onCheckedChange={(value) => set({ is_active: value })}
            />
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
            onClick={() => onSave(boost)}
            className="bg-[#FF4800] text-white hover:bg-[#D43B00]"
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

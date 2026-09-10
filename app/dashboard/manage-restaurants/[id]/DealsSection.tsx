"use client";

import { X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DAY_OF_WEEK_OPTIONS,
  DEAL_BENEFIT_LABELS,
  DEAL_PER_USER_PERIODS,
  DEAL_TYPE_BENEFIT_FIELDS,
  DEAL_TYPE_OPTIONS,
  defaultDeal,
  defaultDealTier,
  type RestaurantDealInput,
  type RestaurantDealTierInput,
} from "@/lib/restaurantAdmin";

const inputClass = "border border-gray-300 focus:border-gray-400 focus:ring-0 bg-white";
const selectClass = `${inputClass} h-9 w-full rounded-md px-3 text-sm disabled:opacity-60`;

/** Fields the tier grid shows for a deal type: what the DB requires, plus the percentage cap. */
function tierFieldsFor(dealType: string): (keyof RestaurantDealTierInput)[] {
  const required = DEAL_TYPE_BENEFIT_FIELDS[dealType] || [];
  return dealType === "percentage" ? [...required, "max_discount_amount"] : [...required];
}

function numberOrNull(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-gray-600">{label}</label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export default function DealsSection({
  deals,
  onChange,
  editMode,
  tierOptions,
}: {
  deals: RestaurantDealInput[];
  onChange: (next: RestaurantDealInput[]) => void;
  editMode: boolean;
  /** Tier slugs from the configured subscription plans. */
  tierOptions: string[];
}) {
  const update = (index: number, patch: Partial<RestaurantDealInput>) =>
    onChange(deals.map((deal, i) => (i === index ? { ...deal, ...patch } : deal)));

  const updateTier = (
    dealIndex: number,
    tierIndex: number,
    patch: Partial<RestaurantDealTierInput>
  ) =>
    update(dealIndex, {
      tiers: (deals[dealIndex].tiers || []).map((tier, i) =>
        i === tierIndex ? { ...tier, ...patch } : tier
      ),
    });

  return (
    <div className="space-y-4">
      <p className="rounded bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
        Deals are what a membership plan&apos;s <strong>deal redemptions/month</strong> quota
        counts, and each membership tier gets its own benefit value. Offers stay separate &mdash;
        they are plain bill discounts with no tier or quota.
      </p>

      {deals.length === 0 && (
        <p className="text-sm text-gray-500">No deals configured for this restaurant.</p>
      )}

      {deals.map((deal, dealIndex) => {
        const tierFields = tierFieldsFor(deal.deal_type);
        const usedTiers = new Set((deal.tiers || []).map((tier) => tier.tier));
        const availableTiers = tierOptions.filter((tier) => !usedTiers.has(tier));

        return (
          <div
            key={deal.id || dealIndex}
            className="space-y-4 rounded-md border border-gray-200 p-4"
          >
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Title">
                <Input
                  className={inputClass}
                  disabled={!editMode}
                  placeholder="Weekend brunch deal"
                  value={deal.title}
                  onChange={(e) => update(dealIndex, { title: e.target.value })}
                />
              </Field>
              <Field label="Deal type">
                <select
                  className={selectClass}
                  disabled={!editMode}
                  value={deal.deal_type}
                  onChange={(e) => update(dealIndex, { deal_type: e.target.value })}
                >
                  {DEAL_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Badge text">
                <Input
                  className={inputClass}
                  disabled={!editMode}
                  placeholder="Popular"
                  value={deal.badge_text ?? ""}
                  onChange={(e) => update(dealIndex, { badge_text: e.target.value })}
                />
              </Field>
            </div>

            <Textarea
              disabled={!editMode}
              placeholder="Description"
              value={deal.description ?? ""}
              onChange={(e) => update(dealIndex, { description: e.target.value })}
            />

            {/* ── Per-tier benefit ── */}
            <div className="space-y-2 rounded-md border border-gray-200 bg-gray-50/60 p-3">
              <div className="flex items-center justify-between">
                <h5 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Benefit per membership tier
                </h5>
                {editMode && availableTiers.length > 0 && (
                  <select
                    className={`${selectClass} h-8 w-auto`}
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      update(dealIndex, {
                        tiers: [...(deal.tiers || []), defaultDealTier(e.target.value)],
                      });
                    }}
                  >
                    <option value="">Add tier…</option>
                    {availableTiers.map((tier) => (
                      <option key={tier} value={tier}>
                        {tier}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {(deal.tiers || []).length === 0 ? (
                <p className="text-[12px] text-gray-500">
                  {tierOptions.length === 0
                    ? "No membership tiers found — configure plans under Subscription Plans first."
                    : "Add at least one tier, otherwise this deal cannot be saved."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wide text-gray-500">
                        <th className="py-1 pr-3 font-semibold">Tier</th>
                        {tierFields.map((field) => (
                          <th key={field} className="py-1 pr-3 font-semibold">
                            {DEAL_BENEFIT_LABELS[field] ?? field}
                          </th>
                        ))}
                        <th className="py-1 pr-3 font-semibold">Per-user limit</th>
                        <th className="py-1 pr-3 font-semibold">Live</th>
                        {editMode && <th className="py-1" />}
                      </tr>
                    </thead>
                    <tbody>
                      {(deal.tiers || []).map((tier, tierIndex) => (
                        <tr key={`${tier.tier}-${tierIndex}`} className="border-t border-gray-200">
                          <td className="py-2 pr-3 font-medium capitalize">{tier.tier}</td>
                          {tierFields.map((field) => (
                            <td key={field} className="py-2 pr-3">
                              {field === "free_item_label" ? (
                                <Input
                                  className={`${inputClass} h-8 min-w-[140px]`}
                                  disabled={!editMode}
                                  placeholder="Free dessert"
                                  value={(tier.free_item_label as string) ?? ""}
                                  onChange={(e) =>
                                    updateTier(dealIndex, tierIndex, {
                                      free_item_label: e.target.value,
                                    })
                                  }
                                />
                              ) : (
                                <Input
                                  className={`${inputClass} h-8 w-24`}
                                  disabled={!editMode}
                                  type="number"
                                  min={field === "benefit_percent" ? 0 : 0}
                                  max={field === "benefit_percent" ? 100 : undefined}
                                  step={
                                    field === "buy_quantity" || field === "get_quantity"
                                      ? 1
                                      : "0.01"
                                  }
                                  value={(tier[field] as number | null) ?? ""}
                                  onChange={(e) =>
                                    updateTier(dealIndex, tierIndex, {
                                      [field]: numberOrNull(e.target.value),
                                    } as Partial<RestaurantDealTierInput>)
                                  }
                                />
                              )}
                            </td>
                          ))}
                          <td className="py-2 pr-3">
                            <Input
                              className={`${inputClass} h-8 w-20`}
                              disabled={!editMode}
                              type="number"
                              min={1}
                              placeholder="—"
                              value={tier.per_user_limit ?? ""}
                              onChange={(e) =>
                                updateTier(dealIndex, tierIndex, {
                                  per_user_limit: numberOrNull(e.target.value),
                                })
                              }
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <Switch
                              checked={tier.is_active !== false}
                              disabled={!editMode}
                              onCheckedChange={(value) =>
                                updateTier(dealIndex, tierIndex, { is_active: value })
                              }
                            />
                          </td>
                          {editMode && (
                            <td className="py-2">
                              <button
                                type="button"
                                aria-label={`Remove ${tier.tier} tier`}
                                className="cursor-pointer text-gray-400 hover:text-red-600"
                                onClick={() =>
                                  update(dealIndex, {
                                    tiers: (deal.tiers || []).filter((_, i) => i !== tierIndex),
                                  })
                                }
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── Eligibility ── */}
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Minimum spend (MUR)">
                <Input
                  className={inputClass}
                  disabled={!editMode}
                  type="number"
                  min={0}
                  step="0.01"
                  value={deal.min_spend ?? ""}
                  onChange={(e) => update(dealIndex, { min_spend: numberOrNull(e.target.value) })}
                />
              </Field>
              <Field label="Maximum spend (MUR)">
                <Input
                  className={inputClass}
                  disabled={!editMode}
                  type="number"
                  min={0}
                  step="0.01"
                  value={deal.max_spend ?? ""}
                  onChange={(e) => update(dealIndex, { max_spend: numberOrNull(e.target.value) })}
                />
              </Field>
              <Field label="Minimum party size">
                <Input
                  className={inputClass}
                  disabled={!editMode}
                  type="number"
                  min={1}
                  value={deal.min_party_size ?? ""}
                  onChange={(e) =>
                    update(dealIndex, { min_party_size: numberOrNull(e.target.value) })
                  }
                />
              </Field>
            </div>

            {/* ── Schedule ── */}
            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Starts at">
                <Input
                  className={inputClass}
                  disabled={!editMode}
                  type="datetime-local"
                  value={deal.starts_at ?? ""}
                  onChange={(e) => update(dealIndex, { starts_at: e.target.value })}
                />
              </Field>
              <Field label="Ends at">
                <Input
                  className={inputClass}
                  disabled={!editMode}
                  type="datetime-local"
                  value={deal.ends_at ?? ""}
                  onChange={(e) => update(dealIndex, { ends_at: e.target.value })}
                />
              </Field>
              <Field label="Daily window from">
                <Input
                  className={inputClass}
                  disabled={!editMode}
                  type="time"
                  value={deal.start_time ?? ""}
                  onChange={(e) => update(dealIndex, { start_time: e.target.value })}
                />
              </Field>
              <Field label="Daily window to">
                <Input
                  className={inputClass}
                  disabled={!editMode}
                  type="time"
                  value={deal.end_time ?? ""}
                  onChange={(e) => update(dealIndex, { end_time: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Days of week — none selected means every day">
              <div className="flex flex-wrap gap-2">
                {DAY_OF_WEEK_OPTIONS.map((day) => {
                  const selected = (deal.days_of_week || []).includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      disabled={!editMode}
                      onClick={() => {
                        const current = deal.days_of_week || [];
                        update(dealIndex, {
                          days_of_week: selected
                            ? current.filter((value) => value !== day.value)
                            : [...current, day.value].sort((a, b) => a - b),
                        });
                      }}
                      className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition disabled:cursor-not-allowed disabled:opacity-60 ${
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

            {/* ── Channels & limits ── */}
            <div className="grid gap-3 md:grid-cols-3">
              <Toggle
                label="Dine-in"
                checked={deal.dine_in !== false}
                disabled={!editMode}
                onCheckedChange={(value) => update(dealIndex, { dine_in: value })}
              />
              <Toggle
                label="Takeaway"
                checked={Boolean(deal.takeaway)}
                disabled={!editMode}
                onCheckedChange={(value) => update(dealIndex, { takeaway: value })}
              />
              <Toggle
                label="Delivery"
                checked={Boolean(deal.delivery)}
                disabled={!editMode}
                onCheckedChange={(value) => update(dealIndex, { delivery: value })}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Total redemptions">
                <Input
                  className={inputClass}
                  disabled={!editMode}
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  value={deal.total_redemption_limit ?? ""}
                  onChange={(e) =>
                    update(dealIndex, { total_redemption_limit: numberOrNull(e.target.value) })
                  }
                />
              </Field>
              <Field label="Per user">
                <Input
                  className={inputClass}
                  disabled={!editMode}
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  value={deal.per_user_limit ?? ""}
                  onChange={(e) =>
                    update(dealIndex, { per_user_limit: numberOrNull(e.target.value) })
                  }
                />
              </Field>
              <Field label="Per user, per">
                <select
                  className={selectClass}
                  disabled={!editMode}
                  value={deal.per_user_period ?? "month"}
                  onChange={(e) => update(dealIndex, { per_user_period: e.target.value })}
                >
                  {DEAL_PER_USER_PERIODS.map((period) => (
                    <option key={period} value={period}>
                      {period}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Per day (all users)">
                <Input
                  className={inputClass}
                  disabled={!editMode}
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  value={deal.per_day_limit ?? ""}
                  onChange={(e) =>
                    update(dealIndex, { per_day_limit: numberOrNull(e.target.value) })
                  }
                />
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <Toggle
                label="Stackable"
                checked={Boolean(deal.is_stackable)}
                disabled={!editMode}
                onCheckedChange={(value) => update(dealIndex, { is_stackable: value })}
              />
              <Toggle
                label="Booking required"
                checked={Boolean(deal.advance_booking_required)}
                disabled={!editMode}
                onCheckedChange={(value) =>
                  update(dealIndex, { advance_booking_required: value })
                }
              />
              <Toggle
                label="Active"
                checked={deal.is_active !== false}
                disabled={!editMode}
                onCheckedChange={(value) => update(dealIndex, { is_active: value })}
              />
              <Field label="Priority — lower wins">
                <Input
                  className={inputClass}
                  disabled={!editMode}
                  type="number"
                  value={deal.priority ?? 100}
                  onChange={(e) => update(dealIndex, { priority: numberOrNull(e.target.value) })}
                />
              </Field>
            </div>

            <Field label="Terms — one per line">
              <Textarea
                disabled={!editMode}
                placeholder={"Not valid on public holidays\nDine-in only"}
                value={(deal.terms || []).join("\n")}
                onChange={(e) =>
                  update(dealIndex, {
                    terms: e.target.value
                      .split("\n")
                      .map((line) => line.trim())
                      .filter(Boolean),
                  })
                }
              />
            </Field>

            {editMode && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => onChange(deals.filter((_, i) => i !== dealIndex))}
                >
                  Remove deal
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {editMode && (
        <Button variant="outline" onClick={() => onChange([...deals, defaultDeal()])}>
          Add deal
        </Button>
      )}
    </div>
  );
}

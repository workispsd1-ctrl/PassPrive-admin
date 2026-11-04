"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTimeLocal, getOfferDateMinimum } from "@/lib/restaurantAdmin";
import { RedeemPinBadge, pinRefOf, useRedeemPins } from "@/components/RedeemPin";

export type EditableOffer = {
  title?: string | null;
  description?: string | null;
  badge_text?: string | null;
  offer_type?: string | null;
  discount_value?: number | null;
  min_spend?: number | null;
  start_at?: string | null;
  end_at?: string | null;
  is_active?: boolean;
  metadata?: Record<string, unknown> | null;
};

const inputClass = "border border-gray-300 focus:border-gray-400 focus:ring-0 bg-white";

const OFFER_TYPE_OPTIONS = [
  { value: "percentage", label: "Percentage" },
  { value: "flat", label: "Flat" },
  { value: "cover_discount", label: "Cover discount" },
] as const;

export function emptyOffer(): EditableOffer {
  return {
    title: "",
    description: "",
    badge_text: "",
    offer_type: "",
    discount_value: null,
    min_spend: null,
    start_at: "",
    end_at: "",
    is_active: true,
    metadata: null,
  };
}

function amountLabel(offerType?: string | null) {
  const type = offerType?.toLowerCase();
  if (type === "percentage" || type === "percent") return "Discount percentage";
  if (type === "cover_discount") return "Cover discount amount";
  return "Flat amount";
}

const toNumber = (value: string) => (value ? Number(value) : null);

const TIER_FIELDS = [
  { key: "free", label: "Free up to %", share: 0.25 },
  { key: "plus", label: "Plus up to %", share: 0.5 },
  { key: "black", label: "Black up to %", share: 1 },
] as const;

const isPercentType = (offerType?: string | null) => {
  const type = offerType?.toLowerCase();
  return type === "percentage" || type === "percent";
};

function tierPercents(offer: EditableOffer): Record<string, number> {
  const raw = offer.metadata?.tier_percents;
  return raw && typeof raw === "object" ? (raw as Record<string, number>) : {};
}

function tierOrderWarning(offer: EditableOffer) {
  const set = tierPercents(offer);
  const value = (key: string, share: number) =>
    Number(set[key]) || (Number(offer.discount_value) || 0) * share;
  const [free, plus, black] = TIER_FIELDS.map((field) => value(field.key, field.share));
  if (free > plus || plus > black) return "Each tier should be at least as high as the tier below it.";
  return null;
}

export default function OffersEditor<T extends EditableOffer>({
  offers,
  onChange,
  disabled = false,
  restaurantId,
  storeId,
}: {
  offers: T[];
  onChange: (next: T[]) => void;
  disabled?: boolean;
  restaurantId?: string | null;
  storeId?: string | null;
}) {
  const nowDateTimeLocal = formatDateTimeLocal();
  const pins = useRedeemPins(storeId ? "store_offer" : "restaurant_offer", storeId || restaurantId, disabled);
  const update = (index: number, patch: Partial<EditableOffer>) =>
    onChange(offers.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  const updateTier = (index: number, tier: string, value: number | null) => {
    const offer = offers[index];
    const next = { ...tierPercents(offer) };
    if (value && value > 0) next[tier] = Math.min(100, value);
    else delete next[tier];
    const metadata = { ...(offer.metadata || {}) };
    if (Object.keys(next).length) metadata.tier_percents = next;
    else delete metadata.tier_percents;
    update(index, { metadata });
  };

  return (
    <div className="space-y-4">
      {offers.map((offer, index) => (
        <div key={index} className="grid grid-cols-2 gap-4 rounded-md border border-gray-200 p-4">
          <Input className={inputClass} disabled={disabled} placeholder="Title" value={offer.title || ""} onChange={(e) => update(index, { title: e.target.value })} />
          <Input className={inputClass} disabled={disabled} placeholder="Badge text (e.g. Flat 20% OFF)" value={offer.badge_text || ""} onChange={(e) => update(index, { badge_text: e.target.value })} />
          <select className={`${inputClass} rounded-md px-3 py-2`} disabled={disabled} value={offer.offer_type || ""} onChange={(e) => update(index, { offer_type: e.target.value })}>
            <option value="">Select offer type</option>
            {OFFER_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Input className={inputClass} disabled={disabled} type="number" min={0} step="0.01" placeholder={amountLabel(offer.offer_type)} value={offer.discount_value ?? ""} onChange={(e) => update(index, { discount_value: toNumber(e.target.value) })} />
          {isPercentType(offer.offer_type) ? (
            <div className="col-span-2 space-y-2 rounded-md border border-gray-200 p-3">
              <p className="text-sm font-medium">Deal reveal % by plan</p>
              <p className="text-xs text-gray-500">
                Each member reveals a random % up to their plan&apos;s cap: Free from 1%, Plus from the Free cap, Black from the Plus cap. Leave empty to use ¼, ½ and the full discount.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {TIER_FIELDS.map((field) => (
                  <label key={field.key} className="space-y-1 text-xs text-gray-600">
                    <span>{field.label}</span>
                    <Input
                      className={inputClass}
                      disabled={disabled}
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      placeholder={offer.discount_value ? String(Number((offer.discount_value * field.share).toFixed(2))) : ""}
                      value={tierPercents(offer)[field.key] ?? ""}
                      onChange={(e) => updateTier(index, field.key, toNumber(e.target.value))}
                    />
                  </label>
                ))}
              </div>
              {tierOrderWarning(offer) ? <p className="text-xs text-red-600">{tierOrderWarning(offer)}</p> : null}
            </div>
          ) : null}
          <Input className={inputClass} disabled={disabled} type="number" min={0} step="0.01" placeholder="Minimum spend" value={offer.min_spend ?? ""} onChange={(e) => update(index, { min_spend: toNumber(e.target.value) })} />
          <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
            <span className="text-sm">Active</span>
            <Switch checked={offer.is_active !== false} disabled={disabled} onCheckedChange={(value) => update(index, { is_active: value })} />
          </div>
          {restaurantId || storeId ? <RedeemPinBadge pin={pins[pinRefOf(offer.metadata)]} /> : null}
          <Input className={inputClass} disabled={disabled} type="datetime-local" min={nowDateTimeLocal} value={offer.start_at || ""} onChange={(e) => update(index, { start_at: e.target.value })} />
          <Input className={inputClass} disabled={disabled} type="datetime-local" min={getOfferDateMinimum(offer.start_at)} value={offer.end_at || ""} onChange={(e) => update(index, { end_at: e.target.value })} />
          <Textarea className="col-span-2" disabled={disabled} placeholder="Description" value={offer.description || ""} onChange={(e) => update(index, { description: e.target.value })} />
          {!disabled && (
            <div className="col-span-2 flex justify-end">
              <Button type="button" variant="outline" onClick={() => onChange(offers.filter((_, i) => i !== index))}>
                Remove offer
              </Button>
            </div>
          )}
        </div>
      ))}
      {!disabled && (
        <Button type="button" variant="outline" onClick={() => onChange([...offers, emptyOffer() as T])}>
          Add offer
        </Button>
      )}
    </div>
  );
}

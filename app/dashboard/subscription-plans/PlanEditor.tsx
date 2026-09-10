"use client";

import { useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Check, Upload } from "lucide-react";

export const PLAN_BUCKET = "membership-plans";

export type PlanTheme = {
  baseColor?: string;
  borderColor?: string;
  textColor?: string;
  mutedColor?: string;
  accentColor?: string;
  ctaBg?: string;
  ctaColor?: string;
  heroTextColor?: string;
  shadowColor?: string;
};

export type SubscriptionPlan = {
  id: string;
  plan_name: string;
  amount: string;
  original_amount: string | null;
  type: string;
  product_id: string;
  price_id: string;
  sort_order: number;
  tier: string;
  tags: string[];
  benefits: string[];
  deals_per_month: number | null;
  deals_per_restaurant_per_month: number | null;
  cashback: number | null;
  cashback_label: string | null;
  cta_label: string | null;
  card_bg_url: string | null;
  badge_url: string | null;
  hero_bg_url: string | null;
  theme: PlanTheme;
  is_active: boolean;
};

export const PLAN_COLUMNS =
  "id, plan_name, amount, original_amount, type, product_id, price_id, sort_order, tier, tags, benefits, deals_per_month, deals_per_restaurant_per_month, cashback, cashback_label, cta_label, card_bg_url, badge_url, hero_bg_url, theme, is_active";

export const TYPE_OPTIONS = [
  { value: "free", label: "Free (no expiry)" },
  { value: "month", label: "1 month" },
  { value: "3months", label: "3 months" },
  { value: "1year", label: "1 year" },
];

/** Tiers we ship themes for. Admins may type any other tier — see tierTheme(). */
export const TIER_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "plus", label: "Plus" },
  { value: "black", label: "Black" },
];

export const FALLBACK_TIER = "plus";

export const TIER_DEFAULT_THEME: Record<string, PlanTheme> = {
  free: {
    baseColor: "#FFFFFF",
    borderColor: "rgba(76,175,80,0.45)",
    textColor: "#1A1A1A",
    mutedColor: "#888888",
    accentColor: "#4CAF50",
    ctaBg: "#4CAF50",
    ctaColor: "#FFFFFF",
    heroTextColor: "rgba(42,107,74,1)",
    shadowColor: "#000000",
  },
  plus: {
    baseColor: "#0C1A3A",
    borderColor: "rgba(59,130,246,0.22)",
    textColor: "#FFFFFF",
    mutedColor: "rgba(255,255,255,0.58)",
    accentColor: "#93C5FD",
    ctaBg: "#1E40AF",
    ctaColor: "#FFFFFF",
    heroTextColor: "#FFFFFF",
    shadowColor: "#1E40AF",
  },
  black: {
    baseColor: "#0B0B0C",
    borderColor: "rgba(230,100,0,0.55)",
    textColor: "#FFFFFF",
    mutedColor: "rgba(255,255,255,0.62)",
    accentColor: "#FFD060",
    ctaBg: "#FF5200",
    ctaColor: "#FFFFFF",
    heroTextColor: "#FFFFFF",
    shadowColor: "#FF5500",
  },
};

/** Default palette for a tier, falling back for admin-defined tiers. */
export function tierTheme(tier: string): PlanTheme {
  return TIER_DEFAULT_THEME[tier] ?? TIER_DEFAULT_THEME[FALLBACK_TIER];
}

/** cashback_label is always derived from the numeric percent, so they can't drift. */
export function cashbackLabel(cashback: number | null | undefined) {
  if (cashback == null || !Number.isFinite(cashback)) return null;
  return `${Number(cashback.toFixed(2))}%`;
}

const THEME_FIELDS: { key: keyof PlanTheme; label: string }[] = [
  { key: "baseColor", label: "Card background" },
  { key: "borderColor", label: "Card border" },
  { key: "textColor", label: "Primary text" },
  { key: "mutedColor", label: "Muted text" },
  { key: "accentColor", label: "Benefit tick" },
  { key: "ctaBg", label: "CTA background" },
  { key: "ctaColor", label: "CTA text" },
  { key: "heroTextColor", label: "Detail hero text" },
  { key: "shadowColor", label: "Card glow" },
];

export function emptyPlan(sortOrder: number): SubscriptionPlan {
  return {
    id: "",
    plan_name: "",
    amount: "",
    original_amount: "",
    type: "1year",
    product_id: "",
    price_id: "",
    sort_order: sortOrder,
    tier: "plus",
    tags: [],
    benefits: [],
    deals_per_month: null,
    deals_per_restaurant_per_month: null,
    cashback: null,
    cashback_label: "",
    cta_label: "",
    card_bg_url: "",
    badge_url: "",
    hero_bg_url: "",
    theme: tierTheme(FALLBACK_TIER),
    is_active: true,
  };
}

async function uploadPlanImage(file: File, folder: string) {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${folder}/${Date.now()}-${safe}`;
  const { error } = await supabaseBrowser.storage
    .from(PLAN_BUCKET)
    .upload(path, file, { upsert: true, cacheControl: "3600" });
  if (error) throw error;
  return supabaseBrowser.storage.from(PLAN_BUCKET).getPublicUrl(path).data.publicUrl;
}

function numOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
}

function pctOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.min(100, Number(parsed.toFixed(2)));
}

function money(value: string | null | undefined) {
  const parsed = Number(String(value ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function dealsLabel(perMonth: number | null, perRestaurant: number | null) {
  const monthly =
    perMonth == null ? "Unlimited deal redemptions/month" : `${perMonth} deal redemptions/month`;
  if (perRestaurant == null) return monthly;
  return `${monthly} · up to ${perRestaurant} per restaurant`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{title}</h4>
      {children}
    </div>
  );
}

function StringListEditor({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...values, trimmed]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      {values.map((value, i) => (
        <div key={`${value}-${i}`} className="flex items-center gap-2">
          <Input
            value={value}
            onChange={(e) => {
              const next = [...values];
              next[i] = e.target.value;
              onChange(next);
            }}
          />
          <button
            type="button"
            title="Remove"
            onClick={() => onChange(values.filter((_, idx) => idx !== i))}
            className="cursor-pointer rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button
          type="button"
          title="Add"
          onClick={add}
          className="cursor-pointer rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-[#FF4800]"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const hex = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000";
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-gray-600">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 shrink-0 cursor-pointer rounded border border-gray-300 bg-white p-0.5"
          title="Pick a solid colour"
        />
        <Input
          value={value}
          placeholder="#000000 or rgba(0,0,0,0.5)"
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function ImageField({
  label,
  hint,
  value,
  onChange,
  folder,
  previewClass,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (next: string) => void;
  folder: string;
  previewClass: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadPlanImage(file, folder));
      showToast({ title: "success", description: `${label} uploaded` });
    } catch (err) {
      console.error("[PlanEditor] upload error", err);
      showToast({ title: "error", description: `Failed to upload ${label.toLowerCase()}` });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-gray-600">{label}</label>
      <div className="flex items-center gap-3">
        <div
          className={`shrink-0 overflow-hidden rounded border border-gray-200 bg-[repeating-conic-gradient(#f3f4f6_0_25%,#fff_0_50%)] bg-[length:12px_12px] ${previewClass}`}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={label} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="flex-1 space-y-1">
          <Input
            value={value}
            placeholder="Paste an image URL, or upload"
            onChange={(e) => onChange(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="inline-flex cursor-pointer items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Upload className="h-3 w-3" />
              {busy ? "Uploading…" : "Upload"}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="cursor-pointer text-xs text-gray-500 hover:text-red-600"
              >
                Clear
              </button>
            )}
            <span className="text-[11px] text-gray-400">{hint}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CardPreview({ plan }: { plan: SubscriptionPlan }) {
  const theme = { ...tierTheme(plan.tier), ...plan.theme };
  const amount = money(plan.amount);
  const original = money(plan.original_amount);
  const monthly = amount > 0 ? Math.round(amount / 12) : 0;
  const points = [...plan.benefits, dealsLabel(plan.deals_per_month, plan.deals_per_restaurant_per_month)];

  return (
    <div
      className="rounded-2xl border p-[1px]"
      style={{ borderColor: theme.borderColor, boxShadow: `0 2px 12px ${theme.shadowColor}33` }}
    >
      <div
        className="relative overflow-hidden rounded-2xl p-4"
        style={{ backgroundColor: theme.baseColor }}
      >
        {plan.card_bg_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={plan.card_bg_url}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="relative space-y-3">
          {plan.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {plan.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[linear-gradient(90deg,#FFE082,#FFC107)] px-2 py-0.5 text-[9px] font-bold tracking-wide text-[#5D4037]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {plan.badge_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={plan.badge_url} alt="" className="h-8 object-contain" />
          ) : (
            <div className="text-[11px] font-semibold uppercase" style={{ color: theme.mutedColor }}>
              {plan.tier} badge
            </div>
          )}

          {amount > 0 ? (
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold" style={{ color: theme.accentColor }}>
                  MUR {amount.toLocaleString()}
                </span>
                <span className="text-xs" style={{ color: theme.textColor }}>
                  /yr
                </span>
                {original > 0 && (
                  <span className="ml-1 text-xs line-through" style={{ color: theme.mutedColor }}>
                    MUR {original.toLocaleString()}
                  </span>
                )}
              </div>
              {monthly > 0 && (
                <div className="text-[11px]" style={{ color: theme.mutedColor }}>
                  or MUR {monthly}/month
                </div>
              )}
            </div>
          ) : (
            <div className="text-2xl font-bold" style={{ color: theme.textColor }}>
              Free
            </div>
          )}

          <div className="space-y-1.5">
            {points.map((point, i) => (
              <div key={`${point}-${i}`} className="flex items-start gap-1.5">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: theme.accentColor }} />
                <span className="text-xs" style={{ color: theme.textColor }}>
                  {point}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <div
              className="flex-1 rounded-full border py-1.5 text-center text-xs font-semibold"
              style={{ borderColor: theme.mutedColor, color: theme.textColor }}
            >
              Know more
            </div>
            {plan.cta_label ? (
              <div
                className="flex-1 rounded-full py-1.5 text-center text-xs font-semibold"
                style={{ backgroundColor: theme.ctaBg, color: theme.ctaColor }}
              >
                {plan.cta_label}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlanEditor({
  open,
  onOpenChange,
  plan,
  onChange,
  onSave,
  knownTiers = [],
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  plan: SubscriptionPlan | null;
  onChange: (next: SubscriptionPlan) => void;
  onSave: (plan: SubscriptionPlan) => void;
  /** Tiers already in use by other plans, offered as suggestions. */
  knownTiers?: string[];
}) {
  if (!plan) return null;

  const tierSuggestions = Array.from(
    new Set([...TIER_OPTIONS.map((opt) => opt.value), ...knownTiers].filter(Boolean))
  );
  const theme = { ...tierTheme(plan.tier), ...plan.theme };
  const set = (patch: Partial<SubscriptionPlan>) => onChange({ ...plan, ...patch });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-gray-300 bg-white sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{plan.id ? "Edit Customer Plan" : "Add Customer Plan"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-2 md:grid-cols-[1fr_280px]">
          <div className="space-y-6">
            <Section title="Plan">
              <Input
                placeholder="Plan Name"
                value={plan.plan_name}
                onChange={(e) => set({ plan_name: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-600">Tier</label>
                  <Input
                    list="plan-tier-options"
                    value={plan.tier}
                    placeholder="black"
                    onChange={(e) => set({ tier: e.target.value.trim().toLowerCase() })}
                  />
                  <datalist id="plan-tier-options">
                    {tierSuggestions.map((tier) => (
                      <option key={tier} value={tier} />
                    ))}
                  </datalist>
                  <p className="text-[11px] text-gray-400">
                    The tier saved on the user after payment. Type any name to define a new
                    tier &mdash; set its look under Colours.
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-600">Duration</label>
                  <select
                    value={plan.type}
                    onChange={(e) => set({ type: e.target.value })}
                    className="w-full rounded border px-3 py-2 text-sm"
                  >
                    {TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="plan_active"
                  type="checkbox"
                  checked={plan.is_active}
                  onChange={(e) => set({ is_active: e.target.checked })}
                  className="h-4 w-4 cursor-pointer accent-[#FF4800]"
                />
                <label htmlFor="plan_active" className="cursor-pointer text-sm text-gray-700">
                  Visible in the app
                </label>
              </div>
            </Section>

            <Section title="Pricing">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-600">Selling price (MUR)</label>
                  <Input
                    value={plan.amount}
                    placeholder="7000"
                    onChange={(e) => set({ amount: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-600">
                    Struck-through price (MUR)
                  </label>
                  <Input
                    value={plan.original_amount ?? ""}
                    placeholder="9000 — blank hides it"
                    onChange={(e) => set({ original_amount: e.target.value })}
                  />
                </div>
              </div>
            </Section>

            <Section title="Tags">
              <StringListEditor
                values={plan.tags}
                onChange={(tags) => set({ tags })}
                placeholder="e.g. LIMITED TIME OFFER — press Enter"
              />
            </Section>

            <Section title="Plan points">
              <StringListEditor
                values={plan.benefits}
                onChange={(benefits) => set({ benefits })}
                placeholder="e.g. 3% Cashback (6x) — press Enter"
              />
            </Section>

            <Section title="Deal redemption">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-600">Deals per month</label>
                  <Input
                    type="number"
                    min={0}
                    value={plan.deals_per_month ?? ""}
                    placeholder="Blank = unlimited"
                    onChange={(e) => set({ deals_per_month: numOrNull(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-600">
                    Per restaurant, per month
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={plan.deals_per_restaurant_per_month ?? ""}
                    placeholder="Blank = unlimited"
                    onChange={(e) =>
                      set({ deals_per_restaurant_per_month: numOrNull(e.target.value) })
                    }
                  />
                </div>
              </div>
              <p className="rounded bg-amber-50 px-2 py-1.5 text-[11px] text-amber-700">
                Shown to users as a plan point. Not enforced at redemption yet.
              </p>
            </Section>

            <Section title="Copy">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-600">Cashback %</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    value={plan.cashback ?? ""}
                    placeholder="4"
                    onChange={(e) => set({ cashback: pctOrNull(e.target.value) })}
                  />
                  <p className="text-[11px] text-gray-400">
                    {plan.cashback == null
                      ? "Blank means no cashback for this plan."
                      : `Shown in the app as ${cashbackLabel(plan.cashback)} \u00b7 used for corporate quotes.`}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-600">CTA label</label>
                  <Input
                    value={plan.cta_label ?? ""}
                    placeholder="Upgrade to Black — blank hides the button"
                    onChange={(e) => set({ cta_label: e.target.value })}
                  />
                </div>
              </div>
            </Section>

            <Section title="Artwork">
              <ImageField
                label="Card background"
                hint="Shown behind the plan card"
                folder="card-bg"
                previewClass="h-14 w-24"
                value={plan.card_bg_url ?? ""}
                onChange={(card_bg_url) => set({ card_bg_url })}
              />
              <ImageField
                label="Tier badge"
                hint="Transparent PNG/WebP"
                folder="badge"
                previewClass="h-14 w-14"
                value={plan.badge_url ?? ""}
                onChange={(badge_url) => set({ badge_url })}
              />
              <ImageField
                label="Detail hero background"
                hint="Top of the Know more screen"
                folder="hero-bg"
                previewClass="h-14 w-24"
                value={plan.hero_bg_url ?? ""}
                onChange={(hero_bg_url) => set({ hero_bg_url })}
              />
            </Section>

            <Section title="Colours">
              <div className="grid grid-cols-2 gap-3">
                {THEME_FIELDS.map((field) => (
                  <ColorField
                    key={field.key}
                    label={field.label}
                    value={theme[field.key] ?? ""}
                    onChange={(next) => set({ theme: { ...theme, [field.key]: next } })}
                  />
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className="text-gray-400">Start from a palette:</span>
                {TIER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set({ theme: { ...TIER_DEFAULT_THEME[opt.value] } })}
                    className="cursor-pointer text-[#FF4800] hover:underline"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Billing IDs">
              <div className="grid grid-cols-3 gap-3">
                <Input
                  placeholder="Product ID"
                  value={plan.product_id}
                  onChange={(e) => set({ product_id: e.target.value })}
                />
                <Input
                  placeholder="Price ID"
                  value={plan.price_id}
                  onChange={(e) => set({ price_id: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Sort Order"
                  value={plan.sort_order}
                  onChange={(e) => set({ sort_order: Number(e.target.value) })}
                />
              </div>
            </Section>
          </div>

          <div className="space-y-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              App preview
            </h4>
            <div className="sticky top-2 rounded-xl bg-[#F4F4F4] p-3">
              <CardPreview plan={plan} />
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
            onClick={() => onSave(plan)}
            className="bg-[#FF4800] text-white hover:bg-[#D43B00]"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

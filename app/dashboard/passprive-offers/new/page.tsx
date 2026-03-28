"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2, Plus, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/hooks/useToast";
import { getTokenClient } from "@/lib/getTokenClient";

const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:8000";

const OFFER_BASE_PATH = "/api/passprive-offers";

const OFFER_TYPES = ["PERCENTAGE", "FLAT"] as const;
const SCOPES = [
  "ALL_STORES",
  "AD_SUBSCRIBED_STORES",
  "PLAN_SUBSCRIBED_STORES",
  "SELECTED_STORES",
] as const;
const ELIGIBILITY_TYPES = [
  "NONE",
  "NEW_USERS_ONLY",
  "EXISTING_USERS_ONLY",
  "MEMBERS_ONLY",
] as const;
const TERMS_PRESET_BUILDERS = [
  {
    id: "min_bill",
    label: (minimumBillAmount: string) =>
      `Valid on final bill value of ${
        minimumBillAmount.trim() ? minimumBillAmount.trim() : "[minimum bill amount]"
      }.`,
  },
  { id: "once_per_user", label: "Valid once per user during the campaign period." },
  { id: "selected_brands", label: "Applicable only on selected brands." },
  { id: "participating_stores", label: "Applicable only at participating stores on PassPrive." },
  { id: "campaign_period", label: "Offer valid only during the campaign period." },
  { id: "eligible_items", label: "Applicable only on eligible menu items, products, or services." },
  {
    id: "charges_excluded",
    label: "Not valid on taxes, service charges, packaging charges, delivery fees, or other statutory levies.",
  },
  {
    id: "non_stackable",
    label: "Cannot be combined with any other offer, coupon, voucher, cashback, or promotion unless explicitly stated.",
  },
  { id: "once_per_transaction", label: "Offer can be redeemed only once per transaction." },
  { id: "dine_in_only", label: "Applicable only on dine-in bills unless otherwise stated." },
  { id: "store_only", label: "Applicable only on store purchases unless otherwise stated." },
  { id: "eligible_users", label: "Valid only for members or eligible users, wherever applicable." },
  { id: "net_bill", label: "Offer will be applied on the net eligible bill amount only." },
  { id: "merchant_availability", label: "Offer is subject to merchant participation and availability." },
  { id: "platform_tc", label: "Platform terms and conditions shall apply." },
] as const;

type OfferType = (typeof OFFER_TYPES)[number];
type ScopeType = (typeof SCOPES)[number];
type EligibilityType = (typeof ELIGIBILITY_TYPES)[number];

type CreateOfferForm = {
  title: string;
  subtitle: string;
  description: string;
  offer_type: OfferType;
  discount_value: string;
  currency: string;
  max_discount_amount: string;
  applies_to_scope: ScopeType;
  eligibility_type: EligibilityType;
  is_active: boolean;
  is_stackable: boolean;
  auto_apply: boolean;
  priority: string;
  minimum_bill_amount: string;
  starts_at: string;
  ends_at: string;
  banner_text: string;
  badge_text: string;
  selected_terms: string[];
  custom_terms: string;
  metadata: string;
};

const initialForm: CreateOfferForm = {
  title: "",
  subtitle: "",
  description: "",
  offer_type: "PERCENTAGE",
  discount_value: "",
  currency: "MUR",
  max_discount_amount: "",
  applies_to_scope: "ALL_STORES",
  eligibility_type: "NONE",
  is_active: true,
  is_stackable: false,
  auto_apply: true,
  priority: "100",
  minimum_bill_amount: "",
  starts_at: "",
  ends_at: "",
  banner_text: "",
  badge_text: "",
  selected_terms: [],
  custom_terms: "",
  metadata: "{}",
};

function toIsoString(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

async function getAdminHeaders() {
  const token = await getTokenClient();
  if (!token) {
    throw new Error("Not logged in. Please login again as admin or superadmin.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function parseJsonField<T>(value: string, label: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    showToast({
      title: `Invalid ${label}`,
      description: error instanceof Error ? error.message : `Please fix the ${label} JSON.`,
      type: "error",
    });
    return null;
  }
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
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export default function NewPasspriveOfferPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState<CreateOfferForm>(initialForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-full bg-[linear-gradient(135deg,_#FFF7ED_0%,_#EFF6FF_100%)] p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="animate-pulse space-y-4">
              <div className="h-4 w-40 rounded bg-slate-200" />
              <div className="h-10 w-72 rounded bg-slate-200" />
              <div className="h-4 w-full max-w-2xl rounded bg-slate-200" />
            </div>
          </section>
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-6 md:grid-cols-2">
              {Array.from({ length: 10 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <div className="h-4 w-32 rounded bg-slate-200" />
                  <div className="h-10 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  function update<K extends keyof CreateOfferForm>(key: K, value: CreateOfferForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleTerm(termId: string) {
    setForm((current) => ({
      ...current,
      selected_terms: current.selected_terms.includes(termId)
        ? current.selected_terms.filter((item) => item !== termId)
        : [...current.selected_terms, termId],
    }));
  }

  const termOptions = TERMS_PRESET_BUILDERS.map((item) => ({
    id: item.id,
    label:
      typeof item.label === "function" ? item.label(form.minimum_bill_amount) : item.label,
  }));

  async function handleSubmit() {
    if (!form.title.trim()) {
      showToast({
        title: "Title is required",
        description: "Please enter an offer title.",
        type: "error",
      });
      return;
    }

    if (!form.discount_value || Number(form.discount_value) <= 0) {
      showToast({
        title: "Invalid discount value",
        description: "Discount value must be greater than zero.",
        type: "error",
      });
      return;
    }

    const metadata = parseJsonField<Record<string, unknown>>(form.metadata, "metadata");
    if (!metadata) return;

    const selectedTerms = termOptions
      .filter((item) => form.selected_terms.includes(item.id))
      .map((item) => item.label);

    const customTerms = form.custom_terms
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    const terms = [...selectedTerms, ...customTerms];

    const payload = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      description: form.description.trim() || null,
      offer_type: form.offer_type,
      discount_value: Number(form.discount_value),
      currency: form.currency.trim() || "MUR",
      max_discount_amount: form.max_discount_amount ? Number(form.max_discount_amount) : null,
      applies_to_scope: form.applies_to_scope,
      eligibility_type: form.eligibility_type,
      is_active: form.is_active,
      is_stackable: form.is_stackable,
      auto_apply: form.auto_apply,
      priority: form.priority ? Number(form.priority) : 100,
      starts_at: toIsoString(form.starts_at) ?? null,
      ends_at: toIsoString(form.ends_at) ?? null,
      banner_text: form.banner_text.trim() || null,
      badge_text: form.badge_text.trim() || null,
      terms_and_conditions: terms,
      metadata,
    };

    try {
      setSaving(true);
      const response = await axios.post(`${backendUrl}${OFFER_BASE_PATH}`, payload, {
        headers: await getAdminHeaders(),
      });

      const offerId =
        response.data?.offer?.id ||
        response.data?.item?.id ||
        response.data?.id ||
        "";

      if (offerId && form.minimum_bill_amount && Number(form.minimum_bill_amount) > 0) {
        await axios.post(
          `${backendUrl}${OFFER_BASE_PATH}/${offerId}/conditions`,
          {
            condition_type: "MIN_BILL_AMOUNT",
            operator: "GTE",
            condition_value: Number(form.minimum_bill_amount),
            is_required: true,
            sort_order: 0,
          },
          {
            headers: await getAdminHeaders(),
          }
        );
      }

      showToast({
        title: "Offer created successfully",
        description:
          "You can now configure targets, conditions, usage limits, and redemptions.",
      });

      router.push(
        offerId
          ? `/dashboard/passprive-offers?offerId=${offerId}`
          : "/dashboard/passprive-offers"
      );
    } catch (error) {
      const description = axios.isAxiosError(error)
        ? error.response?.data?.error || error.message
        : error instanceof Error
        ? error.message
        : "Failed to create offer.";

      showToast({
        title: "Failed to create offer",
        description,
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-full bg-[linear-gradient(135deg,_#FFF7ED_0%,_#EFF6FF_100%)] p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <Link
                href="/dashboard/passprive-offers"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to PassPrive Offers
              </Link>
              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.24em] text-amber-600">
                Offers Platform
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">
                Create PassPrive Offer
              </h1>
              <p className="mt-3 text-sm text-slate-500">
                Create the base offer first, then manage targets, conditions, usage limits,
                and redemptions from the detail screen.
              </p>
            </div>
            <Button
              onClick={() => void handleSubmit()}
              disabled={saving}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Offer
                </>
              )}
            </Button>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="Title">
              <Input
                value={form.title}
                onChange={(event) => update("title", event.target.value)}
                placeholder="Weekend Saver"
              />
            </Field>

            <Field label="Subtitle">
              <Input
                value={form.subtitle}
                onChange={(event) => update("subtitle", event.target.value)}
                placeholder="Limited time member benefit"
              />
            </Field>

            <div className="md:col-span-2">
              <Field label="Description">
                <Textarea
                  value={form.description}
                  onChange={(event) => update("description", event.target.value)}
                  className="min-h-[120px]"
                  placeholder="Describe how the offer appears to admins and downstream clients."
                />
              </Field>
            </div>

            <Field label="Offer Type">
              <Select
                value={form.offer_type}
                onValueChange={(value) => update("offer_type", value as OfferType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select offer type" />
                </SelectTrigger>
                <SelectContent>
                  {OFFER_TYPES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="Discount Value"
              hint={form.offer_type === "PERCENTAGE" ? "Use percentage value, for example 15." : "Use flat monetary amount."}
            >
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.discount_value}
                onChange={(event) => update("discount_value", event.target.value)}
                placeholder={form.offer_type === "PERCENTAGE" ? "15" : "250"}
              />
            </Field>

            <Field label="Currency">
              <Input
                value={form.currency}
                onChange={(event) => update("currency", event.target.value)}
                placeholder="MUR"
              />
            </Field>

            <Field label="Max Discount Amount">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.max_discount_amount}
                onChange={(event) => update("max_discount_amount", event.target.value)}
                placeholder="Optional cap"
              />
            </Field>

            <Field label="Applies To Scope">
              <Select
                value={form.applies_to_scope}
                onValueChange={(value) => update("applies_to_scope", value as ScopeType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  {SCOPES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Eligibility Type">
              <Select
                value={form.eligibility_type}
                onValueChange={(value) => update("eligibility_type", value as EligibilityType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select eligibility" />
                </SelectTrigger>
                <SelectContent>
                  {ELIGIBILITY_TYPES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Priority" hint="Lower number appears earlier because the backend sorts ascending.">
              <Input
                type="number"
                step="1"
                value={form.priority}
                onChange={(event) => update("priority", event.target.value)}
                placeholder="100"
              />
            </Field>

            <Field
              label="Minimum Bill Amount"
              hint="If provided, a MIN_BILL_AMOUNT condition will be created automatically after the offer is saved."
            >
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.minimum_bill_amount}
                onChange={(event) => update("minimum_bill_amount", event.target.value)}
                placeholder="500"
              />
            </Field>

            <Field label="Starts At">
              <Input
                type="datetime-local"
                value={form.starts_at}
                onChange={(event) => update("starts_at", event.target.value)}
              />
            </Field>

            <Field label="Ends At">
              <Input
                type="datetime-local"
                value={form.ends_at}
                onChange={(event) => update("ends_at", event.target.value)}
              />
            </Field>

            <Field label="Banner Text">
              <Input
                value={form.banner_text}
                onChange={(event) => update("banner_text", event.target.value)}
                placeholder="Save 15% today"
              />
            </Field>

            <Field label="Badge Text">
              <Input
                value={form.badge_text}
                onChange={(event) => update("badge_text", event.target.value)}
                placeholder="Members only"
              />
            </Field>

            <div className="space-y-4 md:col-span-2">
              <p className="text-sm font-medium text-slate-700">Behavior</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) => update("is_active", event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Active
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.is_stackable}
                    onChange={(event) => update("is_stackable", event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Stackable
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.auto_apply}
                    onChange={(event) => update("auto_apply", event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Auto apply
                </label>
              </div>
            </div>

            <div className="md:col-span-2">
              <Field
                label="Terms and Conditions"
                hint="Select common terms with checkboxes, then add any extra custom terms line by line."
              >
                <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    {termOptions.map((term) => (
                      <label
                        key={term.id}
                        className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={form.selected_terms.includes(term.id)}
                          onChange={() => toggleTerm(term.id)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300"
                        />
                        <span>{term.label}</span>
                      </label>
                    ))}
                  </div>
                  <Textarea
                    value={form.custom_terms}
                    onChange={(event) => update("custom_terms", event.target.value)}
                    className="min-h-[140px]"
                    placeholder={"Add one custom term per line"}
                  />
                </div>
              </Field>
            </div>

            <div className="md:col-span-2">
              <Field
                label="Metadata"
                hint='Provide a JSON object, for example {"campaign":"winter-2026"}'
              >
                <Textarea
                  value={form.metadata}
                  onChange={(event) => update("metadata", event.target.value)}
                  className="min-h-[160px] font-mono text-xs"
                />
              </Field>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              onClick={() => void handleSubmit()}
              disabled={saving}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Offer
                </>
              )}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/passprive-offers">Cancel</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

"use client";

import { supabaseBrowser } from "@/lib/supabaseBrowser";

export const OFFER_SOURCE_TYPES = ["PLATFORM", "MERCHANT", "BANK"] as const;
export const OFFER_MODULES = ["STORES", "DINEIN", "BOTH"] as const;
export const OFFER_STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "EXPIRED", "ARCHIVED"] as const;
export const PAYMENT_FLOWS = ["BOOKING", "BILL_PAYMENT", "ORDER_PAYMENT", "ANY"] as const;
export const OFFER_TYPES = [
  "FLAT_DISCOUNT",
  "PERCENT_DISCOUNT",
  "CASHBACK",
  "BOGO",
  "REWARD_POINTS",
  "NO_COST_EMI",
  "FREEBIE",
] as const;
export const TARGET_TYPES = [
  "ALL",
  "STORE",
  "RESTAURANT",
  "CITY",
  "CATEGORY",
  "SUBCATEGORY",
  "TAG",
] as const;
export const CONDITION_TYPES = [
  "MIN_BILL_AMOUNT",
  "MAX_BILL_AMOUNT",
  "DAY_OF_WEEK",
  "TIME_WINDOW",
  "FIRST_ORDER_ONLY",
  "NEW_USER_ONLY",
  "USER_SEGMENT",
  "STORE_TYPE",
  "PAYMENT_SOURCE",
] as const;
export const CONDITION_OPERATORS = ["EQ", "NEQ", "GT", "GTE", "LT", "LTE", "IN", "NOT_IN"] as const;
export const PAYMENT_INSTRUMENT_TYPES = [
  "CARD",
  "CREDIT_CARD",
  "DEBIT_CARD",
  "UPI",
  "NET_BANKING",
  "WALLET",
  "EMI",
] as const;
export const CARD_NETWORKS = ["ANY", "VISA", "MASTERCARD", "RUPAY", "AMEX", "DINERS"] as const;
export const SPONSOR_TYPES = [
  "PLATFORM",
  "BANK",
  "CARD_NETWORK",
  "MERCHANT",
  "CO_FUNDED",
] as const;

export type OfferSourceType = (typeof OFFER_SOURCE_TYPES)[number];
export type OfferModule = (typeof OFFER_MODULES)[number];
export type OfferStatus = (typeof OFFER_STATUSES)[number];
export type PaymentFlow = (typeof PAYMENT_FLOWS)[number];
export type OfferType = (typeof OFFER_TYPES)[number];
export type PaymentInstrumentType = (typeof PAYMENT_INSTRUMENT_TYPES)[number];
export type CardNetwork = (typeof CARD_NETWORKS)[number];
export type SponsorType = (typeof SPONSOR_TYPES)[number];
export type TargetType = (typeof TARGET_TYPES)[number];
export type ConditionType = (typeof CONDITION_TYPES)[number];
export type ConditionOperator = (typeof CONDITION_OPERATORS)[number];

export type EntityOption = {
  id: string;
  name: string;
  city?: string | null;
  area?: string | null;
  category?: string | null;
  subcategory?: string | null;
};

export type PlanOption = {
  id: string;
  name: string;
};

export type OfferRecord = {
  id: string;
  source_type?: OfferSourceType;
  owner_entity_type?: string | null;
  owner_entity_id?: string | null;
  module?: OfferModule;
  payment_flow?: PaymentFlow;
  title?: string;
  short_title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  badge_text?: string | null;
  badge_kind?: string | null;
  badge_bg_color?: string | null;
  badge_text_color?: string | null;
  ribbon_text?: string | null;
  logo_url?: string | null;
  offer_type?: OfferType;
  benefit_value?: number | null;
  benefit_percent?: number | null;
  max_discount_amount?: number | null;
  currency_code?: string | null;
  min_bill_amount?: number | null;
  max_bill_amount?: number | null;
  is_auto_apply?: boolean | null;
  is_active?: boolean | null;
  is_stackable?: boolean | null;
  stack_group?: string | null;
  priority?: number | null;
  status?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  sponsor_name?: string | null;
  sponsor_type?: string | null;
  terms_and_conditions?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type OfferFormValues = {
  source_type: OfferSourceType;
  title: string;
  subtitle: string;
  description: string;
  badge_text: string;
  badge_kind: string;
  ribbon_text: string;
  logo_url: string;
  logo_file: File | null;
  offer_type: OfferType;
  benefit_value: string;
  benefit_percent: string;
  max_discount_amount: string;
  currency_code: string;
  min_bill_amount: string;
  is_auto_apply: boolean;
  is_active: boolean;
  is_stackable: boolean;
  priority: string;
  status: OfferStatus;
  starts_at: string;
  ends_at: string;
  sponsor_name: string;
  terms_and_conditions: string;
};

export type OfferTargetRecord = {
  id: string;
  target_type: string;
  target_entity_id?: string | null;
  city?: string | null;
  area?: string | null;
  category?: string | null;
  subcategory?: string | null;
  tag?: string | null;
  plan_code?: string | null;
};

export type OfferConditionRecord = {
  id: string;
  condition_type: string;
  operator: string;
  condition_value: unknown;
  is_required: boolean;
  sort_order: number;
};

export type OfferPaymentRuleRecord = {
  id: string;
  payment_instrument_type?: string | null;
  card_network?: string | null;
  issuer_bank_name?: string | null;
  requires_coupon_code?: boolean | null;
  coupon_code?: string | null;
  requires_saved_card?: boolean | null;
};

export type OfferBinRecord = {
  id: string;
  bin?: string | null;
  card_network?: string | null;
  issuer_bank_name?: string | null;
};

export type OfferUsageLimitRecord = {
  total_redemption_limit?: number | null;
  per_user_redemption_limit?: number | null;
  per_entity_redemption_limit?: number | null;
  per_day_redemption_limit?: number | null;
  budget_amount?: number | null;
  budget_consumed?: number | null;
};

export type OfferUsageLimitDraft = {
  total_redemption_limit: string;
  per_user_redemption_limit: string;
  per_store_redemption_limit: string;
  per_restaurant_redemption_limit: string;
  per_day_redemption_limit: string;
};

export type OfferRedemptionRecord = {
  id: string;
  user_id?: string | null;
  order_id?: string | null;
  status?: string | null;
  bill_amount?: number | null;
  discount_amount?: number | null;
  redeemed_at?: string | null;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeArrayPayload<T extends JsonRecord>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload.filter(isRecord) as T[];
  if (!isRecord(payload)) return [];

  const keys = [
    "data",
    "items",
    "results",
    "offers",
    "targets",
    "conditions",
    "payment_rules",
    "paymentRules",
    "bins",
    "redemptions",
  ];

  for (const key of keys) {
    if (Array.isArray(payload[key])) {
      return (payload[key] as unknown[]).filter(isRecord) as T[];
    }
  }

  return [];
}

export function normalizeObjectPayload<T extends JsonRecord>(payload: unknown): T | null {
  if (!isRecord(payload)) return null;
  const keys = ["data", "offer", "item", "result", "usage_limit", "usageLimit"];
  for (const key of keys) {
    if (isRecord(payload[key])) return payload[key] as T;
  }
  return payload as T;
}

export function numberOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseJsonInput<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function stringifyJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

export function toDateTimeInput(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function toDateInput(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function toIsoString(value: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function toEndOfDayIsoString(value: string) {
  if (!value) return null;
  const parsed = new Date(`${value}T23:59:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function toStartDateWithCurrentTimeIsoString(value: string) {
  if (!value) return null;
  const now = new Date();
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;

  const parsed = new Date(
    year,
    month - 1,
    day,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    0
  );

  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function createEmptyOfferForm(sourceType: OfferSourceType = "PLATFORM"): OfferFormValues {
  return {
    source_type: sourceType,
    title: "",
    subtitle: "",
    description: "",
    badge_text: sourceType === "PLATFORM" ? "PassPrive" : "",
    badge_kind: sourceType === "PLATFORM" ? "PASSPRIVE" : "",
    ribbon_text: "",
    logo_url: "",
    logo_file: null,
    offer_type: "PERCENT_DISCOUNT",
    benefit_value: "",
    benefit_percent: "",
    max_discount_amount: "",
    currency_code: "MUR",
    min_bill_amount: "",
    is_auto_apply: true,
    is_active: false,
    is_stackable: false,
    priority: "100",
    status: "DRAFT",
    starts_at: "",
    ends_at: "",
    sponsor_name: "",
    terms_and_conditions: "",
  };
}

export function offerToForm(record: OfferRecord | null): OfferFormValues {
  const sourceType = (record?.source_type || "PLATFORM") as OfferSourceType;
  const base = createEmptyOfferForm(sourceType);
  if (!record) return base;

  return {
    source_type: sourceType,
    title: record.title || "",
    subtitle: record.subtitle || "",
    description: record.description || "",
    badge_text: record.badge_text || "",
    badge_kind: record.badge_kind || "",
    ribbon_text: record.ribbon_text || "",
    logo_url: record.logo_url || "",
    logo_file: null,
    offer_type: (record.offer_type || base.offer_type) as OfferType,
    benefit_value: record.benefit_value?.toString() || "",
    benefit_percent: record.benefit_percent?.toString() || "",
    max_discount_amount: record.max_discount_amount?.toString() || "",
    currency_code: record.currency_code || "MUR",
    min_bill_amount: record.min_bill_amount?.toString() || "",
    is_auto_apply: record.is_auto_apply ?? true,
    is_active: record.is_active ?? false,
    is_stackable: record.is_stackable ?? false,
    priority: record.priority?.toString() || "100",
    status: (record.status || "DRAFT") as OfferStatus,
    starts_at: toDateInput(record.starts_at),
    ends_at: toDateInput(record.ends_at),
    sponsor_name: record.sponsor_name || "",
    terms_and_conditions: Array.isArray(record.terms_and_conditions)
      ? record.terms_and_conditions.filter((item): item is string => typeof item === "string").join("\n")
      : typeof record.terms_and_conditions === "string"
      ? record.terms_and_conditions
      : "",
  };
}

export function buildOfferPayload(form: OfferFormValues) {
  const safeTrim = (value: unknown) => (typeof value === "string" ? value.trim() : "");

  const terms = safeTrim(form.terms_and_conditions)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const payload = {
    source_type: form.source_type,
    module: "BOTH",
    payment_flow: "ANY",
    title: safeTrim(form.title),
    offer_type: form.offer_type,
    currency_code: safeTrim(form.currency_code) || "MUR",
    is_auto_apply: form.is_auto_apply,
    is_active: form.is_active,
    is_stackable: form.is_stackable,
    priority: numberOrNull(form.priority) ?? 100,
    status: form.status,
  } as Record<string, unknown>;

  payload.sponsor_type =
    form.source_type === "BANK"
      ? "BANK"
      : form.source_type === "MERCHANT"
      ? "MERCHANT"
      : "PLATFORM";

  if (safeTrim(form.subtitle)) payload.subtitle = safeTrim(form.subtitle);
  if (safeTrim(form.description)) payload.description = safeTrim(form.description);
  if (safeTrim(form.badge_text)) payload.badge_text = safeTrim(form.badge_text);
  if (safeTrim(form.badge_kind)) payload.badge_kind = safeTrim(form.badge_kind);
  if (safeTrim(form.ribbon_text)) payload.ribbon_text = safeTrim(form.ribbon_text);
  if (safeTrim(form.logo_url)) payload.logo_url = safeTrim(form.logo_url);
  if (numberOrNull(form.benefit_value) !== null) payload.benefit_value = numberOrNull(form.benefit_value);
  if (numberOrNull(form.benefit_percent) !== null) payload.benefit_percent = numberOrNull(form.benefit_percent);
  if (numberOrNull(form.max_discount_amount) !== null) payload.max_discount_amount = numberOrNull(form.max_discount_amount);
  if (numberOrNull(form.min_bill_amount) !== null) payload.min_bill_amount = numberOrNull(form.min_bill_amount);
  if (form.starts_at) payload.starts_at = toStartDateWithCurrentTimeIsoString(form.starts_at);
  if (form.ends_at) payload.ends_at = toEndOfDayIsoString(form.ends_at);
  if (safeTrim(form.sponsor_name)) payload.sponsor_name = safeTrim(form.sponsor_name);
  if (terms.length > 0) payload.terms_and_conditions = terms;
  payload.metadata = {};

  return {
    payload,
  } as const;
}

export function validateOfferForm(form: OfferFormValues) {
  const safeTrim = (value: unknown) => (typeof value === "string" ? value.trim() : "");

  if (!safeTrim(form.title)) return "Title is required.";
  if (!safeTrim(form.priority) || numberOrNull(form.priority) === null) return "Priority must be numeric.";
  if (form.source_type === "BANK" && !safeTrim(form.sponsor_name)) return "Bank offers require a sponsor name.";
  return null;
}

async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabaseBrowser.auth.getUser();
  if (error) throw error;
  return user?.id || null;
}

function getBankLogoStoragePath(publicUrl: string) {
  const objectPublicMatch = publicUrl.match(/\/object\/public\/[^/]+\/(.+)$/);
  if (objectPublicMatch?.[1]) return objectPublicMatch[1];
  const bucketMatch = publicUrl.match(/\/bank-offers\/(.+)$/);
  return bucketMatch?.[1] ?? null;
}

function buildBankLogoStoragePath(fileName: string) {
  const extension = fileName.split(".").pop() || "bin";
  const random = Math.random().toString(36).slice(2, 9);
  return `logos/${Date.now()}-${random}.${extension}`;
}

async function uploadOfferLogoIfNeeded(form: OfferFormValues) {
  if (!form.logo_file) return form.logo_url.trim() || null;

  const path = buildBankLogoStoragePath(form.logo_file.name);
  const { error: uploadError } = await supabaseBrowser.storage.from("bank-offers").upload(path, form.logo_file, {
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const { data } = supabaseBrowser.storage.from("bank-offers").getPublicUrl(path);
  const nextLogoUrl = data.publicUrl;

  const oldPath = getBankLogoStoragePath(form.logo_url.trim());
  if (oldPath && oldPath !== path) {
    await supabaseBrowser.storage.from("bank-offers").remove([oldPath]).catch(() => undefined);
  }

  return nextLogoUrl;
}

export async function listOffersDirect() {
  const { data, error } = await supabaseBrowser
    .from("offers")
    .select("*")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as OfferRecord[];
}

export async function saveOfferDirect(offerId: string | undefined, form: OfferFormValues) {
  const payloadResult = buildOfferPayload(form);
  const userId = await getCurrentUserId();
  const logoUrl = form.source_type === "BANK" ? await uploadOfferLogoIfNeeded(form) : form.logo_url.trim() || null;

  const payload: Record<string, unknown> = {
    ...payloadResult.payload,
    logo_url: logoUrl,
    updated_by: userId,
  };

  if (!offerId) {
    if (userId) payload.created_by = userId;
    const { data, error } = await supabaseBrowser.from("offers").insert(payload).select("*").single();
    if (error) throw error;
    return data as OfferRecord;
  }

  const { data, error } = await supabaseBrowser.from("offers").update(payload).eq("id", offerId).select("*").single();
  if (error) throw error;
  return data as OfferRecord;
}

export async function deleteOfferDirect(offerId: string) {
  const { error } = await supabaseBrowser.from("offers").delete().eq("id", offerId);
  if (error) throw error;
}

export async function fetchOfferBundle(offerId: string) {
  const [offerRes, targetsRes, conditionsRes, paymentRulesRes, binsRes, usageLimitRes, redemptionsRes] =
    await Promise.all([
      supabaseBrowser.from("offers").select("*").eq("id", offerId).maybeSingle(),
      supabaseBrowser.from("offer_targets").select("*").eq("offer_id", offerId).order("created_at", { ascending: true }),
      supabaseBrowser.from("offer_conditions").select("*").eq("offer_id", offerId).order("sort_order", { ascending: true }),
      supabaseBrowser.from("offer_payment_rules").select("*").eq("offer_id", offerId).order("created_at", { ascending: true }),
      supabaseBrowser.from("offer_bins").select("*").eq("offer_id", offerId).order("created_at", { ascending: true }),
      supabaseBrowser.from("offer_usage_limits").select("*").eq("offer_id", offerId).maybeSingle(),
      supabaseBrowser.from("offer_redemptions").select("*").eq("offer_id", offerId).order("redeemed_at", { ascending: false }),
    ]);

  if (offerRes.error) throw offerRes.error;
  if (targetsRes.error) throw targetsRes.error;
  if (conditionsRes.error) throw conditionsRes.error;
  if (paymentRulesRes.error) throw paymentRulesRes.error;
  if (binsRes.error) throw binsRes.error;
  if (usageLimitRes.error) throw usageLimitRes.error;
  if (redemptionsRes.error) throw redemptionsRes.error;

  return {
    offer: (offerRes.data || null) as OfferRecord | null,
    targets: (targetsRes.data || []) as OfferTargetRecord[],
    conditions: (conditionsRes.data || []) as OfferConditionRecord[],
    paymentRules: (paymentRulesRes.data || []) as OfferPaymentRuleRecord[],
    bins: (binsRes.data || []) as OfferBinRecord[],
    usageLimit: (usageLimitRes.data || null) as OfferUsageLimitRecord | null,
    redemptions: ((redemptionsRes.data || []) as Array<Record<string, unknown>>).map((item) => ({
      id: String(item.id || ""),
      user_id: typeof item.user_id === "string" ? item.user_id : null,
      order_id: typeof item.order_reference === "string" ? item.order_reference : null,
      status: typeof item.redemption_status === "string" ? item.redemption_status : null,
      bill_amount: typeof item.bill_amount === "number" ? item.bill_amount : typeof item.original_amount === "number" ? item.original_amount : null,
      discount_amount: typeof item.discount_amount === "number" ? item.discount_amount : null,
      redeemed_at: typeof item.redeemed_at === "string" ? item.redeemed_at : null,
    })) as OfferRedemptionRecord[],
  };
}

export function emptyUsageLimitDraft(): OfferUsageLimitDraft {
  return {
    total_redemption_limit: "",
    per_user_redemption_limit: "",
    per_store_redemption_limit: "",
    per_restaurant_redemption_limit: "",
    per_day_redemption_limit: "",
  };
}

export function usageLimitToDraft(limit: OfferUsageLimitRecord | null): OfferUsageLimitDraft {
  if (!limit) return emptyUsageLimitDraft();
  return {
    total_redemption_limit: limit.total_redemption_limit?.toString() || "",
    per_user_redemption_limit: limit.per_user_redemption_limit?.toString() || "",
    per_store_redemption_limit: limit.per_entity_redemption_limit?.toString() || "",
    per_restaurant_redemption_limit: limit.per_entity_redemption_limit?.toString() || "",
    per_day_redemption_limit: limit.per_day_redemption_limit?.toString() || "",
  };
}

export function getTargetLabel(target: OfferTargetRecord) {
  switch (target.target_type) {
    case "STORE":
      return target.target_entity_id || "Store";
    case "RESTAURANT":
      return target.target_entity_id || "Restaurant";
    case "CITY":
      return target.city || "City";
    case "AREA":
      return target.area || "Area";
    case "CATEGORY":
      return target.category || "Category";
    case "SUBCATEGORY":
      return target.subcategory || "Subcategory";
    case "TAG":
      return target.tag || "Tag";
    case "PLAN":
      return target.plan_code || "Plan";
    default:
      return "All";
  }
}

export async function createOfferTargetDirect(offerId: string, payload: Record<string, unknown>) {
  const { data, error } = await supabaseBrowser
    .from("offer_targets")
    .insert({ ...payload, offer_id: offerId })
    .select("*")
    .single();
  if (error) throw error;
  return data as OfferTargetRecord;
}

export async function deleteOfferTargetDirect(targetId: string) {
  const { error } = await supabaseBrowser.from("offer_targets").delete().eq("id", targetId);
  if (error) throw error;
}

export async function createOfferConditionDirect(offerId: string, payload: Record<string, unknown>) {
  const { data, error } = await supabaseBrowser
    .from("offer_conditions")
    .insert({ ...payload, offer_id: offerId })
    .select("*")
    .single();
  if (error) throw error;
  return data as OfferConditionRecord;
}

export async function deleteOfferConditionDirect(conditionId: string) {
  const { error } = await supabaseBrowser.from("offer_conditions").delete().eq("id", conditionId);
  if (error) throw error;
}

export async function createOfferPaymentRuleDirect(offerId: string, payload: Record<string, unknown>) {
  const { data, error } = await supabaseBrowser
    .from("offer_payment_rules")
    .insert({ ...payload, offer_id: offerId })
    .select("*")
    .single();
  if (error) throw error;
  return data as OfferPaymentRuleRecord;
}

export async function deleteOfferPaymentRuleDirect(ruleId: string) {
  const { error } = await supabaseBrowser.from("offer_payment_rules").delete().eq("id", ruleId);
  if (error) throw error;
}

export async function createOfferBinDirect(offerId: string, payload: Record<string, unknown>) {
  const { data, error } = await supabaseBrowser
    .from("offer_bins")
    .insert({ ...payload, offer_id: offerId })
    .select("*")
    .single();
  if (error) throw error;
  return data as OfferBinRecord;
}

export async function deleteOfferBinDirect(binId: string) {
  const { error } = await supabaseBrowser.from("offer_bins").delete().eq("id", binId);
  if (error) throw error;
}

export async function saveOfferUsageLimitDirect(offerId: string, value: OfferUsageLimitDraft) {
  const payload = {
    offer_id: offerId,
    total_redemption_limit: numberOrNull(value.total_redemption_limit),
    per_user_redemption_limit: numberOrNull(value.per_user_redemption_limit),
    per_entity_redemption_limit:
      numberOrNull(value.per_store_redemption_limit) ?? numberOrNull(value.per_restaurant_redemption_limit),
    per_day_redemption_limit: numberOrNull(value.per_day_redemption_limit),
  };

  const { data, error } = await supabaseBrowser
    .from("offer_usage_limits")
    .upsert(payload, { onConflict: "offer_id" })
    .select("*")
    .single();

  if (error) throw error;
  return data as OfferUsageLimitRecord;
}

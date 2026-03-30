"use client";

import axios, { AxiosRequestConfig } from "axios";

import { getTokenClient } from "@/lib/getTokenClient";

export const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:8000";

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
  entity_type?: string | null;
  entity_id?: string | null;
  store_id?: string | null;
  restaurant_id?: string | null;
  city?: string | null;
  category?: string | null;
  subcategory?: string | null;
  tag?: string | null;
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
  payment_flow?: string | null;
  payment_instrument_type?: string | null;
  card_network?: string | null;
  issuer_bank_name?: string | null;
  coupon_code?: string | null;
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
  per_store_redemption_limit?: number | null;
  per_restaurant_redemption_limit?: number | null;
  per_day_redemption_limit?: number | null;
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

async function getHeaders(contentType?: string) {
  const token = await getTokenClient();
  if (!token) throw new Error("Not logged in. Please sign in again.");

  return {
    ...(contentType ? { "Content-Type": contentType } : {}),
    Authorization: `Bearer ${token}`,
  };
}

async function apiRequest<T>(config: AxiosRequestConfig) {
  const headers = await getHeaders(config.headers?.["Content-Type"] as string | undefined);
  const response = await axios.request<T>({
    baseURL: backendUrl,
    ...config,
    headers: {
      ...headers,
      ...config.headers,
    },
  });
  return response.data;
}

export async function apiGet<T>(url: string, params?: Record<string, string | number | boolean | undefined>) {
  return apiRequest<T>({ url, method: "GET", params });
}

export async function apiPost<T>(url: string, data: unknown) {
  return apiRequest<T>({ url, method: "POST", data, headers: { "Content-Type": "application/json" } });
}

export async function apiPut<T>(url: string, data: unknown) {
  return apiRequest<T>({ url, method: "PUT", data, headers: { "Content-Type": "application/json" } });
}

export async function apiPostForm<T>(url: string, data: FormData) {
  return apiRequest<T>({ url, method: "POST", data });
}

export async function apiPutForm<T>(url: string, data: FormData) {
  return apiRequest<T>({ url, method: "PUT", data });
}

export async function apiDelete<T>(url: string) {
  return apiRequest<T>({ url, method: "DELETE" });
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
    title: safeTrim(form.title),
    offer_type: form.offer_type,
    currency_code: safeTrim(form.currency_code) || "MUR",
    is_auto_apply: form.is_auto_apply,
    is_active: form.is_active,
    is_stackable: form.is_stackable,
    priority: numberOrNull(form.priority) ?? 100,
    status: form.status,
  } as Record<string, unknown>;

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

export async function fetchOfferBundle(offerId: string) {
  const [offerRes, targetsRes, conditionsRes, paymentRulesRes, binsRes, usageLimitRes, redemptionsRes] =
    await Promise.all([
      apiGet(`/api/offers/${offerId}`),
      apiGet(`/api/offers/${offerId}/targets`),
      apiGet(`/api/offers/${offerId}/conditions`),
      apiGet(`/api/offers/${offerId}/payment-rules`),
      apiGet(`/api/offers/${offerId}/bins`),
      apiGet(`/api/offers/${offerId}/usage-limit`).catch(() => null),
      apiGet(`/api/offers/${offerId}/redemptions`).catch(() => []),
    ]);

  return {
    offer: normalizeObjectPayload<OfferRecord>(offerRes),
    targets: normalizeArrayPayload<OfferTargetRecord>(targetsRes),
    conditions: normalizeArrayPayload<OfferConditionRecord>(conditionsRes),
    paymentRules: normalizeArrayPayload<OfferPaymentRuleRecord>(paymentRulesRes),
    bins: normalizeArrayPayload<OfferBinRecord>(binsRes),
    usageLimit: usageLimitRes ? normalizeObjectPayload<OfferUsageLimitRecord>(usageLimitRes) : null,
    redemptions: normalizeArrayPayload<OfferRedemptionRecord>(redemptionsRes),
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
    per_store_redemption_limit: limit.per_store_redemption_limit?.toString() || "",
    per_restaurant_redemption_limit: limit.per_restaurant_redemption_limit?.toString() || "",
    per_day_redemption_limit: limit.per_day_redemption_limit?.toString() || "",
  };
}

export function getTargetLabel(target: OfferTargetRecord) {
  switch (target.target_type) {
    case "STORE":
      return target.store_id || target.entity_id || "Store";
    case "RESTAURANT":
      return target.restaurant_id || target.entity_id || "Restaurant";
    case "CITY":
      return target.city || "City";
    case "CATEGORY":
      return target.category || "Category";
    case "SUBCATEGORY":
      return target.subcategory || "Subcategory";
    case "TAG":
      return target.tag || "Tag";
    default:
      return "All";
  }
}

"use client";

export const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

export type StoreCampaign = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  is_active: boolean;
  max_items?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  thumbnail_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  items_count?: number | null;
  total_items?: number | null;
  item_count?: number | null;
};

export type StoreDetails = {
  id?: string;
  name?: string | null;
  city?: string | null;
  category?: string | null;
  subcategory?: string | null;
};

export type StoreCampaignItem = {
  id: string;
  section_id: string;
  store_id: string;
  source_type: "AUTO" | "MANUAL" | string;
  sort_order: number;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  store?: StoreDetails | null;
  store_name?: string | null;
  city?: string | null;
  category?: string | null;
  subcategory?: string | null;
};

export type StoreOption = {
  id: string;
  name: string;
  city?: string | null;
  category?: string | null;
  subcategory?: string | null;
};

export async function parseResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json();
  return response.text();
}

export async function getErrorFromResponse(response: Response, fallback: string) {
  const payload = await parseResponse(response).catch(() => null);
  return extractErrorMessage(payload, fallback);
}

export function extractErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    for (const key of ["message", "error", "detail"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value;
    }
  }

  return fallback;
}

export function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function extractCampaigns(payload: unknown): StoreCampaign[] {
  if (Array.isArray(payload)) return payload as StoreCampaign[];

  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  if (!record) return [];

  for (const key of ["campaigns", "sections", "data", "items", "results"]) {
    if (Array.isArray(record[key])) return record[key] as StoreCampaign[];
  }

  return [];
}

export function extractCampaign(payload: unknown): StoreCampaign | null {
  const campaigns = extractCampaigns(payload);
  if (campaigns.length) return campaigns[0];

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["campaign", "section", "data"]) {
      const value = record[key];
      if (value && typeof value === "object") {
        return value as StoreCampaign;
      }
    }

    if ("id" in record) return record as StoreCampaign;
  }

  return null;
}

export function extractItems(payload: unknown): StoreCampaignItem[] {
  if (Array.isArray(payload)) return payload as StoreCampaignItem[];

  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  if (!record) return [];

  for (const key of ["items", "data", "results"]) {
    if (Array.isArray(record[key])) return record[key] as StoreCampaignItem[];
  }

  return [];
}

export function itemCount(campaign: StoreCampaign) {
  return campaign.total_items ?? campaign.items_count ?? campaign.item_count ?? 0;
}

export function resolveStoreField(item: StoreCampaignItem, key: keyof StoreDetails) {
  const nested = item.store?.[key];
  if (typeof nested === "string" && nested.trim()) return nested;

  const flat = item[key as keyof StoreCampaignItem];
  if (typeof flat === "string" && flat.trim()) return flat;

  return "—";
}

export function isForbiddenResponse(response: Response) {
  return response.status === 403;
}

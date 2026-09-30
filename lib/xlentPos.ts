// lib/xlentPos.ts
// Client for the backend's XL-ENT (CashMag POS) endpoints under /api/pos/xlent.
// The merchant API key lives only in the backend; the admin never reads it back.
import { getTokenClient } from "@/lib/getTokenClient";

const BACKEND_URL = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:8000"
).replace(/\/+$/, "");

export type XlentConfig = {
  enabled: boolean;
  has_api_key: boolean;
  api_key_hint: string | null;
  point_of_sale_id: number | null;
  point_of_sale_name: string | null;
};

export type XlentConfigInput = {
  enabled: boolean;
  /** Blank keeps the stored key. */
  api_key: string;
  point_of_sale_id: number | null;
  point_of_sale_name: string | null;
};

export type XlentPointOfSale = { id: number; name: string; address: string };

export type XlentBookingSync = {
  id: string;
  booking_code: string | null;
  customer_name: string | null;
  booking_date: string;
  booking_time: string;
  party_size: number;
  status: string | null;
  external_pos_id: string | null;
  external_pos_reference: string | null;
  pos_sync_status: "pending" | "synced" | "failed" | "skipped" | null;
  pos_sync_error: string | null;
  pos_synced_at: string | null;
};

async function xlentRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getTokenClient();
  if (!token) throw new Error("Your session has expired. Please sign in again.");

  const res = await fetch(`${BACKEND_URL}/api/pos/xlent${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `XL-ENT request failed (${res.status})`);
  return json as T;
}

export function fetchXlentConfig(restaurantId: string) {
  return xlentRequest<XlentConfig>(`/restaurants/${restaurantId}/config`);
}

export function saveXlentConfig(restaurantId: string, input: XlentConfigInput) {
  return xlentRequest<{ ok: true }>(`/restaurants/${restaurantId}/config`, {
    method: "PUT",
    body: JSON.stringify({
      enabled: input.enabled,
      api_key: input.api_key.trim() || undefined,
      point_of_sale_id: input.point_of_sale_id,
      point_of_sale_name: input.point_of_sale_name,
    }),
  });
}

/** Pass the key being entered, or a restaurant id to use its stored key. */
export async function fetchXlentPointsOfSale(source: { apiKey?: string; restaurantId?: string }) {
  const json = await xlentRequest<{ points_of_sale: XlentPointOfSale[] }>("/points-of-sale", {
    method: "POST",
    body: JSON.stringify({
      api_key: source.apiKey?.trim() || undefined,
      restaurant_id: source.restaurantId,
    }),
  });
  return json.points_of_sale;
}

export async function fetchXlentBookingSyncs(restaurantId: string) {
  const json = await xlentRequest<{ bookings: XlentBookingSync[] }>(`/restaurants/${restaurantId}/bookings?limit=20`);
  return json.bookings;
}

export function resyncXlentBooking(bookingId: string) {
  return xlentRequest<{ booking: Partial<XlentBookingSync> }>(`/bookings/${bookingId}/resync`, { method: "POST" });
}

/** Returns an error message, or null when the input can be saved. */
export function validateXlentConfig(input: XlentConfigInput, hasStoredKey: boolean): string | null {
  if (!input.enabled) return null;
  if (!input.api_key.trim() && !hasStoredKey) return "Enter the XL-ENT API key";
  if (!input.point_of_sale_id) return "Select the XL-ENT point of sale";
  return null;
}

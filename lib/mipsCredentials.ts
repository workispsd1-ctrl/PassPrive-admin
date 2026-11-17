import { getTokenClient } from "@/lib/getTokenClient";

const BACKEND_URL = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:8000"
).replace(/\/+$/, "");

export type MerchantKind = "restaurant" | "store";

export type MipsCredentialsStatus = {
  configured: boolean;
  id_merchant_hint: string | null;
  app_id_hint: string | null;
};

async function mipsRequest(kind: MerchantKind, merchantId: string, init: RequestInit = {}): Promise<MipsCredentialsStatus> {
  const token = await getTokenClient();
  if (!token) throw new Error("Your session has expired. Please sign in again.");
  const res = await fetch(`${BACKEND_URL}/api/payments/mips/admin/${kind}/${merchantId}/credentials`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `MiPS request failed (${res.status})`);
  return json as MipsCredentialsStatus;
}

export const fetchMipsCredentials = (kind: MerchantKind, merchantId: string) => mipsRequest(kind, merchantId);

export const saveMipsCredentials = (kind: MerchantKind, merchantId: string, idMerchant: string, appId: string) =>
  mipsRequest(kind, merchantId, {
    method: "PUT",
    body: JSON.stringify({ id_merchant: idMerchant.trim(), app_id: appId.trim() }),
  });

export const removeMipsCredentials = (kind: MerchantKind, merchantId: string) =>
  mipsRequest(kind, merchantId, { method: "DELETE" });

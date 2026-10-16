"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export type RedeemPinKind = "deal" | "restaurant_offer" | "store_offer";

export function pinRefOf(metadata?: Record<string, unknown> | null) {
  const ref = metadata?.pin_ref;
  return typeof ref === "string" ? ref : "";
}

export function useRedeemPins(kind: RedeemPinKind, merchantId: string | null | undefined, refreshKey: unknown) {
  const [pins, setPins] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!merchantId) return;
    let active = true;
    supabaseBrowser
      .from("offer_redeem_pins")
      .select("ref, offer_id, pin")
      .eq("kind", kind)
      .eq(kind === "store_offer" ? "store_id" : "restaurant_id", merchantId)
      .not("offer_id", "is", null)
      .then(({ data }) => {
        if (!active) return;
        const next: Record<string, string> = {};
        for (const row of (data || []) as { ref: string; offer_id: string; pin: string }[]) {
          next[row.ref] = row.pin;
          next[row.offer_id] = row.pin;
        }
        setPins(next);
      });
    return () => {
      active = false;
    };
  }, [kind, merchantId, refreshKey]);

  return pins;
}

export function RedeemPinBadge({ pin }: { pin?: string | null }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-orange-200 bg-orange-50 px-3 py-2">
      <span className="text-sm text-gray-700">Redeem PIN</span>
      {pin ? (
        <span className="font-mono text-base font-semibold tracking-[0.3em] text-orange-700">{pin}</span>
      ) : (
        <span className="text-xs text-gray-500">Generated after save</span>
      )}
    </div>
  );
}

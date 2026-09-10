"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export type PassType = "Black" | "Premium";

export type PassRate = {
  basePrice: number;
  /** Fraction, not percent: 0.04 means 4%. */
  cashbackRate: number;
};

/** Used until the plans load, and if the matching plan is missing or unreadable. */
export const FALLBACK_PASS_RATES: Record<PassType, PassRate> = {
  Black: { basePrice: 7000, cashbackRate: 0.04 },
  Premium: { basePrice: 4000, cashbackRate: 0.02 },
};

/** Tier names a Premium pass may be stored under, oldest naming first. */
const PREMIUM_TIERS = ["plus", "premiere", "premium"];

function toNumber(value: unknown) {
  const parsed = Number(String(value ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Reads pass pricing and cashback from the subscription plans configured under
 * Subscription Plans, so a plan edit flows straight into corporate quotes.
 */
export function usePassRates() {
  const [rates, setRates] = useState<Record<PassType, PassRate>>(FALLBACK_PASS_RATES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabaseBrowser
        .from("subscription")
        .select("tier, amount, cashback, is_active, sort_order")
        .eq("is_active", true)
        .order("sort_order");

      if (cancelled) return;

      if (error || !data) {
        console.error("[usePassRates] falling back to default rates", error);
        setLoading(false);
        return;
      }

      const rowFor = (match: (tier: string) => boolean) =>
        data.find((row) => match(String(row.tier ?? "").toLowerCase()));

      const resolve = (passType: PassType, row: (typeof data)[number] | undefined): PassRate => {
        const fallback = FALLBACK_PASS_RATES[passType];
        if (!row) return fallback;
        return {
          basePrice: toNumber(row.amount) ?? fallback.basePrice,
          cashbackRate: (toNumber(row.cashback) ?? fallback.cashbackRate * 100) / 100,
        };
      };

      setRates({
        Black: resolve("Black", rowFor((tier) => tier === "black")),
        Premium: resolve("Premium", rowFor((tier) => PREMIUM_TIERS.includes(tier))),
      });
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { rates, loading };
}

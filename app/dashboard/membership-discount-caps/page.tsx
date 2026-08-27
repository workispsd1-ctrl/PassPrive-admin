"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DiscountCap {
  tier: string;
  upfront_share_pct: string;
  updated_at: string;
}

const TIER_LABELS: Record<string, string> = {
  black: "Black",
  premiere: "Plus",
  free: "Free",
};

const TIER_ORDER = ["black", "premiere", "free"];

export default function MembershipDiscountCapsPage() {
  const [rows, setRows] = useState<DiscountCap[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabaseBrowser
      .from("membership_discount_caps")
      .select("tier,upfront_share_pct,updated_at");

    if (error) {
      showToast({ title: "Could not load discount caps", type: "error" });
      setLoading(false);
      return;
    }

    const sorted = (data ?? []).slice().sort(
      (a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier)
    );
    setRows(sorted);
    setDraft(
      Object.fromEntries(sorted.map(r => [r.tier, String(r.upfront_share_pct ?? "")]))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const invalid = (value: string) => {
    const n = Number(value);
    return !Number.isFinite(n) || n < 0 || n > 100;
  };

  const dirty = rows.some(
    r => String(r.upfront_share_pct) !== String(draft[r.tier] ?? "")
  );

  const save = async () => {
    const bad = rows.find(r => invalid(draft[r.tier] ?? ""));
    if (bad) {
      showToast({
        title: `${TIER_LABELS[bad.tier] ?? bad.tier} must be between 0 and 100`,
        type: "error",
      });
      return;
    }

    setSaving(true);
    const changed = rows.filter(
      r => String(r.upfront_share_pct) !== String(draft[r.tier] ?? "")
    );

    for (const row of changed) {
      const { error } = await supabaseBrowser
        .from("membership_discount_caps")
        .update({
          upfront_share_pct: Number(draft[row.tier]),
          updated_at: new Date().toISOString(),
        })
        .eq("tier", row.tier);

      if (error) {
        showToast({
          title: `Failed to save ${TIER_LABELS[row.tier] ?? row.tier}`,
          type: "error",
        });
        setSaving(false);
        return;
      }
    }

    showToast({ title: "Discount caps updated", type: "success" });
    setSaving(false);
    load();
  };

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold text-gray-900">Membership Discount Caps</h1>
      <p className="mt-2 text-sm text-gray-600">
        Share of a merchant&apos;s upfront discount each membership tier receives. A 20%
        merchant discount at a 75% share gives the member 15% off.
      </p>

      <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        The payment backend is the source of truth for money charged. These values must
        match what it applies, otherwise the app will display a discount the customer is
        not actually given.
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-gray-500">Loading…</p>
      ) : (
        <>
          <div className="mt-6 overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Tier</th>
                  <th className="px-4 py-3 font-medium">Share of merchant discount (%)</th>
                  <th className="px-4 py-3 font-medium">Last updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const value = draft[row.tier] ?? "";
                  const bad = invalid(value);
                  return (
                    <tr key={row.tier} className="border-t border-gray-200">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {TIER_LABELS[row.tier] ?? row.tier}
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          value={value}
                          onChange={e =>
                            setDraft(prev => ({ ...prev, [row.tier]: e.target.value }))
                          }
                          className={`w-32 ${bad ? "border-red-500" : ""}`}
                        />
                        {bad ? (
                          <span className="ml-2 text-xs text-red-600">0–100</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {row.updated_at
                          ? new Date(row.updated_at).toLocaleString()
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button onClick={save} disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            {dirty ? (
              <button
                type="button"
                onClick={load}
                className="text-sm text-gray-600 underline"
              >
                Discard
              </button>
            ) : null}
          </div>

          <p className="mt-3 text-xs text-gray-500">
            The app caches these for 5 minutes, so a change can take up to 5 minutes to
            appear on device.
          </p>
        </>
      )}
    </div>
  );
}

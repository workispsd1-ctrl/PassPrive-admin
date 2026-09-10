"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import BoostEditor, { validateBoost } from "./BoostEditor";
import { deleteBoost, emptyBoost, loadBoosts, saveBoost } from "./api";
import {
  BOOST_DAY_OPTIONS,
  BOOST_STATUS_STYLES,
  boostStatus,
  describeBoost,
  toDateTimeLocal,
  type CashbackBoost,
} from "./types";

/** Row shape returned by the merchant_tier_cashback() database function. */
type TierRateRow = {
  tier: string;
  plan_name: string | null;
  base_rate: number | string | null;
  effective_rate: number | string | null;
  boost_name: string | null;
};

function asRate(value: number | string | null) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatWindow(boost: CashbackBoost) {
  const format = (value: string) =>
    new Date(value).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  const days =
    boost.days_of_week.length > 0
      ? boost.days_of_week
          .map((day) => BOOST_DAY_OPTIONS.find((option) => option.value === day)?.label)
          .filter(Boolean)
          .join(", ")
      : null;
  const time =
    boost.start_time && boost.end_time
      ? `${boost.start_time.slice(0, 5)}–${boost.end_time.slice(0, 5)}`
      : null;

  return [`${format(boost.starts_at)} → ${format(boost.ends_at)}`, days, time]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Cashback boosts for one merchant, embedded in that merchant's edit page.
 * Saves immediately rather than joining the page's Save button, because a boost
 * is its own record with its own validation.
 */
export default function MerchantBoostsPanel({
  entityType,
  entityId,
  merchantName,
}: {
  entityType: "RESTAURANT" | "STORE";
  entityId: string;
  merchantName?: string;
}) {
  const [boosts, setBoosts] = useState<CashbackBoost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<CashbackBoost | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [toDelete, setToDelete] = useState<CashbackBoost | null>(null);
  const [tierRows, setTierRows] = useState<TierRateRow[]>([]);

  const load = useCallback(async () => {
    if (!entityId) return;
    try {
      setBoosts(await loadBoosts({ entityType, entityId }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load boosts";
      showToast({ type: "error", title: "Failed to load boosts", description: message });
    }

    // What each tier earns here right now, straight from the same function the
    // payment backend is meant to call.
    const { data, error: rateError } = await supabaseBrowser.rpc("merchant_tier_cashback", {
      p_entity_type: entityType,
      p_entity_id: entityId,
    });
    if (rateError) {
      console.error("[MerchantBoosts] tier rates", rateError);
      setTierRows([]);
    } else {
      setTierRows((data || []) as TierRateRow[]);
    }

    setLoading(false);
  }, [entityType, entityId]);

  useEffect(() => {
    // load() reaches setState only after awaiting the query, so this is not the
    // synchronous cascade the rule guards against.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const handleSave = async (boost: CashbackBoost) => {
    const error = validateBoost(boost);
    if (error) {
      showToast({ type: "error", title: "Invalid boost", description: error });
      return;
    }

    setSaving(true);
    try {
      await saveBoost(boost);
      showToast({ type: "success", title: "Boost saved" });
      setEditorOpen(false);
      setEditing(null);
      await load();
    } catch (saveError: unknown) {
      const message = saveError instanceof Error ? saveError.message : "Save failed";
      showToast({ type: "error", title: "Save failed", description: message });
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteBoost(toDelete.id);
      showToast({ type: "success", title: "Boost deleted" });
      await load();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Delete failed";
      showToast({ type: "error", title: "Delete failed", description: message });
    }
    setToDelete(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] text-gray-500">
          Temporarily raise this merchant&apos;s cashback for a set period. Boosts layer on top
          of the member&apos;s tier rate — nothing here changes the permanent reward
          contribution above.{" "}
          <Link href="/dashboard/cashback-boosts" className="text-[#FF4800] hover:underline">
            See all boosts
          </Link>
        </p>
        <Button
          variant="outline"
          onClick={() => {
            setEditing(emptyBoost(entityType, entityId));
            setEditorOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Add boost
        </Button>
      </div>

      {tierRows.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-gray-200">
          <table className="w-full min-w-[480px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2 font-semibold">Tier</th>
                <th className="px-4 py-2 font-semibold">Plan rate</th>
                <th className="px-4 py-2 font-semibold">Earning here now</th>
                <th className="px-4 py-2 font-semibold">Via</th>
              </tr>
            </thead>
            <tbody>
              {tierRows.map((row) => {
                const base = asRate(row.base_rate);
                const effective = asRate(row.effective_rate);
                const boosted = effective > base;
                return (
                  <tr key={row.tier} className="border-b border-gray-200 last:border-b-0">
                    <td className="px-4 py-2">
                      <span className="font-medium capitalize text-[#1D293D]">{row.tier}</span>
                      {row.plan_name && (
                        <span className="ml-2 text-[11px] text-gray-400">{row.plan_name}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-[#5b6473]">{base}%</td>
                    <td className="px-4 py-2">
                      <span
                        className={boosted ? "font-semibold text-green-700" : "text-[#5b6473]"}
                      >
                        {effective}%
                      </span>
                      {boosted && (
                        <span className="ml-1 text-[11px] text-green-600">
                          +{Number((effective - base).toFixed(2))}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-[11px] text-gray-400">
                      {row.boost_name || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {loading ? (
        <div className="h-10 animate-pulse rounded-md bg-gray-100" />
      ) : boosts.length === 0 ? (
        <p className="text-sm text-gray-500">No cashback boosts for this merchant.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-gray-200">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2 font-semibold">Boost</th>
                <th className="px-4 py-2 font-semibold">Amount</th>
                <th className="px-4 py-2 font-semibold">Window</th>
                <th className="px-4 py-2 font-semibold">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {boosts.map((boost) => {
                const status = boostStatus(boost);
                return (
                  <tr key={boost.id} className="border-b border-gray-200 last:border-b-0">
                    <td className="px-4 py-2 font-medium text-[#1D293D]">{boost.name}</td>
                    <td className="px-4 py-2 text-[#5b6473]">
                      {describeBoost(boost)}
                      <div className="text-[11px] capitalize text-gray-400">
                        {boost.tiers.length === 0 ? "all tiers" : boost.tiers.join(", ")}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-[11px] text-[#5b6473]">
                      {formatWindow(boost)}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${BOOST_STATUS_STYLES[status]}`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          className="h-8 px-3 text-xs"
                          onClick={() => {
                            setEditing({
                              ...boost,
                              starts_at: toDateTimeLocal(boost.starts_at),
                              ends_at: toDateTimeLocal(boost.ends_at),
                            });
                            setEditorOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          className="h-8 px-3 text-xs text-red-600"
                          onClick={() => setToDelete(boost)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <BoostEditor
        key={editing?.id || "new"}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        boost={editing}
        onChange={setEditing}
        onSave={handleSave}
        saving={saving}
        merchantName={merchantName}
        lockMerchant
      />

      <Dialog open={Boolean(toDelete)} onOpenChange={(next) => !next && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete boost</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Delete <span className="font-semibold">{toDelete?.name}</span>? Cashback already
            awarded is unaffected.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              Cancel
            </Button>
            <Button className="bg-red-600 text-white hover:bg-red-700" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

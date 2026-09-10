"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { showToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import BoostEditor, { validateBoost } from "./BoostEditor";
import {
  deleteBoost,
  emptyBoost,
  loadBoosts,
  resolveMerchantNames,
  saveBoost,
} from "./api";
import {
  BOOST_DAY_OPTIONS,
  BOOST_STATUS_STYLES,
  boostStatus,
  describeBoost,
  toDateTimeLocal,
  type BoostStatus,
  type CashbackBoost,
} from "./types";

const STATUS_FILTERS: (BoostStatus | "all")[] = [
  "all",
  "live",
  "scheduled",
  "expired",
  "paused",
  "exhausted",
];

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

  return {
    range: `${format(boost.starts_at)} → ${format(boost.ends_at)}`,
    detail: [days, time].filter(Boolean).join(" · "),
  };
}

export default function CashbackBoostsPage() {
  const [boosts, setBoosts] = useState<CashbackBoost[]>([]);
  const [merchantNames, setMerchantNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BoostStatus | "all">("all");

  const [editing, setEditing] = useState<CashbackBoost | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [toDelete, setToDelete] = useState<CashbackBoost | null>(null);

  // No setState before the first await: the initial render already starts in a
  // loading state, and refreshes just swap the rows in.
  const load = useCallback(async () => {
    try {
      const rows = await loadBoosts();
      setBoosts(rows);
      setLoading(false);
      setMerchantNames(await resolveMerchantNames(rows));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load boosts";
      showToast({ title: "error", description: message });
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // load() reaches setState only after awaiting the query, so this is not the
    // synchronous cascade the rule guards against.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return boosts.filter((boost) => {
      if (statusFilter !== "all" && boostStatus(boost) !== statusFilter) return false;
      if (!term) return true;
      const merchant = (merchantNames[boost.entity_id] || "").toLowerCase();
      return boost.name.toLowerCase().includes(term) || merchant.includes(term);
    });
  }, [boosts, search, statusFilter, merchantNames]);

  const handleSave = async (boost: CashbackBoost) => {
    const error = validateBoost(boost);
    if (error) {
      showToast({ title: "error", description: error });
      return;
    }

    setSaving(true);
    try {
      await saveBoost(boost);
      showToast({ title: "success", description: "Boost saved" });
      setEditorOpen(false);
      setEditing(null);
      await load();
    } catch (saveError: unknown) {
      const message = saveError instanceof Error ? saveError.message : "Save failed";
      showToast({ title: "error", description: message });
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteBoost(toDelete.id);
      showToast({ title: "success", description: "Boost deleted" });
      await load();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Delete failed";
      showToast({ title: "error", description: message });
    }
    setToDelete(null);
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-[20px] font-semibold text-[#1D293D]">Merchant Cashback Boosts</h1>
        <p className="mt-1 text-[13px] text-gray-500">
          Temporarily raise the cashback a merchant pays, for a set period. Boosts layer on top
          of the member&apos;s tier rate and the merchant&apos;s permanent reward contribution —
          neither is modified.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="max-w-xs border border-gray-300 bg-white"
          placeholder="Search boost or merchant"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`cursor-pointer rounded-full border px-3 py-1 text-xs capitalize transition ${
                statusFilter === status
                  ? "border-[#FF4800] bg-[#FF4800] text-white"
                  : "border-gray-300 bg-white text-gray-600"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <Button
          className="ml-auto bg-[#FF4800] text-white hover:bg-[#D43B00]"
          onClick={() => {
            setEditing(emptyBoost());
            setEditorOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> New boost
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-md bg-gray-100" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          No boosts {statusFilter === "all" ? "configured yet" : `with status “${statusFilter}”`}.
        </p>
      ) : (
        <div className="w-full overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-white">
              <tr className="border-b border-gray-200 text-[12px] font-semibold text-[#1D293D]">
                <th className="px-6 py-3">Boost</th>
                <th className="px-6 py-3">Merchant</th>
                <th className="px-6 py-3">Boost</th>
                <th className="px-6 py-3">Window</th>
                <th className="px-6 py-3">Budget</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((boost) => {
                const status = boostStatus(boost);
                const window = formatWindow(boost);
                return (
                  <tr key={boost.id} className="border-b border-gray-200 text-sm">
                    <td className="px-6 py-3">
                      <div className="font-medium text-[#1D293D]">{boost.name}</div>
                      {boost.description && (
                        <div className="text-[11px] text-gray-400">{boost.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-3 text-[#5b6473]">
                      {merchantNames[boost.entity_id] || (
                        <span className="text-gray-400">Unknown merchant</span>
                      )}
                      <div className="text-[11px] capitalize text-gray-400">
                        {boost.entity_type.toLowerCase()}
                      </div>
                    </td>
                    <td className="px-6 py-3 font-medium text-[#1D293D]">
                      {describeBoost(boost)}
                      {boost.max_rate_percent != null && (
                        <div className="text-[11px] font-normal text-gray-400">
                          max {boost.max_rate_percent}%
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3 text-[#5b6473]">
                      {window.range}
                      {window.detail && (
                        <div className="text-[11px] text-gray-400">{window.detail}</div>
                      )}
                    </td>
                    <td className="px-6 py-3 text-[#5b6473]">
                      {boost.budget_amount == null ? (
                        <span className="text-gray-400">Unlimited</span>
                      ) : (
                        `${boost.budget_consumed} / ${boost.budget_amount}`
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${BOOST_STATUS_STYLES[status]}`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
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
        merchantName={editing ? merchantNames[editing.entity_id] : undefined}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        boost={editing}
        onChange={setEditing}
        onSave={handleSave}
        saving={saving}
      />

      <Dialog open={Boolean(toDelete)} onOpenChange={(next) => !next && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete boost</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Delete <span className="font-semibold">{toDelete?.name}</span>? Past cashback already
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

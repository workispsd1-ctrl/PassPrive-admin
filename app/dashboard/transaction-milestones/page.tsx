"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { showToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MilestoneEditor from "./MilestoneEditor";
import { deleteMilestone, loadMilestones, saveMilestone } from "./api";
import {
  MILESTONE_PERIODS,
  MILESTONE_REPEAT_RULES,
  describeReward,
  emptyMilestone,
  toDateTimeLocal,
  validateMilestone,
  type Milestone,
} from "./types";

function label(options: readonly { value: string; label: string }[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

export default function TransactionMilestonesPage() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Milestone | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Milestone | null>(null);

  const load = useCallback(async () => {
    try {
      setMilestones(await loadMilestones());
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load milestones";
      showToast({ type: "error", title: "Failed to load milestones", description: message });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // load() reaches setState only after awaiting the query, so this is not the
    // synchronous cascade the rule guards against.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const handleSave = async (milestone: Milestone) => {
    const error = validateMilestone(milestone);
    if (error) {
      showToast({ type: "error", title: "Invalid milestone", description: error });
      return;
    }

    setSaving(true);
    try {
      await saveMilestone(milestone);
      showToast({ type: "success", title: "Milestone saved" });
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
      await deleteMilestone(toDelete.id);
      showToast({ type: "success", title: "Milestone deleted" });
      await load();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Delete failed";
      showToast({ type: "error", title: "Delete failed", description: message });
    }
    setToDelete(null);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-[20px] font-semibold text-[#1D293D]">Transaction Milestones</h1>
          <p className="mt-1 max-w-3xl text-[13px] text-gray-500">
            Reward members for cumulative spend. Spend is counted across all merchants over the
            chosen period, and each membership tier can have its own threshold and reward.
          </p>
        </div>
        <Button
          className="bg-[#FF4800] text-white hover:bg-[#D43B00]"
          onClick={() => {
            setEditing(emptyMilestone());
            setEditorOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> New milestone
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-md bg-gray-100" />
          ))}
        </div>
      ) : milestones.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          No milestones configured yet.
        </p>
      ) : (
        <div className="space-y-3">
          {milestones.map((milestone) => (
            <div
              key={milestone.id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-[#1D293D]">{milestone.name}</h2>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        milestone.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {milestone.is_active ? "Active" : "Paused"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-gray-500">
                    {label(MILESTONE_PERIODS, milestone.period)} ·{" "}
                    {label(MILESTONE_REPEAT_RULES, milestone.repeat_rule)}
                    {milestone.min_transaction_amount != null &&
                      ` · bills under ${milestone.currency_code} ${milestone.min_transaction_amount} excluded`}
                  </p>
                  {milestone.description && (
                    <p className="mt-1 text-[12px] text-gray-400">{milestone.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="h-8 px-3 text-xs"
                    onClick={() => {
                      setEditing({
                        ...milestone,
                        starts_at: toDateTimeLocal(milestone.starts_at),
                        ends_at: toDateTimeLocal(milestone.ends_at),
                      });
                      setEditorOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 px-3 text-xs text-red-600"
                    onClick={() => setToDelete(milestone)}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              <div className="mt-3 overflow-x-auto rounded-md border border-gray-200">
                <table className="w-full min-w-[420px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-2 font-semibold">Tier</th>
                      <th className="px-4 py-2 font-semibold">Spend</th>
                      <th className="px-4 py-2 font-semibold">Reward</th>
                    </tr>
                  </thead>
                  <tbody>
                    {milestone.tiers.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-[12px] text-gray-400">
                          No tiers configured.
                        </td>
                      </tr>
                    ) : (
                      milestone.tiers.map((tier) => (
                        <tr
                          key={tier.tier}
                          className="border-b border-gray-200 last:border-b-0"
                        >
                          <td className="px-4 py-2 font-medium capitalize text-[#1D293D]">
                            {tier.tier}
                            {!tier.is_active && (
                              <span className="ml-2 text-[11px] font-normal text-gray-400">
                                paused
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-[#5b6473]">
                            {milestone.currency_code} {tier.threshold_amount ?? 0}
                          </td>
                          <td className="px-4 py-2 font-medium text-green-700">
                            {describeReward(milestone, tier)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-gray-400">
                <span>
                  Awards granted: {milestone.awards_granted}
                  {milestone.max_awards_total != null && ` / ${milestone.max_awards_total}`}
                </span>
                <span>
                  Budget:{" "}
                  {milestone.budget_amount == null
                    ? "unlimited"
                    : `${milestone.budget_consumed} / ${milestone.budget_amount} ${milestone.currency_code}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <MilestoneEditor
        key={editing?.id || "new"}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        milestone={editing}
        onChange={setEditing}
        onSave={handleSave}
        saving={saving}
      />

      <Dialog open={Boolean(toDelete)} onOpenChange={(next) => !next && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete milestone</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Delete <span className="font-semibold">{toDelete?.name}</span>? Its award history is
            deleted with it. Cashback already credited to users is unaffected.
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

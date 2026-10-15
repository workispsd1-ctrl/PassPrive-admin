"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";

type RequestRow = {
  id: string;
  plan_code: string;
  requested_access: Record<string, boolean>;
  status: "pending" | "approved" | "rejected" | "cancelled";
  created_at: string;
  reviewed_at: string | null;
  note: string | null;
  restaurant_id: string | null;
  store_id: string | null;
  restaurants: { name: string | null } | null;
  stores: { name: string | null } | null;
  requester: { full_name: string | null; email: string | null } | null;
};

const SELECT =
  "id, plan_code, requested_access, status, created_at, reviewed_at, note, restaurant_id, store_id, restaurants(name), stores(name), requester:users!subscription_requests_requested_by_fkey(full_name, email)";

const ACCESS_LABELS: Record<string, string> = {
  unlock_all: "Everything",
  time_slot_enabled: "Time slots",
  repeat_rewards_enabled: "Repeat rewards",
  dish_discounts_enabled: "Dish discounts",
  pickup_premium_enabled: "Pickup premium",
};

function fetchRequests(tab: "pending" | "done") {
  const query = supabaseBrowser.from("subscription_requests").select(SELECT).order("created_at", { ascending: false });
  return tab === "pending" ? query.eq("status", "pending") : query.neq("status", "pending").limit(100);
}

function stamp(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export default function UpgradeRequestsPage() {
  const [tab, setTab] = useState<"pending" | "done">("pending");
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetchRequests(tab).then(({ data, error }) => {
      if (!active) return;
      setLoading(false);
      if (error) {
        showToast({ type: "error", title: "Failed to load requests", description: error.message });
        return;
      }
      setRows((data as unknown as RequestRow[]) || []);
    });
    return () => {
      active = false;
    };
  }, [tab, reloadKey]);

  const switchTab = (next: "pending" | "done") => {
    if (next === tab) return;
    setLoading(true);
    setTab(next);
  };

  const review = async (row: RequestRow, approve: boolean) => {
    const note = approve ? null : window.prompt("Reason for rejecting (shown to the merchant)?") || null;
    setBusyId(row.id);
    const { error } = await supabaseBrowser.rpc("review_subscription_request", {
      in_request_id: row.id,
      in_approve: approve,
      in_note: note,
    });
    setBusyId(null);
    if (error) {
      showToast({ type: "error", title: "Could not save", description: error.message });
      return;
    }
    showToast({ type: "success", title: approve ? "Plan activated" : "Request rejected" });
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-xl font-semibold">Upgrade Requests</h1>
        <p className="text-sm text-muted-foreground">
          Merchants request premium plans from the partner dashboard. Approve only after payment is confirmed: approving activates the plan immediately.
        </p>
      </div>

      <div className="flex gap-2">
        <Button variant={tab === "pending" ? "default" : "outline"} onClick={() => switchTab("pending")}>Pending</Button>
        <Button variant={tab === "done" ? "default" : "outline"} onClick={() => switchTab("done")}>Reviewed</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tab === "pending" ? "No pending requests." : "No reviewed requests yet."}</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const merchant = row.restaurants?.name || row.stores?.name || "Unknown merchant";
            const access = Object.entries(row.requested_access || {})
              .filter(([, on]) => on)
              .map(([key]) => ACCESS_LABELS[key] || key);
            return (
              <div key={row.id} className="flex flex-wrap items-start justify-between gap-4 rounded-xl border bg-white p-4">
                <div className="space-y-1">
                  <p className="font-medium">
                    {merchant}{" "}
                    <span className="text-xs font-normal text-muted-foreground">{row.restaurant_id ? "Restaurant" : "Store"}</span>
                  </p>
                  <p className="text-sm">
                    Plan <span className="font-medium">{row.plan_code}</span>
                    {access.length ? ` · ${access.join(", ")}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Requested {stamp(row.created_at)} by {row.requester?.full_name || row.requester?.email || "—"}
                  </p>
                  {row.status !== "pending" ? (
                    <p className="text-xs text-muted-foreground">
                      {row.status} {stamp(row.reviewed_at)}
                      {row.note ? ` · ${row.note}` : ""}
                    </p>
                  ) : null}
                </div>
                {row.status === "pending" ? (
                  <div className="flex gap-2">
                    <Button variant="outline" disabled={busyId === row.id} onClick={() => review(row, false)}>Reject</Button>
                    <Button disabled={busyId === row.id} onClick={() => review(row, true)}>Approve & activate</Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

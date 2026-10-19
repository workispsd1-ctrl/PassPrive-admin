"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";

type Terminal = {
  id: string;
  label: string;
  status: "pending" | "active" | "revoked";
  restaurant_id: string | null;
  store_id: string | null;
  device_model: string | null;
  app_version: string | null;
  failed_pin_count: number;
  locked_until: string | null;
  paired_at: string | null;
  last_login_at: string | null;
  revoked_at: string | null;
  pairing_expires_at: string | null;
  created_at: string;
  restaurants: { name: string | null } | null;
  stores: { name: string | null } | null;
};

type Tab = "active" | "pending" | "revoked";

const SELECT =
  "id, label, status, restaurant_id, store_id, device_model, app_version, failed_pin_count, locked_until, paired_at, last_login_at, revoked_at, pairing_expires_at, created_at, restaurants(name), stores(name)";

function stamp(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-GB", { timeZone: "Indian/Mauritius" });
}

function isLocked(t: Terminal) {
  return !!t.locked_until && new Date(t.locked_until) > new Date();
}

export default function PosTerminalsPage() {
  const [tab, setTab] = useState<Tab>("active");
  const [rows, setRows] = useState<Terminal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    let request = supabaseBrowser.from("pos_terminals").select(SELECT).eq("status", tab).order("created_at", { ascending: false }).limit(500);
    if (tab === "pending") request = request.gt("pairing_expires_at", new Date().toISOString());
    request.then(({ data, error }) => {
      if (!active) return;
      setLoading(false);
      if (error) {
        showToast({ type: "error", title: "Failed to load terminals", description: error.message });
        return;
      }
      setRows((data as unknown as Terminal[]) || []);
    });
    return () => {
      active = false;
    };
  }, [tab, reloadKey]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((t) =>
      [t.label, t.restaurants?.name, t.stores?.name, t.device_model].some((v) => String(v || "").toLowerCase().includes(q)),
    );
  }, [rows, query]);

  const switchTab = (next: Tab) => {
    if (next === tab) return;
    setLoading(true);
    setTab(next);
  };

  const run = async (t: Terminal, fn: "pos_revoke_terminal" | "pos_unlock_terminal", confirmText: string | null, success: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusyId(t.id);
    const { error } = await supabaseBrowser.rpc(fn, { p_terminal_id: t.id });
    setBusyId(null);
    if (error) {
      showToast({ type: "error", title: "Could not save", description: error.message });
      return;
    }
    showToast({ type: "success", title: success });
    setReloadKey((k) => k + 1);
  };

  const resetPin = async (t: Terminal) => {
    const merchant = t.restaurants?.name || t.stores?.name || "this merchant";
    const pin = window.prompt(`New 4-6 digit POS PIN for ${merchant}. It applies to all of its terminals.`);
    if (!pin) return;
    setBusyId(t.id);
    const { error } = await supabaseBrowser.rpc("pos_set_pin", {
      p_restaurant_id: t.restaurant_id,
      p_store_id: t.store_id,
      p_pin: pin.trim(),
    });
    setBusyId(null);
    if (error) {
      showToast({ type: "error", title: "Could not reset PIN", description: error.message });
      return;
    }
    showToast({ type: "success", title: "POS PIN reset", description: "Tell the merchant the new PIN over a trusted channel." });
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-xl font-semibold">POS Terminals</h1>
        <p className="text-sm text-muted-foreground">
          Every POS machine linked to a restaurant or store. Merchants link terminals and set their PIN from the partner dashboard. Revoking signs a terminal out immediately.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant={tab === "active" ? "default" : "outline"} onClick={() => switchTab("active")}>Active</Button>
        <Button variant={tab === "pending" ? "default" : "outline"} onClick={() => switchTab("pending")}>Waiting to pair</Button>
        <Button variant={tab === "revoked" ? "default" : "outline"} onClick={() => switchTab("revoked")}>Revoked</Button>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search merchant, terminal or device"
          className="ml-auto h-9 w-64 rounded-md border px-3 text-sm"
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No terminals.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Merchant</th>
                <th className="px-4 py-2">Terminal</th>
                <th className="px-4 py-2">Device</th>
                <th className="px-4 py-2">Linked</th>
                <th className="px-4 py-2">Last unlock</th>
                <th className="px-4 py-2">PIN attempts</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visible.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-2">
                    <div className="font-medium">{t.restaurants?.name || t.stores?.name || "Unknown"}</div>
                    <div className="text-xs text-muted-foreground">{t.restaurant_id ? "Restaurant" : "Store"}</div>
                  </td>
                  <td className="px-4 py-2">{t.label}</td>
                  <td className="px-4 py-2 text-muted-foreground">{[t.device_model, t.app_version && `v${t.app_version}`].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{tab === "pending" ? `Code expires ${stamp(t.pairing_expires_at)}` : stamp(t.paired_at)}</td>
                  <td className="px-4 py-2 text-muted-foreground">{tab === "revoked" ? `Revoked ${stamp(t.revoked_at)}` : stamp(t.last_login_at)}</td>
                  <td className="px-4 py-2">
                    {isLocked(t) ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Locked until {stamp(t.locked_until)}</span>
                    ) : (
                      <span className="text-muted-foreground">{t.failed_pin_count ? `${t.failed_pin_count} failed` : "—"}</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-2">
                      {tab === "active" && isLocked(t) ? (
                        <Button variant="outline" size="sm" disabled={busyId === t.id} onClick={() => run(t, "pos_unlock_terminal", null, "Terminal unlocked")}>Unlock</Button>
                      ) : null}
                      {tab !== "revoked" ? (
                        <Button variant="outline" size="sm" disabled={busyId === t.id} onClick={() => resetPin(t)}>Reset PIN</Button>
                      ) : null}
                      {tab !== "revoked" ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={busyId === t.id}
                          onClick={() => run(t, "pos_revoke_terminal", `Revoke "${t.label}"? It is signed out now and must be linked again.`, "Terminal revoked")}
                        >
                          Revoke
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

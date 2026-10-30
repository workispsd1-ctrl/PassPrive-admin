"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";

type Summary = {
  restaurant_id: string;
  name: string;
  due_amount: number;
  due_count: number;
  oldest: string;
  last_paid_at: string | null;
};

type Line = {
  id: string;
  order_reference: string;
  code: string | null;
  original_amount: number;
  discount_amount: number;
  final_amount: number;
  redeemed_at: string;
  table_no: number | null;
};

type Paid = {
  id: string;
  restaurant_id: string;
  name: string;
  amount: number;
  redemption_count: number;
  reference: string | null;
  note: string | null;
  paid_at: string;
};

type Tab = "due" | "paid";

function money(n: number | string) {
  return `MUR ${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function stamp(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-GB", { timeZone: "Indian/Mauritius" });
}

export default function SettlementsPage() {
  const [tab, setTab] = useState<Tab>("due");
  const [summary, setSummary] = useState<Summary[]>([]);
  const [paid, setPaid] = useState<Paid[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [dueRes, paidRes] = await Promise.all([
        supabaseBrowser.rpc("admin_promo_settlement_summary"),
        supabaseBrowser.rpc("admin_promo_settlements", { p_limit: 200 }),
      ]);
      if (!alive) return;
      setLoading(false);
      const error = dueRes.error || paidRes.error;
      if (error) {
        showToast({ type: "error", title: "Could not load settlements", description: error.message });
        return;
      }
      setSummary((dueRes.data as Summary[]) || []);
      setPaid((paidRes.data as Paid[]) || []);
    };
    load();
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const reload = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  const open = async (restaurantId: string) => {
    if (openId === restaurantId) {
      setOpenId(null);
      return;
    }
    setOpenId(restaurantId);
    setLines([]);
    setReference("");
    setNote("");
    const { data, error } = await supabaseBrowser.rpc("admin_promo_due_lines", { p_restaurant: restaurantId });
    if (error) {
      showToast({ type: "error", title: "Could not load promo bills", description: error.message });
      return;
    }
    const rows = (data as Line[]) || [];
    setLines(rows);
    setSelected(new Set(rows.map((l) => l.id)));
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedTotal = lines.filter((l) => selected.has(l.id)).reduce((sum, l) => sum + Math.round(Number(l.discount_amount) * 100), 0) / 100;

  const settle = async (row: Summary) => {
    if (!selected.size) return;
    if (!reference.trim()) {
      showToast({ type: "error", title: "Add the payment reference", description: "Enter the bank transfer or payout reference." });
      return;
    }
    if (!window.confirm(`Mark ${money(selectedTotal)} as paid to ${row.name}? This can't be undone.`)) return;
    setBusy(true);
    const { data, error } = await supabaseBrowser.rpc("admin_settle_promo", {
      p_restaurant: row.restaurant_id,
      p_ids: [...selected],
      p_reference: reference.trim(),
      p_note: note.trim(),
    });
    setBusy(false);
    if (error || !data?.ok) {
      showToast({
        type: "error",
        title: "Could not save",
        description: data?.error === "stale_selection" ? "These promo bills changed. Reload and try again." : error?.message,
      });
      reload();
      return;
    }
    showToast({ type: "success", title: "Settlement recorded", description: `${money(data.amount)} paid to ${row.name}.` });
    setOpenId(null);
    reload();
  };

  const totalDue = summary.reduce((sum, r) => sum + Number(r.due_amount || 0), 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-xl font-semibold">Settlements</h1>
        <p className="text-sm text-muted-foreground">
          Promo discounts funded by PassPrive and given at restaurant POS terminals. Pay the restaurant, then record the payment here. The POS and partner app show the restaurant what is still due and what was paid.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant={tab === "due" ? "default" : "outline"} onClick={() => setTab("due")}>
          To settle {summary.length ? `(${summary.length})` : ""}
        </Button>
        <Button variant={tab === "paid" ? "default" : "outline"} onClick={() => setTab("paid")}>Paid</Button>
        {tab === "due" && summary.length > 0 ? <span className="ml-auto text-sm font-semibold">Total owed {money(totalDue)}</span> : null}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : tab === "due" ? (
        summary.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing to settle.</p>
        ) : (
          <div className="space-y-3">
            {summary.map((row) => (
              <div key={row.restaurant_id} className="rounded-xl border bg-white">
                <button className="flex w-full items-center gap-4 px-4 py-3 text-left" onClick={() => open(row.restaurant_id)}>
                  <div className="flex-1">
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.due_count} promo {row.due_count === 1 ? "bill" : "bills"} · oldest {stamp(row.oldest)} · last paid {stamp(row.last_paid_at)}
                    </div>
                  </div>
                  <div className="text-right font-semibold">{money(row.due_amount)}</div>
                </button>
                {openId === row.restaurant_id ? (
                  <div className="space-y-3 border-t px-4 py-3">
                    <table className="w-full text-sm">
                      <thead className="text-left text-muted-foreground">
                        <tr>
                          <th className="w-8 py-1"></th>
                          <th className="py-1">Date</th>
                          <th className="py-1">Table</th>
                          <th className="py-1">Code</th>
                          <th className="py-1 text-right">Bill</th>
                          <th className="py-1 text-right">Guest paid</th>
                          <th className="py-1 text-right">Promo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {lines.map((l) => (
                          <tr key={l.id}>
                            <td className="py-1">
                              <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} />
                            </td>
                            <td className="py-1">{stamp(l.redeemed_at)}</td>
                            <td className="py-1">{l.table_no ? `T${l.table_no}` : "—"}</td>
                            <td className="py-1">{l.code || "—"}</td>
                            <td className="py-1 text-right">{money(l.original_amount)}</td>
                            <td className="py-1 text-right">{money(l.final_amount)}</td>
                            <td className="py-1 text-right font-medium">{money(l.discount_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={reference}
                        onChange={(e) => setReference(e.target.value.slice(0, 80))}
                        placeholder="Payment reference (required)"
                        className="h-9 w-64 rounded-md border px-3 text-sm"
                      />
                      <input
                        value={note}
                        onChange={(e) => setNote(e.target.value.slice(0, 200))}
                        placeholder="Note (optional)"
                        className="h-9 flex-1 rounded-md border px-3 text-sm"
                      />
                      <Button disabled={busy || !selected.size} onClick={() => settle(row)}>
                        Mark {money(selectedTotal)} as paid
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )
      ) : paid.length === 0 ? (
        <p className="text-sm text-muted-foreground">No settlements yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Paid</th>
                <th className="px-4 py-2">Restaurant</th>
                <th className="px-4 py-2">Promo bills</th>
                <th className="px-4 py-2">Reference</th>
                <th className="px-4 py-2">Note</th>
                <th className="px-4 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paid.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2">{stamp(p.paid_at)}</td>
                  <td className="px-4 py-2 font-medium">{p.name}</td>
                  <td className="px-4 py-2">{p.redemption_count}</td>
                  <td className="px-4 py-2">{p.reference || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{p.note || "—"}</td>
                  <td className="px-4 py-2 text-right font-semibold">{money(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

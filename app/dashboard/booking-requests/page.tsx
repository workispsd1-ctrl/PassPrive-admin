"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";

type Booking = {
  id: string;
  restaurant_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  party_size: number | null;
  booking_date: string;
  booking_time: string;
  status: string;
  read: boolean | null;
  special_request: string | null;
  booking_code: string | null;
  created_at: string;
  proposed_at: string | null;
  cover_charge_amount: number | null;
  booking_fee: number | null;
  booking_fee_status: string;
  cover_request_status: string | null;
  cover_request_total: number | null;
  cover_request_due_at: string | null;
  cancel_reason: string | null;
  handled_by: string | null;
  restaurants: { name: string | null; phone: string | null; area: string | null; service_level: string | null } | null;
};

type Tab = "handle" | "awaiting" | "refunds";
type Kind = "restaurant" | "store";

const STORE_SELECT =
  "id, store_id, customer_name, customer_phone, slot_start_at, status, partner_seen_at, notes, items, order_no, created_at, cover_charge_amount, booking_fee, booking_fee_status, cover_request_status, cover_request_total, cover_request_due_at, cancel_reason, handled_by, stores!inner(name, phone, location_name, service_level)";

type StoreRow = {
  id: string;
  store_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  slot_start_at: string;
  status: string;
  partner_seen_at: string | null;
  notes: string | null;
  items: { title?: string; name?: string }[] | null;
  order_no: string | null;
  created_at: string;
  cover_charge_amount: number | null;
  booking_fee: number | null;
  booking_fee_status: string;
  cover_request_status: string | null;
  cover_request_total: number | null;
  cover_request_due_at: string | null;
  cancel_reason: string | null;
  handled_by: string | null;
  stores: { name: string | null; phone: string | null; location_name: string | null; service_level: string | null } | null;
};

function fromStore(o: StoreRow): Booking {
  const local = new Date(new Date(o.slot_start_at).getTime() + 4 * 3600 * 1000).toISOString();
  const services = (o.items || []).map(i => i?.title || i?.name).filter(Boolean).join(", ");
  const upper = String(o.status || "").toUpperCase();
  return {
    id: o.id,
    restaurant_id: o.store_id,
    customer_name: o.customer_name,
    customer_phone: o.customer_phone,
    party_size: 1,
    booking_date: local.slice(0, 10),
    booking_time: local.slice(11, 16),
    status: upper === "NEW" ? "pending" : upper === "PLACED" ? "confirmed" : upper.toLowerCase(),
    read: !!o.partner_seen_at,
    special_request: [services, o.notes].filter(Boolean).join(" · ") || null,
    booking_code: o.order_no,
    created_at: o.created_at,
    proposed_at: null,
    cover_charge_amount: o.cover_charge_amount,
    booking_fee: o.booking_fee,
    booking_fee_status: o.booking_fee_status,
    cover_request_status: o.cover_request_status,
    cover_request_total: o.cover_request_total,
    cover_request_due_at: o.cover_request_due_at,
    cancel_reason: o.cancel_reason,
    handled_by: o.handled_by,
    restaurants: { name: o.stores?.name ?? null, phone: o.stores?.phone ?? null, area: o.stores?.location_name ?? null, service_level: o.stores?.service_level ?? null },
  };
}

const SELECT =
  "id, restaurant_id, customer_name, customer_phone, party_size, booking_date, booking_time, status, read, special_request, booking_code, created_at, proposed_at, cover_charge_amount, booking_fee, booking_fee_status, cover_request_status, cover_request_total, cover_request_due_at, cancel_reason, handled_by, restaurants!inner(name, phone, area, service_level)";

const ERRORS: Record<string, string> = {
  amount_too_low: "The cover charge must be more than what the guest already paid.",
  invalid_amount: "Enter a valid amount.",
  cover_request_pending: "The guest has not paid the cover charge yet.",
  slot_passed: "This booking time has already passed.",
  invalid_time: "Pick a future date and time that is different from the booking.",
  already_handled: "This booking was already handled.",
  payment_pending: "The guest has not paid yet.",
  forbidden: "You are not allowed to do this.",
};

function when(b: Booking) {
  return `${b.booking_date} · ${String(b.booking_time).slice(0, 5)}`;
}

function stamp(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("en-GB", { timeZone: "Indian/Mauritius" });
}

function needsHandling(b: Booking) {
  const s = b.status.toLowerCase();
  if (b.cover_request_status === "requested") return false;
  return (s === "pending" && !b.proposed_at) || (["confirmed", "payment_successfull"].includes(s) && !b.read);
}

export default function BookingRequestsPage() {
  const [tab, setTab] = useState<Tab>("handle");
  const [kind, setKind] = useState<Kind>("restaurant");
  const [rows, setRows] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [open, setOpen] = useState<{ id: string; mode: "cover" | "propose" | "reject" } | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    const today = new Date(Date.now() + 4 * 3600 * 1000).toISOString().slice(0, 10);
    if (kind === "store") {
      const sbase = supabaseBrowser.from("store_orders").select(STORE_SELECT).eq("service_type", "APPOINTMENT").order("created_at", { ascending: false }).limit(300);
      const squery =
        tab === "refunds"
          ? sbase.eq("booking_fee_status", "refund_due")
          : tab === "awaiting"
            ? sbase.eq("cover_request_status", "requested")
            : sbase.eq("stores.service_level", "discoverable").gte("slot_start_at", new Date().toISOString()).in("status", ["NEW", "PLACED"]);
      const { data, error } = await squery;
      setLoading(false);
      if (error) {
        showToast({ title: "Could not load appointments", description: error.message, type: "error" });
        return;
      }
      const list = ((data || []) as unknown as StoreRow[]).map(fromStore);
      setRows(tab === "handle" ? list.filter(needsHandling) : list);
      return;
    }
    const base = supabaseBrowser.from("restaurant_bookings").select(SELECT).order("created_at", { ascending: false }).limit(300);
    const query =
      tab === "refunds"
        ? base.eq("booking_fee_status", "refund_due")
        : tab === "awaiting"
          ? base.eq("cover_request_status", "requested")
          : base.eq("restaurants.service_level", "discoverable").gte("booking_date", today).in("status", ["pending", "confirmed", "payment_successfull"]);
    const { data, error } = await query;
    setLoading(false);
    if (error) {
      showToast({ title: "Could not load bookings", description: error.message, type: "error" });
      return;
    }
    const list = (data || []) as unknown as Booking[];
    setRows(tab === "handle" ? list.filter(needsHandling) : list);
  }, [tab, kind]);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const timer = setInterval(load, 30000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [load]);

  const respond = async (b: Booking, action: string, extra: Record<string, unknown> = {}) => {
    setBusy(`${b.id}:${action}`);
    const { data, error } =
      kind === "store"
        ? await supabaseBrowser.rpc("partner_respond_appointment", {
            p_order_id: b.id,
            p_action: action,
            p_reason: (extra.p_reason as string) ?? null,
            p_cover_amount: (extra.p_cover_amount as number) ?? null,
          })
        : await supabaseBrowser.rpc("partner_respond_booking", {
            p_booking_id: b.id,
            p_action: action,
            ...extra,
          });
    setBusy("");
    if (error || !data?.ok) {
      showToast({ title: "Not updated", description: ERRORS[data?.error] || error?.message || "Please try again.", type: "error" });
      return;
    }
    showToast({ title: "Done", description: "The guest has been notified in the app.", type: "success" });
    setOpen(null);
    load();
  };

  const markRefunded = async (b: Booking) => {
    const reference = window.prompt("Refund reference (optional)") ?? null;
    setBusy(`${b.id}:refund`);
    const { data, error } = await supabaseBrowser.rpc("admin_mark_booking_refunded", { p_booking_id: b.id, p_reference: reference });
    setBusy("");
    if (error || !data?.ok) {
      showToast({ title: "Not updated", description: error?.message || data?.error || "Please try again.", type: "error" });
      return;
    }
    load();
  };

  const counts = useMemo(() => rows.length, [rows]);

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Booking requests</h1>
        <p className="mt-1 text-sm text-gray-600">
          Scraped restaurants have no dashboard, so their bookings land here. Call the restaurant, then accept, reject, propose a new time or request a cover charge on its behalf.
        </p>
      </div>

      <div className="flex gap-2">
        {([
          ["restaurant", "Restaurants"],
          ["store", "Salons & services"],
        ] as [Kind, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setKind(key)}
            className={`h-9 rounded-full px-4 text-sm font-semibold ${kind === key ? "bg-gray-900 text-white" : "border border-gray-300 bg-white text-gray-800"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {([
          ["handle", "To handle"],
          ["awaiting", "Awaiting cover payment"],
          ["refunds", "Refunds due"],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`h-9 rounded-full px-4 text-sm font-semibold ${tab === key ? "bg-orange-600 text-white" : "border border-gray-300 bg-white text-gray-800"}`}
          >
            {label}
            {tab === key && !loading ? ` (${counts})` : ""}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : !rows.length ? (
        <p className="text-sm text-gray-500">Nothing here right now.</p>
      ) : (
        <div className="space-y-3">
          {rows.map(b => (
            <div key={b.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-gray-900">
                    {b.restaurants?.name || "Restaurant"} <span className="font-normal text-gray-500">· {b.restaurants?.area || ""}</span>
                  </p>
                  <p className="text-sm text-gray-700">
                    Restaurant phone: <span className="font-medium">{b.restaurants?.phone || "—"}</span>
                  </p>
                  <p className="mt-1 text-sm text-gray-700">
                    {when(b)} · {b.party_size ?? "—"} guests · {b.customer_name || "Guest"} ({b.customer_phone || "—"}) · Code {b.booking_code || "—"}
                  </p>
                  {b.special_request ? <p className="mt-1 text-sm italic text-gray-600">“{b.special_request}”</p> : null}
                  <p className="mt-1 text-xs text-gray-500">
                    Status {b.status} · Received {stamp(b.created_at)} · Paid MUR {Number(b.cover_charge_amount || 0)} (fee {b.booking_fee_status})
                    {b.cover_request_status === "requested" ? ` · Cover MUR ${Number(b.cover_request_total || 0)} requested, due ${stamp(b.cover_request_due_at)}` : ""}
                    {b.cancel_reason ? ` · ${b.cancel_reason}` : ""}
                  </p>
                </div>

                {tab === "handle" ? (
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={!!busy} onClick={() => respond(b, "accept")}>Accept</Button>
                    <Button variant="outline" disabled={!!busy} onClick={() => { setOpen({ id: b.id, mode: "cover" }); setAmount(""); }}>Request cover charge</Button>
                    {kind === "restaurant" ? (
                      <Button variant="outline" disabled={!!busy} onClick={() => { setOpen({ id: b.id, mode: "propose" }); setDate(b.booking_date); setTime(String(b.booking_time).slice(0, 5)); }}>Propose time</Button>
                    ) : null}
                    <Button variant="outline" disabled={!!busy} onClick={() => { setOpen({ id: b.id, mode: "reject" }); setReason(""); }}>Reject</Button>
                  </div>
                ) : tab === "refunds" ? (
                  <Button disabled={!!busy} onClick={() => markRefunded(b)}>
                    Mark MUR {Number(b.cover_charge_amount || 0)} refunded
                  </Button>
                ) : null}
              </div>

              {open?.id === b.id ? (
                <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-gray-50 p-3">
                  {open.mode === "cover" ? (
                    <>
                      <label className="text-xs font-medium text-gray-700">
                        Total cover charge (MUR), more than MUR {Math.max(Number(b.cover_charge_amount || 0), 20)}
                        <input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 block h-9 w-40 rounded-lg border border-gray-300 px-2 text-sm" />
                      </label>
                      <Button disabled={!!busy || !Number(amount)} onClick={() => respond(b, "request_cover", { p_cover_amount: Number(amount) })}>Send request</Button>
                    </>
                  ) : open.mode === "propose" ? (
                    <>
                      <input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9 rounded-lg border border-gray-300 px-2 text-sm" />
                      <input type="time" value={time} onChange={e => setTime(e.target.value)} className="h-9 rounded-lg border border-gray-300 px-2 text-sm" />
                      <Button disabled={!!busy || !date || !time} onClick={() => respond(b, "propose", { p_proposed_date: date, p_proposed_time: time.slice(0, 5) })}>Send to guest</Button>
                    </>
                  ) : (
                    <>
                      <input placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} className="h-9 w-72 rounded-lg border border-gray-300 px-2 text-sm" />
                      <Button disabled={!!busy} onClick={() => respond(b, "reject", { p_reason: reason || "Restaurant unavailable" })}>Reject booking</Button>
                    </>
                  )}
                  <Button variant="outline" onClick={() => setOpen(null)}>Cancel</Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

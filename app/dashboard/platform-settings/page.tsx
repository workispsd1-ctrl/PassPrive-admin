"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type ModeCounts = { inherit: number; on: number; off: number; live?: number };

type Settings = {
  booking_global_enabled: boolean;
  booking_global_service_enabled: boolean;
  cashback_global_enabled: boolean;
  cashback_global_store_enabled: boolean;
  cashback_global_service_enabled: boolean;
  cashback_earn_enabled: boolean;
  cashback_burn_enabled: boolean;
  booking_reward_enabled: boolean;
  booking_reward_amount: number;
  booking_reward_min_bill: number;
  referral_enabled: boolean;
  repeat_reward_enabled: boolean;
  referral_reward_amount: number;
  referral_min_bill: number;
  referral_referee_amount: number;
  referral_max_total: number;
  updated_at: string;
  counts: {
    restaurants: { booking: ModeCounts; cashback: ModeCounts; reward: ModeCounts };
    service_stores: { booking: ModeCounts; cashback: ModeCounts };
    stores: { cashback: ModeCounts };
  };
  rewards: { pending: number; released_amount: number };
  referrals: { pending: number; rewarded: number; credited_amount: number };
};

type Flags = Pick<
  Settings,
  | "booking_global_enabled"
  | "booking_global_service_enabled"
  | "cashback_global_enabled"
  | "cashback_global_store_enabled"
  | "cashback_global_service_enabled"
  | "cashback_earn_enabled"
  | "cashback_burn_enabled"
  | "booking_reward_enabled"
  | "referral_enabled"
  | "repeat_reward_enabled"
>;

const FLAG_KEYS: (keyof Flags)[] = [
  "booking_global_enabled",
  "booking_global_service_enabled",
  "cashback_global_enabled",
  "cashback_global_store_enabled",
  "cashback_global_service_enabled",
  "cashback_earn_enabled",
  "cashback_burn_enabled",
  "booking_reward_enabled",
  "referral_enabled",
  "repeat_reward_enabled",
];

const LABELS: Record<keyof Flags, string> = {
  booking_global_enabled: "Book a table · Restaurants",
  booking_global_service_enabled: "Book a table · Service stores",
  cashback_global_enabled: "Cashback · Restaurants",
  cashback_global_store_enabled: "Cashback · Product stores",
  cashback_global_service_enabled: "Cashback · Service stores",
  cashback_earn_enabled: "Earn Privé Credits (master)",
  cashback_burn_enabled: "Use Privé Credits (master)",
  booking_reward_enabled: "Table booking cashback",
  referral_enabled: "Refer a friend",
  repeat_reward_enabled: "Repeat rewards (stamps)",
};

function stamp(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-GB", { timeZone: "Indian/Mauritius" });
}

function Counts({ counts, liveLabel }: { counts: ModeCounts; liveLabel?: string }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span>Follow global {counts.inherit}</span>
      <span>Always on {counts.on}</span>
      <span>Always off {counts.off}</span>
      {liveLabel && counts.live !== undefined ? (
        <span className="font-medium text-gray-700">
          {liveLabel} {counts.live}
        </span>
      ) : null}
    </div>
  );
}

function Row({
  title,
  description,
  checked,
  onChange,
  disabled,
  children,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border bg-white p-4">
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
        {children}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{checked ? "On" : "Off"}</span>
        <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
      </div>
    </div>
  );
}

export default function PlatformSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [flags, setFlags] = useState<Flags | null>(null);
  const [amount, setAmount] = useState("");
  const [minBill, setMinBill] = useState("");
  const [refAmount, setRefAmount] = useState("");
  const [refMinBill, setRefMinBill] = useState("");
  const [refReferee, setRefReferee] = useState("");
  const [refCap, setRefCap] = useState("");
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    supabaseBrowser.rpc("admin_platform_settings").then(({ data, error }) => {
      if (!alive) return;
      if (error) {
        showToast({ type: "error", title: "Could not load settings", description: error.message });
        return;
      }
      const next = data as Settings;
      setSettings(next);
      setFlags(Object.fromEntries(FLAG_KEYS.map((k) => [k, next[k]])) as Flags);
      setAmount(String(Number(next.booking_reward_amount)));
      setMinBill(String(Number(next.booking_reward_min_bill)));
      setRefAmount(String(Number(next.referral_reward_amount)));
      setRefMinBill(String(Number(next.referral_min_bill)));
      setRefReferee(String(Number(next.referral_referee_amount)));
      setRefCap(String(Number(next.referral_max_total)));
    });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const amountNum = Number(amount);
  const minBillNum = Number(minBill);
  const amountValid = amount.trim() !== "" && Number.isFinite(amountNum) && amountNum >= 0 && amountNum <= 1000;
  const minBillValid = minBill.trim() !== "" && Number.isFinite(minBillNum) && minBillNum >= 0 && minBillNum <= 100000;
  const refAmountNum = Number(refAmount);
  const refMinBillNum = Number(refMinBill);
  const refAmountValid = refAmount.trim() !== "" && Number.isFinite(refAmountNum) && refAmountNum >= 0 && refAmountNum <= 10000;
  const refMinBillValid = refMinBill.trim() !== "" && Number.isFinite(refMinBillNum) && refMinBillNum >= 0 && refMinBillNum <= 100000;
  const refRefereeNum = Number(refReferee);
  const refRefereeValid = refReferee.trim() !== "" && Number.isFinite(refRefereeNum) && refRefereeNum >= 0 && refRefereeNum <= 10000;
  const refCapNum = Number(refCap);
  const refCapValid = refCap.trim() !== "" && Number.isFinite(refCapNum) && refCapNum >= 0 && refCapNum <= 1000000;
  const allValid = amountValid && minBillValid && refAmountValid && refMinBillValid && refRefereeValid && refCapValid;
  const changedFlags = settings && flags ? FLAG_KEYS.filter((k) => flags[k] !== settings[k]) : [];
  const changed =
    !!settings &&
    (changedFlags.length > 0 ||
      amountNum !== Number(settings.booking_reward_amount) ||
      minBillNum !== Number(settings.booking_reward_min_bill) ||
      refAmountNum !== Number(settings.referral_reward_amount) ||
      refMinBillNum !== Number(settings.referral_min_bill) ||
      refRefereeNum !== Number(settings.referral_referee_amount) ||
      refCapNum !== Number(settings.referral_max_total));

  const set = (key: keyof Flags) => (value: boolean) => setFlags((prev) => (prev ? { ...prev, [key]: value } : prev));

  const save = async () => {
    if (!settings || !flags || !allValid) return;
    if (changedFlags.length) {
      const lines = changedFlags.map((k) => `• ${LABELS[k]}: ${flags[k] ? "ON" : "OFF"}`).join("\n");
      if (!window.confirm(`Confirm these changes. Merchants set to "Follow global setting" are updated straight away:\n\n${lines}`)) return;
    }
    setBusy(true);
    const { data, error } = await supabaseBrowser.rpc("admin_update_platform_settings", {
      p: {
        ...flags,
        booking_reward_amount: Math.round(amountNum * 100) / 100,
        booking_reward_min_bill: Math.round(minBillNum * 100) / 100,
        referral_reward_amount: Math.round(refAmountNum * 100) / 100,
        referral_min_bill: Math.round(refMinBillNum * 100) / 100,
        referral_referee_amount: Math.round(refRefereeNum * 100) / 100,
        referral_max_total: Math.round(refCapNum * 100) / 100,
      },
    });
    setBusy(false);
    if (error) {
      showToast({ type: "error", title: "Could not save", description: error.message });
      return;
    }
    const d = (data || {}) as Record<string, number>;
    const merchants =
      (d.booking_restaurants || 0) +
      (d.booking_service_stores || 0) +
      (d.cashback_restaurants || 0) +
      (d.cashback_stores || 0) +
      (d.cashback_service_stores || 0);
    showToast({
      type: "success",
      title: "Settings saved",
      description: `${merchants} merchant settings updated. The app shows the change after the next snapshot refresh.`,
    });
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-xl font-semibold">Platform Settings</h1>
        <p className="text-sm text-muted-foreground">
          Global switches for every merchant in the PassPrive app. Each global switch sets the default for merchants on &ldquo;Follow
          global setting&rdquo;. A merchant set to Always on or Always off in its own edit page keeps that setting whatever the global
          switch says.
        </p>
      </div>

      {!settings || !flags ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <>
          <section className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-5">
            <div>
              <h2 className="font-semibold">Privé Credits master switches</h2>
              <p className="text-sm text-muted-foreground">
                Emergency switches for every guest and merchant, enforced on the server, so no app version can bypass them. Credits
                already in wallets are never touched. These override every merchant setting.
              </p>
            </div>
            <Row
              title="Earn Privé Credits"
              description="Off: no bill-payment cashback, receipt cashback or table booking cashback is given anywhere, and every earn badge, banner and “you will earn” text disappears from the app. Booking rewards already pending wait and unlock if you turn it back on in time."
              checked={flags.cashback_earn_enabled}
              onChange={set("cashback_earn_enabled")}
              disabled={busy}
            />
            <Row
              title="Use (burn) Privé Credits"
              description="Off: guests can't spend credits on any bill, and every “use credits” badge and option disappears from the app. Payments already in progress with credits finish normally."
              checked={flags.cashback_burn_enabled}
              onChange={set("cashback_burn_enabled")}
              disabled={busy}
            />
          </section>

          <section className="space-y-3 rounded-xl border bg-gray-50 p-5">
            <h2 className="font-semibold">Book a table</h2>
            <Row
              title="Restaurants"
              description="Default for restaurants on Follow global setting."
              checked={flags.booking_global_enabled}
              onChange={set("booking_global_enabled")}
              disabled={busy}
            >
              <Counts counts={settings.counts.restaurants.booking} liveLabel="Bookable now" />
            </Row>
            <Row
              title="Service stores"
              description="Default for service stores (salons, spas…) on Follow global setting. Product stores never take bookings."
              checked={flags.booking_global_service_enabled}
              onChange={set("booking_global_service_enabled")}
              disabled={busy}
            >
              <Counts counts={settings.counts.service_stores.booking} liveLabel="Bookable now" />
            </Row>
          </section>

          <section className="space-y-3 rounded-xl border bg-gray-50 p-5">
            <h2 className="font-semibold">Cashback</h2>
            <p className="text-sm text-muted-foreground">Bill-payment and receipt cashback for each type of merchant.</p>
            <Row
              title="Restaurants"
              description="Default for restaurants on Follow global setting."
              checked={flags.cashback_global_enabled}
              onChange={set("cashback_global_enabled")}
              disabled={busy}
            >
              <Counts counts={settings.counts.restaurants.cashback} liveLabel="Cashback on now" />
            </Row>
            <Row
              title="Product stores"
              description="Default for product stores on Follow global setting."
              checked={flags.cashback_global_store_enabled}
              onChange={set("cashback_global_store_enabled")}
              disabled={busy}
            >
              <Counts counts={settings.counts.stores.cashback} liveLabel="Cashback on now" />
            </Row>
            <Row
              title="Service stores"
              description="Default for service stores on Follow global setting."
              checked={flags.cashback_global_service_enabled}
              onChange={set("cashback_global_service_enabled")}
              disabled={busy}
            >
              <Counts counts={settings.counts.service_stores.cashback} liveLabel="Cashback on now" />
            </Row>
          </section>

          <section className="space-y-3 rounded-xl border bg-gray-50 p-5">
            <h2 className="font-semibold">Repeat rewards</h2>
            <Row
              title="Repeat rewards (stamps)"
              description="Default for restaurants and stores on Follow global setting. Off: stamp cards, the Home Collect Stamps banner and loyalty offers disappear from the app, and no repeat-visit discount is applied on bills. Merchants set to On keep it; merchants set to Off never have it."
              checked={flags.repeat_reward_enabled}
              onChange={set("repeat_reward_enabled")}
              disabled={busy}
            />
          </section>

          <section className="space-y-3 rounded-xl border bg-gray-50 p-5">
            <h2 className="font-semibold">Table booking cashback</h2>
            <Row
              title="Give cashback for table bookings"
              description="Default for restaurants on Follow global setting. The guest sees it as pending when the booking is confirmed; it is credited once the visit is proven (receipt scan, bill paid through PassPrive, or the restaurant marks it complete) within 2 days. Applies to bookings confirmed from now on."
              checked={flags.booking_reward_enabled}
              onChange={set("booking_reward_enabled")}
              disabled={busy}
            >
              <Counts counts={settings.counts.restaurants.reward} />
              <p className="mt-2 text-sm">
                {settings.rewards.pending} pending now · MUR {Number(settings.rewards.released_amount).toLocaleString("en-US")} credited so far
              </p>
            </Row>
            <div className="grid gap-4 rounded-lg border bg-white p-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm font-medium">Cashback per booking (MUR)</span>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                  inputMode="decimal"
                  className="h-10 w-full rounded-md border px-3 text-sm"
                  disabled={busy}
                />
                {!amountValid ? <span className="text-xs text-red-600">Enter 0 to 1000</span> : null}
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">Minimum bill to prove the visit (MUR)</span>
                <input
                  value={minBill}
                  onChange={(e) => setMinBill(e.target.value.replace(/[^\d.]/g, ""))}
                  inputMode="decimal"
                  className="h-10 w-full rounded-md border px-3 text-sm"
                  disabled={busy}
                />
                <span className="block text-xs text-muted-foreground">
                  A receipt or app bill payment only unlocks the reward if the bill is at least this much.
                </span>
                {!minBillValid ? <span className="text-xs text-red-600">Enter 0 to 100000</span> : null}
              </label>
            </div>
          </section>

          <section className="space-y-3 rounded-xl border bg-gray-50 p-5">
            <h2 className="font-semibold">Refer a friend</h2>
            <Row
              title="Referral rewards"
              description="Every guest has a code in the app. A new guest enters a friend's code when signing up (or from Profile before their first bill). Once their first bill paid through PassPrive reaches the minimum below, both are credited: the guest who invited them and the new guest. Off: the badge and sign-up field disappear and no new codes can be entered; referrals already joined still pay out."
              checked={flags.referral_enabled}
              onChange={set("referral_enabled")}
              disabled={busy}
            >
              <p className="mt-2 text-sm">
                {settings.referrals.pending} waiting for a first bill · {settings.referrals.rewarded} rewarded · MUR{" "}
                {Number(settings.referrals.credited_amount).toLocaleString("en-US")} credited so far
              </p>
            </Row>
            <div className="grid gap-4 rounded-lg border bg-white p-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm font-medium">Reward for the guest who invites (Privé Credits)</span>
                <input
                  value={refAmount}
                  onChange={(e) => setRefAmount(e.target.value.replace(/[^\d.]/g, ""))}
                  inputMode="decimal"
                  className="h-10 w-full rounded-md border px-3 text-sm"
                  disabled={busy}
                />
                <span className="block text-xs text-muted-foreground">
                  Shown on the app badge. Applies to friends who join from now on; friends already joined keep the amount shown when they joined.
                </span>
                {!refAmountValid ? <span className="text-xs text-red-600">Enter 0 to 10000</span> : null}
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">Reward for the new guest (Privé Credits)</span>
                <input
                  value={refReferee}
                  onChange={(e) => setRefReferee(e.target.value.replace(/[^\d.]/g, ""))}
                  inputMode="decimal"
                  className="h-10 w-full rounded-md border px-3 text-sm"
                  disabled={busy}
                />
                <span className="block text-xs text-muted-foreground">
                  Welcome credits for the guest who signed up with a code. 0 turns the welcome reward off.
                </span>
                {!refRefereeValid ? <span className="text-xs text-red-600">Enter 0 to 10000</span> : null}
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">Most one guest can earn from referrals (MUR)</span>
                <input
                  value={refCap}
                  onChange={(e) => setRefCap(e.target.value.replace(/[^\d.]/g, ""))}
                  inputMode="decimal"
                  className="h-10 w-full rounded-md border px-3 text-sm"
                  disabled={busy}
                />
                <span className="block text-xs text-muted-foreground">
                  Shown in the app as &ldquo;Collect up to&rdquo;. Once a guest reaches it they stop earning, but friends who join with their code still get their welcome reward. 0 means no limit.
                </span>
                {!refCapValid ? <span className="text-xs text-red-600">Enter 0 to 1000000</span> : null}
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">Minimum first bill (MUR)</span>
                <input
                  value={refMinBill}
                  onChange={(e) => setRefMinBill(e.target.value.replace(/[^\d.]/g, ""))}
                  inputMode="decimal"
                  className="h-10 w-full rounded-md border px-3 text-sm"
                  disabled={busy}
                />
                <span className="block text-xs text-muted-foreground">
                  The friend&apos;s bill must be at least this much before the reward is paid.
                </span>
                {!refMinBillValid ? <span className="text-xs text-red-600">Enter 0 to 100000</span> : null}
              </label>
            </div>
          </section>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Last saved {stamp(settings.updated_at)}</span>
            <Button onClick={save} disabled={busy || !changed || !allValid}>
              {busy ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

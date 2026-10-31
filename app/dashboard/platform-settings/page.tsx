"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type Settings = {
  booking_global_enabled: boolean;
  booking_reward_amount: number;
  booking_reward_enabled: boolean;
  booking_reward_min_bill: number;
  updated_at: string;
  rewards: { pending: number; released_amount: number };
  counts: { inherit: number; on: number; off: number; bookable: number };
};

function stamp(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-GB", { timeZone: "Indian/Mauritius" });
}

export default function PlatformSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [globalOn, setGlobalOn] = useState(false);
  const [amount, setAmount] = useState("");
  const [rewardOn, setRewardOn] = useState(true);
  const [minBill, setMinBill] = useState("");
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
      setGlobalOn(next.booking_global_enabled);
      setAmount(String(Number(next.booking_reward_amount)));
      setRewardOn(next.booking_reward_enabled);
      setMinBill(String(Number(next.booking_reward_min_bill)));
    });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const amountNum = Number(amount);
  const amountValid = amount.trim() !== "" && Number.isFinite(amountNum) && amountNum >= 0 && amountNum <= 1000;
  const minBillNum = Number(minBill);
  const minBillValid = minBill.trim() !== "" && Number.isFinite(minBillNum) && minBillNum >= 0 && minBillNum <= 100000;
  const changed =
    !!settings &&
    (globalOn !== settings.booking_global_enabled ||
      rewardOn !== settings.booking_reward_enabled ||
      minBillNum !== Number(settings.booking_reward_min_bill) ||
      amountNum !== Number(settings.booking_reward_amount));

  const save = async () => {
    if (!settings || !amountValid || !minBillValid) return;
    if (globalOn !== settings.booking_global_enabled) {
      const affected = settings.counts.inherit;
      const verb = globalOn ? "turn ON" : "turn OFF";
      if (!window.confirm(`This will ${verb} Book a table for ${affected} restaurants that follow the global setting. Continue?`)) return;
    }
    if (!rewardOn && settings.booking_reward_enabled) {
      if (!window.confirm("Stop table booking cashback? New bookings will not earn Privé Credits. Rewards already pending still unlock after the visit.")) return;
    }
    setBusy(true);
    const { data, error } = await supabaseBrowser.rpc("admin_update_platform_settings", {
      p_booking_global_enabled: globalOn,
      p_booking_reward_amount: Math.round(amountNum * 100) / 100,
      p_booking_reward_enabled: rewardOn,
      p_booking_reward_min_bill: Math.round(minBillNum * 100) / 100,
    });
    setBusy(false);
    if (error) {
      showToast({ type: "error", title: "Could not save", description: error.message });
      return;
    }
    showToast({
      type: "success",
      title: "Settings saved",
      description: `${data?.restaurants_updated ?? 0} restaurants updated. The app shows the change after the next snapshot refresh.`,
    });
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-xl font-semibold">Platform Settings</h1>
        <p className="text-sm text-muted-foreground">Switches that apply across every restaurant in the PassPrive app.</p>
      </div>

      {!settings ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <>
          <section className="space-y-3 rounded-xl border bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold">Book a table (global)</h2>
                <p className="text-sm text-muted-foreground">
                  Turns Book a table on or off for every restaurant set to &ldquo;Follow global setting&rdquo;. A restaurant switched on or off
                  in its own edit page always keeps its own setting.
                </p>
              </div>
              <Switch checked={globalOn} onCheckedChange={setGlobalOn} disabled={busy} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="text-muted-foreground">Follow global</div>
                <div className="text-lg font-semibold">{settings.counts.inherit}</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="text-muted-foreground">Always on</div>
                <div className="text-lg font-semibold">{settings.counts.on}</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="text-muted-foreground">Always off</div>
                <div className="text-lg font-semibold">{settings.counts.off}</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="text-muted-foreground">Bookable now</div>
                <div className="text-lg font-semibold">{settings.counts.bookable}</div>
              </div>
            </div>
          </section>

          <section className="space-y-3 rounded-xl border bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-semibold">Table booking cashback</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{rewardOn ? "On" : "Stopped"}</span>
                <Switch checked={rewardOn} onCheckedChange={setRewardOn} disabled={busy} />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Privé Credits a guest earns for each table booked in the app. It shows as pending when the booking is confirmed and is
                credited once the visit is proven (receipt scan, bill paid through PassPrive, or the restaurant marks it complete) within 2 days.
                Turn the switch off to stop new rewards; rewards already pending still unlock after the visit. Changes apply to bookings
                confirmed from now on.
              </p>
              <p className="mt-2 text-sm">
                {settings.rewards.pending} pending now · MUR {Number(settings.rewards.released_amount).toLocaleString("en-US")} credited so far
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">MUR</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                inputMode="decimal"
                className="h-10 w-32 rounded-md border px-3 text-sm"
                disabled={busy}
              />
              {!amountValid ? <span className="text-xs text-red-600">Enter 0 to 1000</span> : null}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Minimum bill to prove the visit: MUR</span>
                <input
                  value={minBill}
                  onChange={(e) => setMinBill(e.target.value.replace(/[^\d.]/g, ""))}
                  inputMode="decimal"
                  className="h-10 w-32 rounded-md border px-3 text-sm"
                  disabled={busy}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                A scanned receipt or an app bill payment only unlocks the reward if the bill is at least this much. Stops a tiny payment
                being used to claim the cashback.
              </p>
            </div>
          </section>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Last saved {stamp(settings.updated_at)}</span>
            <Button onClick={save} disabled={busy || !changed || !amountValid || !minBillValid}>
              {busy ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

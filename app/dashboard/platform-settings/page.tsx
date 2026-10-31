"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type Settings = {
  booking_global_enabled: boolean;
  booking_reward_amount: number;
  updated_at: string;
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
    });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const amountNum = Number(amount);
  const amountValid = amount.trim() !== "" && Number.isFinite(amountNum) && amountNum >= 0 && amountNum <= 1000;
  const changed =
    !!settings && (globalOn !== settings.booking_global_enabled || amountNum !== Number(settings.booking_reward_amount));

  const save = async () => {
    if (!settings || !amountValid) return;
    if (globalOn !== settings.booking_global_enabled) {
      const affected = settings.counts.inherit;
      const verb = globalOn ? "turn ON" : "turn OFF";
      if (!window.confirm(`This will ${verb} Book a table for ${affected} restaurants that follow the global setting. Continue?`)) return;
    }
    setBusy(true);
    const { data, error } = await supabaseBrowser.rpc("admin_update_platform_settings", {
      p_booking_global_enabled: globalOn,
      p_booking_reward_amount: Math.round(amountNum * 100) / 100,
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
            <div>
              <h2 className="font-semibold">Table booking cashback</h2>
              <p className="text-sm text-muted-foreground">
                Privé Credits a guest earns for each table booked in the app. It shows as pending when the booking is confirmed and is
                credited once the visit is proven (receipt scan, bill paid through PassPrive, or the restaurant marks it complete) within 2 days.
                Set to 0 to stop new rewards. Changes apply to bookings confirmed from now on.
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
          </section>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Last saved {stamp(settings.updated_at)}</span>
            <Button onClick={save} disabled={busy || !changed || !amountValid}>
              {busy ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

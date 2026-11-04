"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const BUCKET = "treasure-hunts";

const APP_SCREENS = [
  "Home",
  "RestaurantDetails",
  "StoreDetails",
  "ServiceStoreDetails",
  "MallDetails",
  "TouristPlaceDetails",
  "GlobalSearch",
  "OfferRestaurants",
  "StoreCategoryResults",
  "Profile",
  "Membership",
  "PriveCredits",
  "Wallet",
  "SavedRestaurants",
  "YourBookings",
  "CollectStamps",
  "Deals",
];

type Spot = { id: string; screen: string; x: number; y: number };

type Hunt = {
  id: string;
  title: string;
  icon_url: string | null;
  reward_points: number;
  spots: Spot[];
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  finds?: number;
  winners?: number;
};

function makeSpots(count: number, screens: string[]): Spot[] {
  const rand = (min: number, max: number) => Math.round((min + Math.random() * (max - min)) * 10) / 10;
  return Array.from({ length: count }, (_, i) => ({
    id: `${i + 1}-${Math.random().toString(36).slice(2, 8)}`,
    screen: screens[Math.floor(Math.random() * screens.length)],
    x: rand(8, 92),
    y: rand(15, 85),
  }));
}

function stamp(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", { timeZone: "Indian/Mauritius" });
}

function toIso(local: string) {
  return local ? new Date(`${local}:00+04:00`).toISOString() : null;
}

export default function TreasureHuntsPage() {
  const [hunts, setHunts] = useState<Hunt[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("Lemon Hunt");
  const [count, setCount] = useState("50");
  const [points, setPoints] = useState("50");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [screens, setScreens] = useState<string[]>(APP_SCREENS);
  const [iconFile, setIconFile] = useState<File | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabaseBrowser.from("treasure_hunts").select("*").order("created_at", { ascending: false });
      if (error) {
        showToast({ type: "error", title: "Could not load hunts", description: error.message });
        return;
      }
      const rows = await Promise.all(
        (data as Hunt[]).map(async (h) => {
          const [f, w] = await Promise.all([
            supabaseBrowser.from("treasure_hunt_finds").select("*", { count: "exact", head: true }).eq("hunt_id", h.id),
            supabaseBrowser.from("treasure_hunt_rewards").select("*", { count: "exact", head: true }).eq("hunt_id", h.id),
          ]);
          return { ...h, finds: f.count ?? 0, winners: w.count ?? 0 };
        })
      );
      if (alive) setHunts(rows);
    })();
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const countNum = Number(count);
  const pointsNum = Number(points);
  const valid =
    title.trim() !== "" &&
    Number.isInteger(countNum) &&
    countNum >= 1 &&
    countNum <= 500 &&
    pointsNum > 0 &&
    pointsNum <= 10000 &&
    screens.length > 0 &&
    (!startsAt || !endsAt || startsAt < endsAt);

  const create = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      let icon_url: string | null = null;
      if (iconFile) {
        const path = `icons/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${iconFile.name.split(".").pop() || "png"}`;
        const { error } = await supabaseBrowser.storage.from(BUCKET).upload(path, iconFile, { cacheControl: "31536000" });
        if (error) throw error;
        icon_url = supabaseBrowser.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabaseBrowser.from("treasure_hunts").insert({
        title: title.trim(),
        icon_url,
        reward_points: Math.round(pointsNum * 100) / 100,
        spots: makeSpots(countNum, screens),
        starts_at: toIso(startsAt),
        ends_at: toIso(endsAt),
      });
      if (error) throw error;
      showToast({ type: "success", title: "Hunt created", description: "Turn it on to show it in the app." });
      setIconFile(null);
      setReloadKey((k) => k + 1);
    } catch (e) {
      showToast({ type: "error", title: "Could not create hunt", description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const setActive = async (hunt: Hunt, on: boolean) => {
    if (on && !window.confirm(`Start "${hunt.title}"? Any other running hunt is turned off.`)) return;
    setBusy(true);
    if (on) await supabaseBrowser.from("treasure_hunts").update({ is_active: false }).eq("is_active", true);
    const { error } = await supabaseBrowser
      .from("treasure_hunts")
      .update({ is_active: on, updated_at: new Date().toISOString() })
      .eq("id", hunt.id);
    setBusy(false);
    if (error) showToast({ type: "error", title: "Could not update", description: error.message });
    setReloadKey((k) => k + 1);
  };

  const reshuffle = async (hunt: Hunt) => {
    if (!window.confirm("Move every icon to new random places on the same screens? Every guest's progress on this hunt restarts from 0.")) return;
    setBusy(true);
    const huntScreens = [...new Set(hunt.spots.map((s) => s.screen))];
    const { error } = await supabaseBrowser
      .from("treasure_hunts")
      .update({ spots: makeSpots(hunt.spots.length, huntScreens), updated_at: new Date().toISOString() })
      .eq("id", hunt.id);
    setBusy(false);
    if (error) showToast({ type: "error", title: "Could not reshuffle", description: error.message });
    setReloadKey((k) => k + 1);
  };

  const remove = async (hunt: Hunt) => {
    if (!window.confirm(`Delete "${hunt.title}" and its find history? Credits already given stay in wallets.`)) return;
    setBusy(true);
    const { error } = await supabaseBrowser.from("treasure_hunts").delete().eq("id", hunt.id);
    setBusy(false);
    if (error) showToast({ type: "error", title: "Could not delete", description: error.message });
    setReloadKey((k) => k + 1);
  };

  const toggleScreen = (name: string) =>
    setScreens((prev) => (prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]));

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-xl font-semibold">Treasure Hunts</h1>
        <p className="text-sm text-muted-foreground">
          Hide small icons at random places across the app. A guest who taps every icon gets the Privé Credits reward, once per hunt.
          Only one hunt runs at a time.
        </p>
      </div>

      <section className="space-y-4 rounded-xl border bg-gray-50 p-5">
        <h2 className="font-semibold">New hunt</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-1">
            <span className="text-sm font-medium">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="h-10 w-full rounded-md border px-3 text-sm" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium">Icons to hide (1–500)</span>
            <input
              value={count}
              onChange={(e) => setCount(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              className="h-10 w-full rounded-md border px-3 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium">Reward (Privé Credits)</span>
            <input
              value={points}
              onChange={(e) => setPoints(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              className="h-10 w-full rounded-md border px-3 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium">Starts (Mauritius time, optional)</span>
            <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="h-10 w-full rounded-md border px-3 text-sm" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium">Ends (Mauritius time, optional)</span>
            <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="h-10 w-full rounded-md border px-3 text-sm" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium">Icon (leave empty for a lemon)</span>
            <input type="file" accept="image/png,image/webp,image/svg+xml" onChange={(e) => setIconFile(e.target.files?.[0] || null)} className="block w-full text-sm" />
          </label>
        </div>
        <div>
          <span className="text-sm font-medium">Screens to hide icons on</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {APP_SCREENS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => toggleScreen(name)}
                className={`rounded-full border px-3 py-1 text-xs ${screens.includes(name) ? "border-gray-900 bg-gray-900 text-white" : "bg-white"}`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={create} disabled={busy || !valid}>
            {busy ? "Saving..." : "Create hunt"}
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Hunts</h2>
        {!hunts ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : hunts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hunts yet.</p>
        ) : (
          hunts.map((h) => (
            <div key={h.id} className="flex items-start justify-between gap-4 rounded-lg border bg-white p-4">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 text-2xl">
                  {h.icon_url ? <img src={h.icon_url} alt="" className="h-7 w-7 object-contain" /> : "🍋"}
                </div>
                <div>
                  <h3 className="font-medium">{h.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {h.spots.length} icons · {Number(h.reward_points).toLocaleString("en-US")} Privé Credits reward
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stamp(h.starts_at)} → {stamp(h.ends_at)} · {h.finds} icons found · {h.winners} guests completed
                  </p>
                  <div className="mt-2 flex gap-3 text-xs">
                    <button className="underline" onClick={() => reshuffle(h)} disabled={busy}>
                      Reshuffle places
                    </button>
                    <button className="text-red-600 underline" onClick={() => remove(h)} disabled={busy}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{h.is_active ? "Live" : "Off"}</span>
                <Switch checked={h.is_active} onCheckedChange={(v) => setActive(h, v)} disabled={busy} />
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

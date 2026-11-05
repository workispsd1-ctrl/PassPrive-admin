"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";
import { formatMauritius, mauritiusInputToIso } from "@/lib/mauritiusTime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const BUCKET = "treasure-hunts";
const MAX_ICON_BYTES = 300 * 1024;

type Place = { slot: string; label: string; kind: "element" | "page" };

const PLACES: Place[] = [
  { slot: "home-header", label: "Home · top bar", kind: "element" },
  { slot: "wallet-button", label: "Home · credits button", kind: "element" },
  { slot: "home-categories", label: "Home · category icons", kind: "element" },
  { slot: "home-top", label: "Home · banners & rails", kind: "page" },
  { slot: "category-bar", label: "Dining, Shopping, Wellness · icon bar", kind: "element" },
  { slot: "dining-top", label: "Dining · banners & rails", kind: "page" },
  { slot: "shopping-top", label: "Shopping · banners & rails", kind: "page" },
  { slot: "wellness-top", label: "Wellness · banners & rails", kind: "page" },
  { slot: "merchant-page", label: "Any restaurant, store or salon page", kind: "page" },
  { slot: "merchant-card", label: "Any merchant page · info card", kind: "element" },
  { slot: "deals", label: "Deals", kind: "page" },
  { slot: "profile", label: "Profile", kind: "page" },
  { slot: "prive-credits", label: "Privé Credits", kind: "page" },
  { slot: "wallet", label: "Wallet", kind: "page" },
  { slot: "stamps", label: "Collect stamps", kind: "page" },
  { slot: "bookings", label: "Your bookings", kind: "page" },
  { slot: "sheet", label: "Any pop-up sheet (filters, log out…)", kind: "element" },
];

const PLACE_LABEL = Object.fromEntries(PLACES.map((p) => [p.slot, p.label]));
const PAGE_BANDS = 4;

type Spot = { id: string; slot: string; x: number; y: number };

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

type Status = { label: string; tone: string };

function statusOf(h: Hunt): Status {
  const now = Date.now();
  if (h.ends_at && Date.parse(h.ends_at) <= now) return { label: "Ended", tone: "bg-gray-100 text-gray-600" };
  if (!h.is_active) return { label: "Off", tone: "bg-gray-100 text-gray-600" };
  if (h.starts_at && Date.parse(h.starts_at) > now) return { label: "Scheduled", tone: "bg-amber-100 text-amber-800" };
  return { label: "Live", tone: "bg-emerald-100 text-emerald-800" };
}

function shuffle<T>(items: T[]) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function makeSpots(count: number, slots: string[]): Spot[] {
  const rand = (min: number, max: number) => Math.round((min + Math.random() * (max - min)) * 10) / 10;
  const chosen = PLACES.filter((p) => slots.includes(p.slot));
  const cells: Omit<Spot, "id">[] = [];
  chosen.forEach((p) => {
    if (p.kind === "element") cells.push({ slot: p.slot, x: rand(10, 90), y: rand(20, 80) });
    if (p.kind === "page")
      for (let band = 0; band < PAGE_BANDS; band += 1) {
        const size = 100 / PAGE_BANDS;
        cells.push({ slot: p.slot, x: rand(8, 92), y: rand(Math.max(6, band * size + 3), Math.min(94, (band + 1) * size - 3)) });
      }
  });
  const picked = shuffle(cells).slice(0, count);
  const pages = chosen.filter((p) => p.kind === "page");
  const pool = pages.length ? pages : chosen;
  while (picked.length < count && pool.length) {
    const p = pool[Math.floor(Math.random() * pool.length)];
    picked.push({ slot: p.slot, x: rand(8, 92), y: rand(6, 94) });
  }
  return picked.map((cell, i) => ({ id: `${i + 1}-${Math.random().toString(36).slice(2, 8)}`, ...cell }));
}

function breakdown(spots: Spot[]) {
  const counts = new Map<string, number>();
  spots.forEach((s) => counts.set(s.slot, (counts.get(s.slot) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function HuntIcon({ url, className }: { url: string | null; className?: string }) {
  return <img src={url || "/lemon.png"} alt="" className={cn("object-contain", className)} />;
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string | null; children: React.ReactNode }) {
  return (
    <label className="space-y-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error ? (
        <span className="block text-xs text-red-600">{error}</span>
      ) : hint ? (
        <span className="block text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  );
}

const inputClass = "h-10 w-full rounded-md border bg-white px-3 text-sm";

export default function TreasureHuntsPage() {
  const [hunts, setHunts] = useState<Hunt[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("Lemon Hunt");
  const [count, setCount] = useState("50");
  const [points, setPoints] = useState("50");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [places, setPlaces] = useState<string[]>(PLACES.map((p) => p.slot));
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);

  const iconPreview = useMemo(() => (iconFile ? URL.createObjectURL(iconFile) : null), [iconFile]);
  useEffect(() => () => {
    if (iconPreview) URL.revokeObjectURL(iconPreview);
  }, [iconPreview]);

  useEffect(() => {
    const onFocus = () => document.visibilityState === "visible" && setReloadKey((k) => k + 1);
    document.addEventListener("visibilitychange", onFocus);
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, []);

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
  const errors = {
    title: title.trim() ? null : "Enter a title",
    count: Number.isInteger(countNum) && countNum >= 1 && countNum <= 500 ? null : "Enter 1 to 500",
    points: pointsNum > 0 && pointsNum <= 10000 ? null : "Enter 1 to 10,000",
    dates: startsAt && endsAt && startsAt >= endsAt ? "End must be after start" : null,
    places: places.length ? null : "Pick at least one place",
    icon: iconFile && iconFile.size > MAX_ICON_BYTES ? "Use an image under 300 KB" : null,
  };
  const valid = Object.values(errors).every((e) => !e);

  const create = async () => {
    if (!valid) return;
    const running = hunts?.find((h) => h.is_active);
    if (running && !window.confirm(`"${running.title}" is on now. Creating this hunt switches it off. Continue?`)) return;
    setBusy(true);
    try {
      let icon_url: string | null = null;
      if (iconFile) {
        const ext = iconFile.name.split(".").pop()?.toLowerCase() || "png";
        const path = `icons/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
        const { error } = await supabaseBrowser.storage.from(BUCKET).upload(path, iconFile, { cacheControl: "31536000", contentType: iconFile.type });
        if (error) throw error;
        icon_url = supabaseBrowser.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      }
      if (running) {
        const off = await supabaseBrowser.from("treasure_hunts").update({ is_active: false }).eq("is_active", true);
        if (off.error) throw off.error;
      }
      const { error } = await supabaseBrowser.from("treasure_hunts").insert({
        is_active: true,
        title: title.trim(),
        icon_url,
        reward_points: Math.round(pointsNum * 100) / 100,
        spots: makeSpots(countNum, places),
        starts_at: mauritiusInputToIso(startsAt),
        ends_at: mauritiusInputToIso(endsAt),
      });
      if (error) throw error;
      showToast({ type: "success", title: "Hunt created", description: startsAt ? "It goes live at the start time." : "It is live in the app now." });
      setIconFile(null);
      setFileKey((k) => k + 1);
      setStartsAt("");
      setEndsAt("");
      setReloadKey((k) => k + 1);
    } catch (e) {
      showToast({ type: "error", title: "Could not create hunt", description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const run = async (fn: () => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>, failTitle: string) => {
    setBusy(true);
    const { data, error } = await fn();
    setBusy(false);
    if (error || !data?.length)
      showToast({ type: "error", title: failTitle, description: error?.message || "Your account is not allowed to change hunts." });
    setReloadKey((k) => k + 1);
  };

  const setActive = async (hunt: Hunt, on: boolean) => {
    if (on && !window.confirm(`Switch on "${hunt.title}"? Any other hunt that is on gets switched off.`)) return;
    await run(async () => {
      if (on) await supabaseBrowser.from("treasure_hunts").update({ is_active: false }).eq("is_active", true);
      return supabaseBrowser.from("treasure_hunts").update({ is_active: on, updated_at: new Date().toISOString() }).eq("id", hunt.id).select("id");
    }, "Could not update");
  };

  const reshuffle = (hunt: Hunt) => {
    if (!window.confirm(`Move all ${hunt.spots.length} icons to new random places? Every guest's progress on this hunt restarts from 0.`)) return;
    const known = [...new Set(hunt.spots.map((s) => s.slot))].filter((slot) => PLACE_LABEL[slot]);
    const huntPlaces = known.length ? known : PLACES.map((p) => p.slot);
    run(
      () =>
        supabaseBrowser
          .from("treasure_hunts")
          .update({ spots: makeSpots(hunt.spots.length, huntPlaces), updated_at: new Date().toISOString() })
          .eq("id", hunt.id)
          .select("id"),
      "Could not reshuffle"
    );
  };

  const remove = (hunt: Hunt) => {
    if (!window.confirm(`Delete "${hunt.title}" and its find history? Credits already given stay in guests' wallets.`)) return;
    run(() => supabaseBrowser.from("treasure_hunts").delete().eq("id", hunt.id).select("id"), "Could not delete");
  };

  const togglePlace = (slot: string) =>
    setPlaces((prev) => (prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]));

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-xl font-semibold">Treasure Hunts</h1>
        <p className="text-sm text-muted-foreground">
          Hide small icons at random places in the app. A guest who taps every one gets the Privé Credits reward, once per hunt. A new
          hunt runs on its dates straight away; use its switch to pause it. Only one hunt can be on at a time.
        </p>
      </div>

      <section className="space-y-5 rounded-xl border bg-gray-50 p-5">
        <h2 className="font-semibold">New hunt</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Title" hint="Shown to guests when they find one" error={errors.title}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={40} className={inputClass} disabled={busy} />
          </Field>
          <Field label="Icons to hide" hint="1 to 500" error={errors.count}>
            <input
              value={count}
              onChange={(e) => setCount(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              className={inputClass}
              disabled={busy}
            />
          </Field>
          <Field label="Reward (Privé Credits)" hint="Given once, after the last icon" error={errors.points}>
            <input
              value={points}
              onChange={(e) => setPoints(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              className={inputClass}
              disabled={busy}
            />
          </Field>
          <Field label="Starts" hint="Mauritius time · empty = as soon as it's on">
            <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputClass} disabled={busy} />
          </Field>
          <Field label="Ends" hint="Mauritius time · empty = until switched off" error={errors.dates}>
            <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputClass} disabled={busy} />
          </Field>
          <Field label="Icon" hint="Square PNG, WebP or SVG with a transparent background · empty = lemon" error={errors.icon}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-white">
                <HuntIcon url={iconPreview} className="h-6 w-6" />
              </div>
              <input
                key={fileKey}
                type="file"
                accept="image/png,image/webp,image/svg+xml"
                onChange={(e) => setIconFile(e.target.files?.[0] || null)}
                className="block w-full text-sm"
                disabled={busy}
              />
            </div>
          </Field>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-sm font-medium">Places to hide icons</span>
            <div className="flex gap-3 text-xs">
              <button type="button" className="underline" onClick={() => setPlaces(PLACES.map((p) => p.slot))} disabled={busy}>
                Select all
              </button>
              <button type="button" className="underline" onClick={() => setPlaces([])} disabled={busy}>
                Clear
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {PLACES.map((s) => {
              const on = places.includes(s.slot);
              return (
                <button
                  key={s.slot}
                  type="button"
                  aria-pressed={on}
                  onClick={() => togglePlace(s.slot)}
                  disabled={busy}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    on ? "border-gray-900 bg-gray-900 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
                  )}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          {errors.places ? (
            <p className="text-xs text-red-600">{errors.places}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Icons are spread out: at most one per bar, button or pop-up, and up to four at different depths down each page. They scroll with the content, and every place exists for every guest, so all icons can always be found.
            </p>
          )}
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
          <p className="rounded-lg border border-dashed bg-white p-6 text-center text-sm text-muted-foreground">
            No hunts yet. Create one above, then switch it on.
          </p>
        ) : (
          hunts.map((h) => {
            const status = statusOf(h);
            return (
              <article key={h.id} className="rounded-lg border bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gray-100">
                      <HuntIcon url={h.icon_url} className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-medium">{h.title}</h3>
                        <Badge className={cn("border-transparent", status.tone)}>{status.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {h.spots.length} icons · {Number(h.reward_points).toLocaleString("en-US")} Privé Credits reward
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {h.starts_at ? formatMauritius(h.starts_at) : "Starts when switched on"} →{" "}
                        {h.ends_at ? formatMauritius(h.ends_at) : "no end date"}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={h.is_active}
                    onCheckedChange={(v) => setActive(h, v)}
                    disabled={busy}
                    aria-label={`${h.title} on or off`}
                  />
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 border-t pt-3 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-xs text-muted-foreground">Icons found</dt>
                    <dd className="font-medium tabular-nums">{(h.finds ?? 0).toLocaleString("en-US")}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Guests completed</dt>
                    <dd className="font-medium tabular-nums">{(h.winners ?? 0).toLocaleString("en-US")}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">Hidden on</dt>
                    <dd className="text-xs leading-5 text-gray-700">
                      {breakdown(h.spots)
                        .map(([slot, n]) => `${PLACE_LABEL[slot] || "Old placement"} ${n}`)
                        .join(" · ")}
                    </dd>
                  </div>
                </dl>

                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => reshuffle(h)} disabled={busy}>
                    Reshuffle places
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => remove(h)} disabled={busy}>
                    Delete
                  </Button>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}

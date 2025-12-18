"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

/* ---------------- CONSTANTS ---------------- */

const inputClass =
  "border border-gray-300 focus:border-gray-400 focus:ring-0 bg-white";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/**
 * These are the labels you want to show in UI (keep as-is).
 * We'll still make them tick correctly by mapping + normalization.
 */
const FACILITY_OPTIONS = [
  "Air Conditioning",
  "WiFi",
  "Parking",
  "Valet Parking",
  "Outdoor Seating",
  "Live Music",
  "Family Friendly",
  "Wheelchair Accessible",
  "Pet Friendly",
  "Bar Available",
];

/** Generates 15-min slots in 24h format (kept as your code) */
const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const h = String(Math.floor(i / 4)).padStart(2, "0");
  const m = String((i % 4) * 15).padStart(2, "0");
  return `${h}:${m}`;
});

/* ---------------- NORMALIZATION (Facilities Tick Fix) ---------------- */

/**
 * Normalize strings so DB values like:
 * "Free Wi-Fi", "Free WiFi", "wifi", "WiFi", "Air-conditioned'", "Air conditioned"
 * can match your UI labels reliably.
 */
const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Map each UI option to acceptable DB variants.
 * Add more synonyms here if you discover new DB values.
 */
const FACILITY_VARIANTS: Record<string, string[]> = {
  "Air Conditioning": ["Air Conditioning", "Air-conditioned", "Air-conditioned'", "Air conditioned", "Airconditioned"],
  WiFi: ["WiFi", "Wifi", "Free Wi-Fi", "Free WiFi", "Free wifi", "wifi"],
  Parking: ["Parking", "Parking available", "Parking Available"],
  "Valet Parking": ["Valet Parking", "Valet parking", "Valet"],
  "Outdoor Seating": ["Outdoor Seating", "Outdoor seating", "Outdoor"],
  "Live Music": ["Live Music", "Live music"],
  "Family Friendly": ["Family Friendly", "Family friendly"],
  "Wheelchair Accessible": ["Wheelchair Accessible", "Wheelchair accessible"],
  "Pet Friendly": ["Pet Friendly", "Pet friendly"],
  "Bar Available": ["Bar Available", "Bar available", "Bar"],
};

/* ---------------- OPENING HOURS UTILS ---------------- */

const parseOpeningHours = (raw: any) => {
  const result: any = {};
  DAYS.forEach((day) => {
    const v = raw?.[day];
    if (typeof v === "string" && v.includes("-")) {
      const [open, close] = v.split("-").map((x) => x.trim());
      result[day] = { open, close };
    } else {
      result[day] = { open: "", close: "" };
    }
  });
  return result;
};

const serializeOpeningHours = (hours: any) => {
  const result: any = {};
  DAYS.forEach((day) => {
    const { open, close } = hours[day] || {};
    if (open && close) result[day] = `${open} - ${close}`;
  });
  return result;
};

/* ---------------- COMPONENT ---------------- */

export default function RestaurantDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [restaurant, setRestaurant] = useState<any>(null);
  const [restaurantOriginal, setRestaurantOriginal] = useState<any>(null);

  const [openingHours, setOpeningHours] = useState<any>({});
  const [openingHoursOriginal, setOpeningHoursOriginal] = useState<any>({});

  // ✅ week include/exclude
  const [weekEnabled, setWeekEnabled] = useState(true);

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const normalizedFacilitiesSet = useMemo(() => {
    const arr: string[] = restaurant?.facilities || [];
    return new Set(arr.map((x) => norm(x)));
  }, [restaurant?.facilities]);

  const isFacilityChecked = (uiLabel: string) => {
    const variants = FACILITY_VARIANTS[uiLabel] || [uiLabel];
    return variants.some((v) => normalizedFacilitiesSet.has(norm(v)));
  };

  const toggleFacility = (uiLabel: string, checked: boolean) => {
    const current: string[] = restaurant?.facilities || [];
    const variants = FACILITY_VARIANTS[uiLabel] || [uiLabel];
    const variantsNorm = new Set(variants.map((v) => norm(v)));

    if (checked) {
      // store canonical UI label (clean) OR keep existing DB value if already present
      // if any variant already exists, don't duplicate
      const already = current.some((x) => variantsNorm.has(norm(x)));
      const next = already ? current : [...current, uiLabel];
      setRestaurant({ ...restaurant, facilities: next });
      return;
    }

    // remove any matching variant strings
    const next = current.filter((x) => !variantsNorm.has(norm(x)));
    setRestaurant({ ...restaurant, facilities: next });
  };

  useEffect(() => {
    const fetchRestaurant = async () => {
      const { data, error } = await supabaseBrowser
        .from("restaurants")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        showToast({
          type: "error",
          title: "Failed to load restaurant",
          description: error.message,
        });
        return;
      }

      setRestaurant(data);
      setRestaurantOriginal(data);

      const parsed = parseOpeningHours(data.opening_hours);
      setOpeningHours(parsed);
      setOpeningHoursOriginal(parsed);

      // ✅ enable week if there is any opening_hours stored
      setWeekEnabled(!!data.opening_hours && Object.keys(data.opening_hours || {}).length > 0);
    };

    fetchRestaurant();
  }, [id]);

  const handleCancel = () => {
    setRestaurant(restaurantOriginal);
    setOpeningHours(openingHoursOriginal);
    setWeekEnabled(!!restaurantOriginal?.opening_hours && Object.keys(restaurantOriginal?.opening_hours || {}).length > 0);
    setEditMode(false);
  };

  const handleSave = async () => {
    setSaving(true);

    const payload = {
      // keep all editable fields you already had
      name: restaurant.name,
      phone: restaurant.phone,
      area: restaurant.area,
      city: restaurant.city,
      full_address: restaurant.full_address,
      cuisines: restaurant.cuisines,
      cost_for_two: restaurant.cost_for_two,
      distance: restaurant.distance,
      offer: restaurant.offer,
      facilities: restaurant.facilities,
      highlights: restaurant.highlights,
      worth_visit: restaurant.worth_visit,

      // ✅ week include/exclude
      opening_hours: weekEnabled ? serializeOpeningHours(openingHours) : {},

      is_active: restaurant.is_active,

      // keep images unchanged (they’re shown; if you later add upload/delete, update here)
      food_images: restaurant.food_images,
      ambience_images: restaurant.ambience_images,

      // keep these unchanged (read-only in UI)
      menu: restaurant.menu,
      reviews: restaurant.reviews,
    };

    const { error } = await supabaseBrowser.from("restaurants").update(payload).eq("id", id);

    if (error) {
      showToast({
        type: "error",
        title: "Update failed",
        description: error.message,
      });
      setSaving(false);
      return;
    }

    showToast({ type: "success", title: "Restaurant updated" });
    setEditMode(false);

    // refresh originals so cancel doesn't revert back to older state
    setRestaurantOriginal({ ...restaurant, opening_hours: payload.opening_hours });
    setOpeningHoursOriginal(openingHours);
    setSaving(false);
  };

  if (!restaurant) return <div className="p-6">Loading…</div>;

  return (
    <div className="w-full p-4  space-y-12">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-gray-300 pb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-md hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold">{restaurant.name}</h1>
            <p className="text-sm text-gray-500">
              {restaurant.area}, {restaurant.city}
            </p>
          </div>
        </div>

        {!editMode ? (
          <Button onClick={() => setEditMode(true)}>Edit</Button>
        ) : (
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#DA3224] text-white">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>

       <Section title="System">
        <div className="flex items-center gap-4">
          <span>Active</span>
          <Switch
            checked={restaurant.is_active}
            disabled={!editMode}
            onCheckedChange={(v) => setRestaurant({ ...restaurant, is_active: v })}
          />
        </div>

      </Section>

      {/* BASIC INFO */}
      <Section title="Basic Information">
        <Grid>
          <Field label="Name">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={restaurant.name}
              onChange={(e) => setRestaurant({ ...restaurant, name: e.target.value })}
            />
          </Field>

          <Field label="Phone">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={restaurant.phone ?? ""}
              onChange={(e) => setRestaurant({ ...restaurant, phone: e.target.value })}
            />
          </Field>

          <Field label="City">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={restaurant.city ?? ""}
              onChange={(e) => setRestaurant({ ...restaurant, city: e.target.value })}
            />
          </Field>

          <Field label="Area">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={restaurant.area ?? ""}
              onChange={(e) => setRestaurant({ ...restaurant, area: e.target.value })}
            />
          </Field>
        </Grid>

        <Field label="Full Address">
          <Textarea
            className={inputClass}
            disabled={!editMode}
            value={restaurant.full_address ?? ""}
            onChange={(e) => setRestaurant({ ...restaurant, full_address: e.target.value })}
          />
        </Field>
      </Section>

      {/* CUISINES & OFFER */}
      <Section title="Cuisine & Offer">
        <Grid>
          <Field label="Cuisines">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={restaurant.cuisines?.join(", ") ?? ""}
              onChange={(e) =>
                setRestaurant({
                  ...restaurant,
                  cuisines: e.target.value
                    .split(",")
                    .map((v) => v.trim())
                    .filter(Boolean),
                })
              }
            />
          </Field>

          <Field label="Offer">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={restaurant.offer ?? ""}
              onChange={(e) => setRestaurant({ ...restaurant, offer: e.target.value })}
            />
          </Field>

          {/* ✅ keeping other fields (you already save these; show them too) */}
          <Field label="Cost for Two">
            <Input
              className={inputClass}
              type="number"
              disabled={!editMode}
              value={restaurant.cost_for_two ?? ""}
              onChange={(e) => setRestaurant({ ...restaurant, cost_for_two: Number(e.target.value) })}
            />
          </Field>

          <Field label="Distance (km)">
            <Input
              className={inputClass}
              type="number"
              step="0.1"
              disabled={!editMode}
              value={restaurant.distance ?? ""}
              onChange={(e) => setRestaurant({ ...restaurant, distance: Number(e.target.value) })}
            />
          </Field>
        </Grid>
      </Section>

      {/* ✅ WEEK ENABLE / DISABLE */}
      <Section title="Weekly Schedule">
        <div className="flex items-center gap-4">
          <span className="text-sm">Enable opening hours for this week</span>
          <Switch checked={weekEnabled} disabled={!editMode} onCheckedChange={setWeekEnabled} />
        </div>
        {!weekEnabled && (
          <p className="text-xs text-gray-500">
            Week disabled: opening hours will be saved as empty (restaurant closed for the week).
          </p>
        )}
      </Section>

      {/* OPENING HOURS */}
      <Section title="Opening Hours">
        {DAYS.map((day) => (
          <div key={day} className="grid grid-cols-[120px_1fr_1fr] gap-4 mb-2">
            <span className="text-sm">{day}</span>
            <select
              disabled={!editMode || !weekEnabled}
              className="border rounded-md px-3 py-2 text-sm bg-white disabled:bg-gray-100"
              value={openingHours[day]?.open || ""}
              onChange={(e) =>
                setOpeningHours({
                  ...openingHours,
                  [day]: { ...openingHours[day], open: e.target.value },
                })
              }
            >
              <option value="">Open</option>
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              disabled={!editMode || !weekEnabled}
              className="border rounded-md px-3 py-2 text-sm bg-white disabled:bg-gray-100"
              value={openingHours[day]?.close || ""}
              onChange={(e) =>
                setOpeningHours({
                  ...openingHours,
                  [day]: { ...openingHours[day], close: e.target.value },
                })
              }
            >
              <option value="">Close</option>
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        ))}
      </Section>

      {/* FACILITIES (✅ ticks correctly even if DB strings differ) */}
      <Section title="Facilities">
        <div className="grid grid-cols-2 gap-3">
          {FACILITY_OPTIONS.map((f) => (
            <label key={f} className="flex gap-2 items-center text-sm">
              <input
                type="checkbox"
                disabled={!editMode}
                checked={isFacilityChecked(f)}
                onChange={(e) => toggleFacility(f, e.target.checked)}
              />
              {f}
            </label>
          ))}
        </div>

        {/* shows raw stored values for debugging (optional, remove later) */}
        <div className="text-xs text-gray-500 mt-3">
          <div className="font-medium">Stored facilities:</div>
          <div>{(restaurant.facilities || []).join(", ") || "-"}</div>
        </div>
      </Section>

      {/* HIGHLIGHTS / WORTH VISIT (you already save these; ensure they are shown) */}
      <Section title="Highlights & Worth Visiting">
        <Grid>
          <Field label="Highlights (comma separated)">
            <Textarea
              className={inputClass}
              disabled={!editMode}
              value={(restaurant.highlights || []).join(", ")}
              onChange={(e) =>
                setRestaurant({
                  ...restaurant,
                  highlights: e.target.value
                    .split(",")
                    .map((v) => v.trim())
                    .filter(Boolean),
                })
              }
            />
          </Field>

          <Field label="Worth Visit (comma separated)">
            <Textarea
              className={inputClass}
              disabled={!editMode}
              value={(restaurant.worth_visit || []).join(", ")}
              onChange={(e) =>
                setRestaurant({
                  ...restaurant,
                  worth_visit: e.target.value
                    .split(",")
                    .map((v) => v.trim())
                    .filter(Boolean),
                })
              }
            />
          </Field>
        </Grid>
      </Section>

      {/* IMAGES */}
      <Section title="Images">
        <ImageGrid title="Food Images" images={restaurant.food_images} />
        <ImageGrid title="Ambience Images" images={restaurant.ambience_images} />
      </Section>

      {/* RATINGS (Read Only) */}
      <Section title="Ratings (Read Only)">
        <Grid>
          <ReadOnly label="Overall" value={restaurant.rating} />
          <ReadOnly label="Food" value={restaurant.food_rating} />
          <ReadOnly label="Service" value={restaurant.service_rating} />
          <ReadOnly label="Ambience" value={restaurant.ambience_rating} />
          <ReadOnly label="Total Ratings" value={restaurant.total_ratings} />
        </Grid>
      </Section>

      {/* MENU / REVIEWS (Read Only but shown so nothing is “missed”) */}
      <Section title="Menu (Read Only)">
        <Textarea
          className={inputClass}
          readOnly
          value={restaurant.menu ? JSON.stringify(restaurant.menu, null, 2) : ""}
          placeholder="No menu"
        />
      </Section>

      <Section title="Reviews (Read Only)">
        <Textarea
          className={inputClass}
          readOnly
          value={restaurant.reviews ? JSON.stringify(restaurant.reviews, null, 2) : ""}
          placeholder="No reviews"
        />
      </Section>

        <ReadOnly
          label="Created At"
          value={restaurant.created_at ? new Date(restaurant.created_at).toLocaleString() : "-"}
        />

      {/* SYSTEM */}
     
    </div>
  );
}

/* ---------------- HELPERS ---------------- */

const Section = ({ title, children }: any) => (
  <section className="space-y-4">
    <h2 className="text-lg font-semibold">{title}</h2>
    {children}
  </section>
);

const Field = ({ label, children }: any) => (
  <div className="space-y-1">
    <label className="text-xs text-gray-500 uppercase">{label}</label>
    {children}
  </div>
);

const Grid = ({ children }: any) => (
  <div className="grid grid-cols-2 gap-6">{children}</div>
);

const ReadOnly = ({ label, value }: any) => (
  <div>
    <label className="text-xs text-gray-500 uppercase">{label}</label>
    <div className="text-sm font-medium">{value ?? "-"}</div>
  </div>
);

const ImageGrid = ({ title, images }: any) => (
  <div className="space-y-2">
    <h3 className="text-sm font-medium">{title}</h3>
    <div className="grid grid-cols-4 gap-3">
      {images?.length ? (
        images.map((src: string, i: number) => (
          <img key={i} src={src} className="w-full h-32 object-cover rounded-md border" />
        ))
      ) : (
        <p className="text-sm text-gray-400">No images</p>
      )}
    </div>
  </div>
);

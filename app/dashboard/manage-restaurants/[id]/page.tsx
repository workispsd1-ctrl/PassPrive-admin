"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, X } from "lucide-react";

import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";

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

const getDayValue = (raw: any, day: string) => {
  if (!raw || typeof raw !== "object") return undefined;
  return raw[day] ?? raw[day.toLowerCase()] ?? raw[day.toUpperCase()];
};

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

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

type MoodCategoryRecord = { title?: string };

function extractCategoryList(payload: unknown): MoodCategoryRecord[] {
  if (Array.isArray(payload)) return payload as MoodCategoryRecord[];

  const recordPayload =
    payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;

  if (!recordPayload) return [];

  const possibleKeys = ["data", "items", "results", "categories", "moodCategories"];
  for (const key of possibleKeys) {
    if (Array.isArray(recordPayload[key])) {
      return recordPayload[key] as MoodCategoryRecord[];
    }
  }

  return [];
}

function offerToInputValue(offer: unknown): string {
  if (offer === null || offer === undefined) return "";
  if (typeof offer === "string") return offer;
  if (typeof offer === "object") {
    const record = offer as Record<string, unknown>;
    if (typeof record.text === "string") return record.text;
    if (typeof record.title === "string") return record.title;
    if (typeof record.label === "string") return record.label;
    return "";
  }
  return "";
}

function offerToPayload(offer: unknown) {
  if (offer === null || offer === undefined) return null;
  if (typeof offer === "string") {
    const text = offer.trim();
    return text ? { text } : null;
  }
  if (typeof offer === "object") return offer;
  return null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
}

function asNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asIntOrDefault(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

async function getAccessToken() {
  const { data, error } = await supabaseBrowser.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error("Not logged in.");
  return token;
}

/* ---------------- OPENING HOURS UTILS ---------------- */

const parseOpeningHours = (raw: any) => {
  const result: any = {};
  DAYS.forEach((day) => {
    const v = getDayValue(raw, day);
    if (typeof v === "string" && v.includes("-")) {
      const [open, close] = v.split("-").map((x) => x.trim());
      result[day] = { open, close };
    } else if (v && typeof v === "object") {
      result[day] = { open: v.open || "", close: v.close || "" };
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
    if (open && close) {
      result[day.toLowerCase()] = { open, close };
    }
  });
  return result;
};

/* ---------------- COMPONENT ---------------- */

export default function RestaurantDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const { isAdmin } = useSelector((state: RootState) => state.admin);

  const [restaurant, setRestaurant] = useState<any>(null);
  const [restaurantOriginal, setRestaurantOriginal] = useState<any>(null);

  const [openingHours, setOpeningHours] = useState<any>({});
  const [openingHoursOriginal, setOpeningHoursOriginal] = useState<any>({});

  // ✅ week include/exclude
  const [weekEnabled, setWeekEnabled] = useState(true);
  const [moodCategoryOptions, setMoodCategoryOptions] = useState<string[]>([]);

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // ✅ Image management state
  const [foodImagesToAdd, setFoodImagesToAdd] = useState<File[]>([]);
  const [ambienceImagesToAdd, setAmbienceImagesToAdd] = useState<File[]>([]);
  const [foodImagesToDelete, setFoodImagesToDelete] = useState<string[]>([]);
  const [ambienceImagesToDelete, setAmbienceImagesToDelete] = useState<string[]>([]);

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

  /* ---------------- IMAGE MANAGEMENT HELPERS ---------------- */

  /**
   * Extract storage path from Supabase public URL
   * Example: https://xyz.supabase.co/storage/v1/object/public/restaurants/food/123/abc.jpg
   * Returns: food/123/abc.jpg
   */
  const extractStoragePath = (url: string): string | null => {
    try {
      const match = url.match(/\/restaurants\/(.+)$/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  };

  /**
   * Upload new images to Supabase Storage
   */
  const uploadNewImages = async (
    restaurantId: string,
    files: File[],
    type: "food" | "ambience"
  ): Promise<string[]> => {
    const urls: string[] = [];
    const uploadedPaths: string[] = [];

    try {
      // Upload with concurrency limit of 3
      const batchSize = 3;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const batchPromises = batch.map(async (file) => {
          const ext = file.name.split(".").pop() || "jpg";
          const timestamp = Date.now();
          const random = Math.random().toString(36).slice(2, 9);
          const path = `${type}/${restaurantId}/${timestamp}-${random}.${ext}`;

          const { error } = await supabaseBrowser.storage
            .from("restaurants")
            .upload(path, file);

          if (error) throw error;

          uploadedPaths.push(path);

          const { data } = supabaseBrowser.storage
            .from("restaurants")
            .getPublicUrl(path);

          return data.publicUrl;
        });

        const batchUrls = await Promise.all(batchPromises);
        urls.push(...batchUrls);
      }

      return urls;
    } catch (error) {
      // Cleanup: delete successfully uploaded files
      if (uploadedPaths.length > 0) {
        await supabaseBrowser.storage
          .from("restaurants")
          .remove(uploadedPaths)
          .catch(() => { }); // Silent fail on cleanup
      }
      throw error;
    }
  };

  /**
   * Delete images from Supabase Storage
   */
  const deleteImagesFromStorage = async (urls: string[]): Promise<void> => {
    const paths = urls.map(extractStoragePath).filter(Boolean) as string[];
    if (paths.length === 0) return;

    const { error } = await supabaseBrowser.storage
      .from("restaurants")
      .remove(paths);

    if (error) throw error;
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

  useEffect(() => {
    const loadMoodCategories = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/moodcategories`, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) return;

        const payload = await response.json().catch(() => null);
        const moodTitles = Array.from(
          new Set(
            extractCategoryList(payload)
              .map((item) => item?.title)
              .filter(
                (value): value is string =>
                  typeof value === "string" && value.trim().length > 0
              )
              .map((value) => value.trim())
          )
        ).sort((a, b) => a.localeCompare(b));

        setMoodCategoryOptions(moodTitles);
      } catch {
        // keep editor usable even when mood categories cannot be loaded
      }
    };

    void loadMoodCategories();
  }, []);

  const handleCancel = () => {
    setRestaurant(restaurantOriginal);
    setOpeningHours(openingHoursOriginal);
    setWeekEnabled(!!restaurantOriginal?.opening_hours && Object.keys(restaurantOriginal?.opening_hours || {}).length > 0);
    // ✅ Reset image changes
    setFoodImagesToAdd([]);
    setAmbienceImagesToAdd([]);
    setFoodImagesToDelete([]);
    setAmbienceImagesToDelete([]);
    setEditMode(false);
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      // ✅ Step 1: Delete removed images from storage
      if (foodImagesToDelete.length > 0 || ambienceImagesToDelete.length > 0) {
        try {
          await deleteImagesFromStorage([...foodImagesToDelete, ...ambienceImagesToDelete]);
        } catch (error: any) {
          showToast({
            type: "error",
            title: "Failed to delete images",
            description: error.message,
          });
          setSaving(false);
          return;
        }
      }

      // ✅ Step 2: Upload new images
      let newFoodUrls: string[] = [];
      let newAmbienceUrls: string[] = [];

      try {
        if (foodImagesToAdd.length > 0) {
          newFoodUrls = await uploadNewImages(id as string, foodImagesToAdd, "food");
        }
        if (ambienceImagesToAdd.length > 0) {
          newAmbienceUrls = await uploadNewImages(id as string, ambienceImagesToAdd, "ambience");
        }
      } catch (error: any) {
        showToast({
          type: "error",
          title: "Failed to upload images",
          description: error.message,
        });
        setSaving(false);
        return;
      }

      // ✅ Step 3: Merge image arrays (existing - deleted + new)
      const finalFoodImages = [
        ...(restaurant.food_images || []).filter((url: string) => !foodImagesToDelete.includes(url)),
        ...newFoodUrls,
      ];

      const finalAmbienceImages = [
        ...(restaurant.ambience_images || []).filter((url: string) => !ambienceImagesToDelete.includes(url)),
        ...newAmbienceUrls,
      ];

      const payload = {
        name: restaurant.name,
        phone: restaurant.phone,
        area: restaurant.area,
        city: restaurant.city,
        full_address: restaurant.full_address,
        cuisines: asStringArray(restaurant.cuisines),
        cost_for_two: asNullableNumber(restaurant.cost_for_two),
        distance: asNullableNumber(restaurant.distance),
        offer: offerToPayload(restaurant.offer),
        facilities: asStringArray(restaurant.facilities),
        highlights: asStringArray(restaurant.highlights),
        worth_visit: asStringArray(restaurant.worth_visit),
        mood_tags: asStringArray(restaurant.mood_tags),
        is_pure_veg: !!restaurant.is_pure_veg,

        // ✅ week include/exclude
        opening_hours: weekEnabled ? serializeOpeningHours(openingHours) : {},

        is_active: restaurant.is_active,

        // ✅ Updated images
        food_images: finalFoodImages,
        ambience_images: finalAmbienceImages,

        // ✅ New booking fields
        booking_enabled: !!restaurant.booking_enabled,
        avg_duration_minutes: asIntOrDefault(restaurant.avg_duration_minutes, 90),
        max_bookings_per_slot: asNullableNumber(restaurant.max_bookings_per_slot),
        advance_booking_days: asIntOrDefault(restaurant.advance_booking_days, 30),

        // ✅ link owner (only admins can change this successfully in backend)
        owner_user_id: restaurant.owner_user_id || null,

        // keep these unchanged (read-only in UI)
        menu: restaurant.menu,
        reviews: restaurant.reviews,
      };

      const token = await getAccessToken();
      const res = await fetch(`${API_BASE}/api/restaurants/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        const details = json?.details ? ` ${JSON.stringify(json.details)}` : "";
        throw new Error(`${json?.error || "Update failed"}${details}`.trim());
      }

      showToast({ type: "success", title: "Restaurant updated" });
      setEditMode(false);

      // ✅ Refresh originals and reset image state
      const updatedRestaurant = { ...restaurant, opening_hours: payload.opening_hours, food_images: finalFoodImages, ambience_images: finalAmbienceImages };
      setRestaurant(updatedRestaurant);
      setRestaurantOriginal(updatedRestaurant);
      setOpeningHoursOriginal(openingHours);
      setFoodImagesToAdd([]);
      setAmbienceImagesToAdd([]);
      setFoodImagesToDelete([]);
      setAmbienceImagesToDelete([]);
      setSaving(false);
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Unexpected error",
        description: error.message,
      });
      setSaving(false);
    }
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
        <Grid>
          <Field label="Active">
            <Switch
              checked={restaurant.is_active}
              disabled={!editMode}
              onCheckedChange={(v) => setRestaurant({ ...restaurant, is_active: v })}
            />
          </Field>

          {/* 🛡️ OWNER MANAGEMENT (Only for Admins) */}
          {isAdmin && (
            <Field label="Owner User ID">
              <Input
                className={inputClass}
                disabled={!editMode}
                value={restaurant.owner_user_id ?? ""}
                placeholder="Partner UUID (leave empty to unassign)"
                onChange={(e) => setRestaurant({ ...restaurant, owner_user_id: e.target.value || null })}
              />
            </Field>
          )}
        </Grid>
      </Section>

      <Section title="Booking & Reservation">
        <Grid>
          <Field label="Booking Enabled">
            <Switch
              checked={restaurant.booking_enabled}
              disabled={!editMode}
              onCheckedChange={(v) => setRestaurant({ ...restaurant, booking_enabled: v })}
            />
          </Field>

          <Field label="Avg Duration (minutes)">
            <Input
              className={inputClass}
              type="number"
              disabled={!editMode}
              value={restaurant.avg_duration_minutes ?? ""}
              onChange={(e) => setRestaurant({ ...restaurant, avg_duration_minutes: Number(e.target.value) })}
            />
          </Field>

          <Field label="Max Bookings Per Slot">
            <Input
              className={inputClass}
              type="number"
              disabled={!editMode}
              value={restaurant.max_bookings_per_slot ?? ""}
              placeholder="No limit"
              onChange={(e) => setRestaurant({ ...restaurant, max_bookings_per_slot: e.target.value ? Number(e.target.value) : null })}
            />
          </Field>

          <Field label="Advance Booking (days)">
            <Input
              className={inputClass}
              type="number"
              disabled={!editMode}
              value={restaurant.advance_booking_days ?? ""}
              onChange={(e) => setRestaurant({ ...restaurant, advance_booking_days: Number(e.target.value) })}
            />
          </Field>
        </Grid>
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
              value={offerToInputValue(restaurant.offer)}
              onChange={(e) => setRestaurant({ ...restaurant, offer: e.target.value })}
            />
          </Field>

          <Field label="Mood Tags">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!editMode}
                  className="w-full justify-between bg-white border-gray-300"
                >
                  {Array.isArray(restaurant.mood_tags) && restaurant.mood_tags.length
                    ? `${restaurant.mood_tags.length} mood tag${restaurant.mood_tags.length > 1 ? "s" : ""} selected`
                    : "Select mood tags"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={6}
                className="z-[9999] w-[420px] max-w-[calc(100vw-2rem)] max-h-72 overflow-y-auto rounded-md border border-gray-300 bg-white shadow-xl"
              >
                {Array.from(
                  new Set([
                    ...(Array.isArray(restaurant.mood_tags) ? restaurant.mood_tags : []),
                    ...moodCategoryOptions,
                  ])
                ).map((mood) => (
                  <DropdownMenuCheckboxItem
                    key={mood}
                    checked={Array.isArray(restaurant.mood_tags) && restaurant.mood_tags.includes(mood)}
                    onCheckedChange={(checked) => {
                      const current = Array.isArray(restaurant.mood_tags) ? restaurant.mood_tags : [];
                      const next =
                        checked === true
                          ? current.includes(mood)
                            ? current
                            : [...current, mood]
                          : current.filter((item: string) => item !== mood);
                      setRestaurant({ ...restaurant, mood_tags: next });
                    }}
                  >
                    {mood}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {Array.isArray(restaurant.mood_tags) && restaurant.mood_tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {restaurant.mood_tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full border border-gray-300 bg-white px-2 py-1 text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </Field>

          <Field label="Pure Veg">
            <div className="flex items-center gap-3 h-10">
              <Switch
                checked={!!restaurant.is_pure_veg}
                disabled={!editMode}
                onCheckedChange={(value) =>
                  setRestaurant({ ...restaurant, is_pure_veg: value })
                }
              />
              <span className="text-sm text-gray-700">Vegetarian restaurant</span>
            </div>
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
          <Switch
            checked={weekEnabled}
            disabled={!editMode}
            onCheckedChange={setWeekEnabled}
            className="data-[state=unchecked]:bg-rose-500 data-[state=checked]:bg-blue-600"
          />
          <span
            className={`text-sm font-medium ${weekEnabled ? "text-blue-700" : "text-rose-600"}`}
          >
            {weekEnabled ? "Open" : "Closed"}
          </span>
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
        {/* Food Images Section */}
        <div className="space-y-3">
          <EditableImageGrid
            title="Food Images"
            images={(restaurant.food_images || []).filter(
              (url: string) => !foodImagesToDelete.includes(url)
            )}
            onDelete={(url) => setFoodImagesToDelete([...foodImagesToDelete, url])}
            disabled={!editMode}
          />

          {editMode && (
            <div className="space-y-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Add Food Images</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setFoodImagesToAdd([...foodImagesToAdd, ...files]);
                    e.target.value = ""; // Reset input
                  }}
                  className="mt-1 block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-gray-100 file:text-gray-700
                    hover:file:bg-gray-200
                    cursor-pointer"
                />
              </label>

              <FilePreviewGrid
                files={foodImagesToAdd}
                onRemove={(idx) =>
                  setFoodImagesToAdd(foodImagesToAdd.filter((_, i) => i !== idx))
                }
              />
            </div>
          )}
        </div>

        {/* Ambience Images Section */}
        <div className="space-y-3 mt-6">
          <EditableImageGrid
            title="Ambience Images"
            images={(restaurant.ambience_images || []).filter(
              (url: string) => !ambienceImagesToDelete.includes(url)
            )}
            onDelete={(url) => setAmbienceImagesToDelete([...ambienceImagesToDelete, url])}
            disabled={!editMode}
          />

          {editMode && (
            <div className="space-y-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Add Ambience Images</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setAmbienceImagesToAdd([...ambienceImagesToAdd, ...files]);
                    e.target.value = ""; // Reset input
                  }}
                  className="mt-1 block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-gray-100 file:text-gray-700
                    hover:file:bg-gray-200
                    cursor-pointer"
                />
              </label>

              <FilePreviewGrid
                files={ambienceImagesToAdd}
                onRemove={(idx) =>
                  setAmbienceImagesToAdd(ambienceImagesToAdd.filter((_, i) => i !== idx))
                }
              />
            </div>
          )}
        </div>
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

/* ---------------- IMAGE COMPONENTS ---------------- */

/**
 * Editable Image Grid - shows existing images with delete buttons
 */
const EditableImageGrid = ({
  title,
  images,
  onDelete,
  disabled,
}: {
  title: string;
  images: string[];
  onDelete: (url: string) => void;
  disabled: boolean;
}) => (
  <div className="space-y-2">
    <h3 className="text-sm font-medium">{title}</h3>
    <div className="grid grid-cols-4 gap-3">
      {images?.length ? (
        images.map((src: string, i: number) => (
          <div key={i} className="relative h-32 rounded-md overflow-hidden border">
            <img src={src} className="w-full h-full object-cover" alt={`${title} ${i + 1}`} />
            {!disabled && (
              <button
                type="button"
                onClick={() => onDelete(src)}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black transition-colors"
                aria-label="Delete image"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))
      ) : (
        <p className="text-sm text-gray-400">No images</p>
      )}
    </div>
  </div>
);

/**
 * File Preview Grid - shows newly selected files with remove buttons
 */
const FilePreviewGrid = ({
  files,
  onRemove,
}: {
  files: File[];
  onRemove: (index: number) => void;
}) => {
  if (files.length === 0) return null;

  return (
    <div className="grid grid-cols-4 gap-3 mt-3">
      {files.map((file, index) => (
        <div key={index} className="relative h-32 rounded-md overflow-hidden border border-gray-300">
          <img
            src={URL.createObjectURL(file)}
            alt={`Preview ${index + 1}`}
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black transition-colors"
            aria-label="Remove file"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

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

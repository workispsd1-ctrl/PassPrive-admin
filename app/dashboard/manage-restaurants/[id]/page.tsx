"use client";

import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, X } from "lucide-react";
import { useSelector } from "react-redux";

import { RootState } from "@/store/store";
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
import {
  DAY_NAMES,
  DayHours,
  RestaurantFlatRecord,
  RestaurantOfferInput,
  RestaurantSubscriptionInput,
  buildRestaurantBasePayload,
  deleteRestaurantImages,
  fetchRestaurantDetail,
  replaceRestaurantRelations,
  uploadRestaurantImages,
} from "@/lib/restaurantAdmin";

const inputClass = "border border-gray-300 focus:border-gray-400 focus:ring-0 bg-white";
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, "0")}:00`);
const OFFER_TYPE_OPTIONS = [
  { value: "PERCENTAGE", label: "Percentage" },
  { value: "FLAT", label: "Flat" },
  { value: "CASHBACK", label: "Cashback" },
] as const;
const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

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

type MoodCategoryRecord = { title?: string };

function emptyOpeningHours() {
  return DAY_NAMES.reduce<Record<string, DayHours>>((accumulator, day) => {
    accumulator[day] = { open: "", close: "", closed: false };
    return accumulator;
  }, {});
}

function extractCategoryList(payload: unknown): MoodCategoryRecord[] {
  if (Array.isArray(payload)) return payload as MoodCategoryRecord[];
  const recordPayload =
    payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  if (!recordPayload) return [];
  for (const key of ["data", "items", "results", "categories", "moodCategories"]) {
    if (Array.isArray(recordPayload[key])) return recordPayload[key] as MoodCategoryRecord[];
  }
  return [];
}

function commaSeparatedToArray(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function bookingTermsToTextarea(value: string[] | null | undefined) {
  return value?.join("\n") ?? "";
}

function bookingTermsToPayload(value: string) {
  const normalized = value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
  return normalized.length ? normalized : null;
}

function defaultOffer(): RestaurantOfferInput {
  return {
    title: "",
    description: "",
    badge_text: "",
    offer_type: "",
    discount_value: null,
    min_spend: null,
    start_at: "",
    end_at: "",
    is_active: true,
    metadata: null,
  };
}

function offerAmountLabel(offerType?: string | null) {
  if (offerType === "PERCENTAGE") return "Discount percentage";
  if (offerType === "CASHBACK") return "Cashback amount";
  return "Flat amount";
}

function defaultSubscription(): RestaurantSubscriptionInput {
  return {
    plan_code: "",
    status: "active",
    unlock_all: false,
    time_slot_enabled: false,
    repeat_rewards_enabled: false,
    dish_discounts_enabled: false,
    starts_at: "",
    expires_at: "",
  };
}

function cloneRestaurant(record: RestaurantFlatRecord): RestaurantFlatRecord {
  return {
    ...record,
    cuisines: [...record.cuisines],
    facilities: [...record.facilities],
    highlights: [...record.highlights],
    worth_visit: [...record.worth_visit],
    mood_tags: [...record.mood_tags],
    food_images: [...record.food_images],
    ambience_images: [...record.ambience_images],
    menu: [...record.menu],
    opening_hours: JSON.parse(JSON.stringify(record.opening_hours || emptyOpeningHours())),
    offers: record.offers.map((offer) => ({ ...offer })),
    offer: record.offer ? { ...record.offer } : null,
    subscription: record.subscription ? { ...record.subscription } : null,
    reviews: [...record.reviews],
  };
}

export default function RestaurantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAdmin } = useSelector((state: RootState) => state.admin);

  const [restaurant, setRestaurant] = useState<RestaurantFlatRecord | null>(null);
  const [restaurantOriginal, setRestaurantOriginal] = useState<RestaurantFlatRecord | null>(null);
  const [openingHours, setOpeningHours] = useState<Record<string, DayHours>>(emptyOpeningHours());
  const [moodCategoryOptions, setMoodCategoryOptions] = useState<string[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const [foodImagesToAdd, setFoodImagesToAdd] = useState<File[]>([]);
  const [ambienceImagesToAdd, setAmbienceImagesToAdd] = useState<File[]>([]);
  const [menuImagesToAdd, setMenuImagesToAdd] = useState<File[]>([]);
  const [foodImagesToDelete, setFoodImagesToDelete] = useState<string[]>([]);
  const [ambienceImagesToDelete, setAmbienceImagesToDelete] = useState<string[]>([]);
  const [menuImagesToDelete, setMenuImagesToDelete] = useState<string[]>([]);

  useEffect(() => {
    const loadRestaurant = async () => {
      try {
        const data = await fetchRestaurantDetail(id);
        setRestaurant(cloneRestaurant(data));
        setRestaurantOriginal(cloneRestaurant(data));
        setOpeningHours(
          DAY_NAMES.reduce<Record<string, DayHours>>((accumulator, day) => {
            accumulator[day] = data.opening_hours?.[day] || { open: "", close: "", closed: false };
            return accumulator;
          }, {})
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to load restaurant";
        showToast({
          type: "error",
          title: "Failed to load restaurant",
          description: message,
        });
      }
    };

    void loadRestaurant();
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
              .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
              .map((value) => value.trim())
          )
        ).sort((left, right) => left.localeCompare(right));
        setMoodCategoryOptions(moodTitles);
      } catch {
        // Optional.
      }
    };

    void loadMoodCategories();
  }, []);

  const allMoodOptions = useMemo(() => {
    if (!restaurant) return moodCategoryOptions;
    return Array.from(new Set([...restaurant.mood_tags, ...moodCategoryOptions]));
  }, [restaurant, moodCategoryOptions]);

  const handleCancel = () => {
    if (!restaurantOriginal) return;
    setRestaurant(cloneRestaurant(restaurantOriginal));
    setOpeningHours(
      DAY_NAMES.reduce<Record<string, DayHours>>((accumulator, day) => {
        accumulator[day] = restaurantOriginal.opening_hours?.[day] || {
          open: "",
          close: "",
          closed: false,
        };
        return accumulator;
      }, {})
    );
    setFoodImagesToAdd([]);
    setAmbienceImagesToAdd([]);
    setMenuImagesToAdd([]);
    setFoodImagesToDelete([]);
    setAmbienceImagesToDelete([]);
    setMenuImagesToDelete([]);
    setEditMode(false);
  };

  const handleSave = async () => {
    if (!restaurant) return;
    setSaving(true);

    try {
      await deleteRestaurantImages([
        ...foodImagesToDelete,
        ...ambienceImagesToDelete,
        ...menuImagesToDelete,
      ]);

      const [newFoodUrls, newAmbienceUrls, newMenuUrls] = await Promise.all([
        uploadRestaurantImages(restaurant.id, foodImagesToAdd, "food"),
        uploadRestaurantImages(restaurant.id, ambienceImagesToAdd, "ambience"),
        uploadRestaurantImages(restaurant.id, menuImagesToAdd, "menu"),
      ]);

      const finalFoodImages = restaurant.food_images.filter((url) => !foodImagesToDelete.includes(url)).concat(newFoodUrls);
      const finalAmbienceImages = restaurant.ambience_images.filter((url) => !ambienceImagesToDelete.includes(url)).concat(newAmbienceUrls);
      const finalMenuImages = restaurant.menu.filter((url) => !menuImagesToDelete.includes(url)).concat(newMenuUrls);
      const coverImage = restaurant.cover_image || finalFoodImages[0] || finalAmbienceImages[0] || finalMenuImages[0] || null;

      const basePayload = buildRestaurantBasePayload({
        ...restaurant,
        cover_image: coverImage,
        booking_terms: bookingTermsToPayload(bookingTermsToTextarea(restaurant.booking_terms)),
      });

      const { error: updateError } = await supabaseBrowser
        .from("restaurants")
        .update(basePayload)
        .eq("id", restaurant.id);

      if (updateError) throw updateError;

      await replaceRestaurantRelations(restaurant.id, {
        cuisines: restaurant.cuisines,
        facilities: restaurant.facilities,
        highlights: restaurant.highlights,
        worth_visit: restaurant.worth_visit,
        mood_tags: restaurant.mood_tags,
        food_images: finalFoodImages,
        ambience_images: finalAmbienceImages,
        menu: finalMenuImages,
        opening_hours: openingHours,
        offers: restaurant.offers,
        subscription: restaurant.subscription,
      });

      const refreshed = await fetchRestaurantDetail(restaurant.id);
      setRestaurant(cloneRestaurant(refreshed));
      setRestaurantOriginal(cloneRestaurant(refreshed));
      setOpeningHours(
        DAY_NAMES.reduce<Record<string, DayHours>>((accumulator, day) => {
          accumulator[day] = refreshed.opening_hours?.[day] || { open: "", close: "", closed: false };
          return accumulator;
        }, {})
      );
      setFoodImagesToAdd([]);
      setAmbienceImagesToAdd([]);
      setMenuImagesToAdd([]);
      setFoodImagesToDelete([]);
      setAmbienceImagesToDelete([]);
      setMenuImagesToDelete([]);
      setEditMode(false);
      showToast({ type: "success", title: "Restaurant updated" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save restaurant";
      showToast({
        type: "error",
        title: "Failed to save restaurant",
        description: message,
      });
    } finally {
      setSaving(false);
    }
  };

  if (!restaurant) return <div className="p-6">Loading...</div>;

  return (
    <div className="w-full p-4 space-y-12">
      <div className="flex items-center justify-between border-b border-gray-300 pb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-md hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold">{restaurant.name}</h1>
            <p className="text-sm text-gray-500">{restaurant.area}, {restaurant.city}</p>
          </div>
        </div>

        {!editMode ? (
          <Button onClick={() => setEditMode(true)}>Edit</Button>
        ) : (
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleCancel} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#DA3224] text-white">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>

      <Section title="System">
        <Grid>
          <ToggleField label="Active" checked={restaurant.is_active} disabled={!editMode} onCheckedChange={(value) => setRestaurant({ ...restaurant, is_active: value })} />
          {isAdmin && (
            <Field label="Owner User ID">
              <Input className={inputClass} disabled={!editMode} value={restaurant.owner_user_id ?? ""} onChange={(e) => setRestaurant({ ...restaurant, owner_user_id: e.target.value || null })} />
            </Field>
          )}
        </Grid>
      </Section>

      <Section title="Basic Information">
        <Grid>
          <Field label="Name">
            <Input className={inputClass} disabled={!editMode} value={restaurant.name} onChange={(e) => setRestaurant({ ...restaurant, name: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input className={inputClass} disabled={!editMode} value={restaurant.phone ?? ""} onChange={(e) => setRestaurant({ ...restaurant, phone: e.target.value })} />
          </Field>
          <Field label="City">
            <Input className={inputClass} disabled={!editMode} value={restaurant.city ?? ""} onChange={(e) => setRestaurant({ ...restaurant, city: e.target.value })} />
          </Field>
          <Field label="Area">
            <Input className={inputClass} disabled={!editMode} value={restaurant.area ?? ""} onChange={(e) => setRestaurant({ ...restaurant, area: e.target.value })} />
          </Field>
          <Field label="Cost For Two">
            <Input className={inputClass} type="number" disabled={!editMode} value={restaurant.cost_for_two ?? ""} onChange={(e) => setRestaurant({ ...restaurant, cost_for_two: e.target.value ? Number(e.target.value) : null })} />
          </Field>
          <Field label="Pure Veg">
            <div className="flex items-center gap-3 h-10">
              <Switch checked={restaurant.is_pure_veg} disabled={!editMode} onCheckedChange={(value) => setRestaurant({ ...restaurant, is_pure_veg: value })} />
              <span className="text-sm text-gray-700">Vegetarian restaurant</span>
            </div>
          </Field>
        </Grid>
        <Field label="Full Address">
          <Textarea className={inputClass} disabled={!editMode} value={restaurant.full_address ?? ""} onChange={(e) => setRestaurant({ ...restaurant, full_address: e.target.value })} />
        </Field>
        <Field label="Description">
          <Textarea className={inputClass} disabled={!editMode} value={restaurant.description ?? ""} onChange={(e) => setRestaurant({ ...restaurant, description: e.target.value })} />
        </Field>
      </Section>

      <Section title="Cuisine & Tags">
        <Grid>
          <Field label="Cuisines">
            <Input className={inputClass} disabled={!editMode} value={restaurant.cuisines.join(", ")} onChange={(e) => setRestaurant({ ...restaurant, cuisines: commaSeparatedToArray(e.target.value) })} />
          </Field>
          <Field label="Mood Tags">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" disabled={!editMode} className="w-full justify-between bg-white border-gray-300">
                  {restaurant.mood_tags.length ? `${restaurant.mood_tags.length} mood tags selected` : "Select mood tags"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={6} className="z-[9999] w-[420px] max-w-[calc(100vw-2rem)] max-h-72 overflow-y-auto rounded-md border border-gray-300 bg-white shadow-xl">
                {allMoodOptions.map((mood) => (
                  <DropdownMenuCheckboxItem
                    key={mood}
                    checked={restaurant.mood_tags.includes(mood)}
                    onCheckedChange={(checked) =>
                      setRestaurant({
                        ...restaurant,
                        mood_tags:
                          checked === true
                            ? restaurant.mood_tags.includes(mood)
                              ? restaurant.mood_tags
                              : [...restaurant.mood_tags, mood]
                            : restaurant.mood_tags.filter((value) => value !== mood),
                      })
                    }
                  >
                    {mood}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </Field>
          <Field label="Latitude">
            <Input className={inputClass} type="number" step="0.000001" disabled={!editMode} value={restaurant.latitude ?? ""} onChange={(e) => setRestaurant({ ...restaurant, latitude: e.target.value ? Number(e.target.value) : null })} />
          </Field>
          <Field label="Longitude">
            <Input className={inputClass} type="number" step="0.000001" disabled={!editMode} value={restaurant.longitude ?? ""} onChange={(e) => setRestaurant({ ...restaurant, longitude: e.target.value ? Number(e.target.value) : null })} />
          </Field>
        </Grid>
      </Section>

      <Section title="Facilities">
        <div className="grid grid-cols-2 gap-3">
          {FACILITY_OPTIONS.map((facility) => {
            const checked = restaurant.facilities.includes(facility);
            return (
              <label key={facility} className="flex gap-2 items-center text-sm">
                <input
                  type="checkbox"
                  disabled={!editMode}
                  checked={checked}
                  onChange={(e) =>
                    setRestaurant({
                      ...restaurant,
                      facilities: e.target.checked
                        ? [...restaurant.facilities, facility]
                        : restaurant.facilities.filter((value) => value !== facility),
                    })
                  }
                />
                {facility}
              </label>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-6">
          <Field label="Highlights">
            <Textarea className={inputClass} disabled={!editMode} value={restaurant.highlights.join(", ")} onChange={(e) => setRestaurant({ ...restaurant, highlights: commaSeparatedToArray(e.target.value) })} />
          </Field>
          <Field label="Worth Visit">
            <Textarea className={inputClass} disabled={!editMode} value={restaurant.worth_visit.join(", ")} onChange={(e) => setRestaurant({ ...restaurant, worth_visit: commaSeparatedToArray(e.target.value) })} />
          </Field>
        </div>
      </Section>

      <Section title="Booking & Reservation">
        <Grid>
          <ToggleField label="Booking Enabled" checked={restaurant.booking_enabled} disabled={!editMode} onCheckedChange={(value) => setRestaurant({ ...restaurant, booking_enabled: value })} />
          <Field label="Avg Duration (minutes)">
            <Input className={inputClass} type="number" disabled={!editMode} value={restaurant.avg_duration_minutes ?? ""} onChange={(e) => setRestaurant({ ...restaurant, avg_duration_minutes: e.target.value ? Number(e.target.value) : null })} />
          </Field>
          <Field label="Max Bookings Per Slot">
            <Input className={inputClass} type="number" disabled={!editMode} value={restaurant.max_bookings_per_slot ?? ""} onChange={(e) => setRestaurant({ ...restaurant, max_bookings_per_slot: e.target.value ? Number(e.target.value) : null })} />
          </Field>
          <Field label="Advance Booking Days">
            <Input className={inputClass} type="number" disabled={!editMode} value={restaurant.advance_booking_days ?? ""} onChange={(e) => setRestaurant({ ...restaurant, advance_booking_days: e.target.value ? Number(e.target.value) : null })} />
          </Field>
          <ToggleField label="Modification Available" checked={restaurant.modification_available} disabled={!editMode} onCheckedChange={(value) => setRestaurant({ ...restaurant, modification_available: value })} />
          <Field label="Modification Cutoff">
            <Input className={inputClass} type="number" disabled={!editMode} value={restaurant.modification_cutoff_minutes ?? ""} onChange={(e) => setRestaurant({ ...restaurant, modification_cutoff_minutes: e.target.value ? Number(e.target.value) : null })} />
          </Field>
          <ToggleField label="Cancellation Available" checked={restaurant.cancellation_available} disabled={!editMode} onCheckedChange={(value) => setRestaurant({ ...restaurant, cancellation_available: value })} />
          <Field label="Cancellation Cutoff">
            <Input className={inputClass} type="number" disabled={!editMode} value={restaurant.cancellation_cutoff_minutes ?? ""} onChange={(e) => setRestaurant({ ...restaurant, cancellation_cutoff_minutes: e.target.value ? Number(e.target.value) : null })} />
          </Field>
          <ToggleField label="Cover Charge Enabled" checked={restaurant.cover_charge_enabled} disabled={!editMode} onCheckedChange={(value) => setRestaurant({ ...restaurant, cover_charge_enabled: value })} />
          <Field label="Cover Charge Amount">
            <Input className={inputClass} type="number" step="0.01" disabled={!editMode} value={restaurant.cover_charge_amount ?? ""} onChange={(e) => setRestaurant({ ...restaurant, cover_charge_amount: e.target.value ? Number(e.target.value) : null })} />
          </Field>
        </Grid>
        <Field label="Booking Terms">
          <Textarea className={inputClass} disabled={!editMode} value={bookingTermsToTextarea(restaurant.booking_terms)} onChange={(e) => setRestaurant({ ...restaurant, booking_terms: bookingTermsToPayload(e.target.value) || [] })} />
        </Field>
      </Section>

      <Section title="Opening Hours">
        {DAY_NAMES.map((day) => (
          <div key={day} className="space-y-3 rounded-md border border-gray-200 p-4 mb-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{day}</span>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" disabled={!editMode} checked={!!openingHours[day]?.closed} onChange={(e) => setOpeningHours((previous) => ({ ...previous, [day]: { ...previous[day], closed: e.target.checked, open: e.target.checked ? "" : previous[day].open, close: e.target.checked ? "" : previous[day].close } }))} />
                Closed
              </label>
            </div>
            {!openingHours[day]?.closed && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select disabled={!editMode} className="border rounded-md px-3 py-2 text-sm bg-white disabled:bg-gray-100" value={openingHours[day]?.open || ""} onChange={(e) => setOpeningHours((previous) => ({ ...previous, [day]: { ...previous[day], open: e.target.value } }))}>
                  <option value="">Open</option>
                  {HOUR_OPTIONS.map((time) => <option key={`${day}-open-${time}`} value={time}>{time}</option>)}
                </select>
                <select disabled={!editMode} className="border rounded-md px-3 py-2 text-sm bg-white disabled:bg-gray-100" value={openingHours[day]?.close || ""} onChange={(e) => setOpeningHours((previous) => ({ ...previous, [day]: { ...previous[day], close: e.target.value } }))}>
                  <option value="">Close</option>
                  {HOUR_OPTIONS.map((time) => <option key={`${day}-close-${time}`} value={time}>{time}</option>)}
                </select>
              </div>
            )}
          </div>
        ))}
      </Section>

      <Section title="Media">
        <EditableImageSection title="Food Images" images={restaurant.food_images.filter((url) => !foodImagesToDelete.includes(url))} files={foodImagesToAdd} setFiles={setFoodImagesToAdd} onDelete={(url) => setFoodImagesToDelete((previous) => [...previous, url])} disabled={!editMode} />
        <EditableImageSection title="Ambience Images" images={restaurant.ambience_images.filter((url) => !ambienceImagesToDelete.includes(url))} files={ambienceImagesToAdd} setFiles={setAmbienceImagesToAdd} onDelete={(url) => setAmbienceImagesToDelete((previous) => [...previous, url])} disabled={!editMode} />
        <EditableImageSection title="Menu Images" images={restaurant.menu.filter((url) => !menuImagesToDelete.includes(url))} files={menuImagesToAdd} setFiles={setMenuImagesToAdd} onDelete={(url) => setMenuImagesToDelete((previous) => [...previous, url])} disabled={!editMode} />
      </Section>

      <Section title="Offers">
        {restaurant.offers.map((offer, index) => (
          <div key={index} className="grid grid-cols-2 gap-4 rounded-md border border-gray-200 p-4 mb-4">
            <Input className={inputClass} disabled={!editMode} placeholder="Title" value={offer.title} onChange={(e) => setRestaurant({ ...restaurant, offers: restaurant.offers.map((entry, entryIndex) => (entryIndex === index ? { ...entry, title: e.target.value } : entry)) })} />
            <Input className={inputClass} disabled={!editMode} placeholder="Badge text" value={offer.badge_text || ""} onChange={(e) => setRestaurant({ ...restaurant, offers: restaurant.offers.map((entry, entryIndex) => (entryIndex === index ? { ...entry, badge_text: e.target.value } : entry)) })} />
            <select className={`${inputClass} rounded-md px-3 py-2`} disabled={!editMode} value={offer.offer_type || ""} onChange={(e) => setRestaurant({ ...restaurant, offers: restaurant.offers.map((entry, entryIndex) => (entryIndex === index ? { ...entry, offer_type: e.target.value } : entry)) })}>
              <option value="">Select offer type</option>
              {OFFER_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Input className={inputClass} disabled={!editMode} type="number" placeholder={offerAmountLabel(offer.offer_type)} value={offer.discount_value ?? ""} onChange={(e) => setRestaurant({ ...restaurant, offers: restaurant.offers.map((entry, entryIndex) => (entryIndex === index ? { ...entry, discount_value: e.target.value ? Number(e.target.value) : null } : entry)) })} />
            <Input className={inputClass} disabled={!editMode} type="number" placeholder="Minimum spend" value={offer.min_spend ?? ""} onChange={(e) => setRestaurant({ ...restaurant, offers: restaurant.offers.map((entry, entryIndex) => (entryIndex === index ? { ...entry, min_spend: e.target.value ? Number(e.target.value) : null } : entry)) })} />
            <ToggleField label="Active" checked={offer.is_active !== false} disabled={!editMode} onCheckedChange={(value) => setRestaurant({ ...restaurant, offers: restaurant.offers.map((entry, entryIndex) => (entryIndex === index ? { ...entry, is_active: value } : entry)) })} />
            <Input className={inputClass} disabled={!editMode} type="datetime-local" value={offer.start_at || ""} onChange={(e) => setRestaurant({ ...restaurant, offers: restaurant.offers.map((entry, entryIndex) => (entryIndex === index ? { ...entry, start_at: e.target.value } : entry)) })} />
            <Input className={inputClass} disabled={!editMode} type="datetime-local" value={offer.end_at || ""} onChange={(e) => setRestaurant({ ...restaurant, offers: restaurant.offers.map((entry, entryIndex) => (entryIndex === index ? { ...entry, end_at: e.target.value } : entry)) })} />
            <Textarea className="col-span-2" disabled={!editMode} placeholder="Description" value={offer.description || ""} onChange={(e) => setRestaurant({ ...restaurant, offers: restaurant.offers.map((entry, entryIndex) => (entryIndex === index ? { ...entry, description: e.target.value } : entry)) })} />
            {editMode && (
              <div className="col-span-2 flex justify-end">
                <Button variant="outline" onClick={() => setRestaurant({ ...restaurant, offers: restaurant.offers.filter((_, entryIndex) => entryIndex !== index) })}>Remove offer</Button>
              </div>
            )}
          </div>
        ))}
        {editMode && (
          <Button variant="outline" onClick={() => setRestaurant({ ...restaurant, offers: [...restaurant.offers, defaultOffer()] })}>Add offer</Button>
        )}
      </Section>

      <Section title="Subscription">
        <Grid>
          <Field label="Plan Code">
            <Input className={inputClass} disabled={!editMode} value={restaurant.subscription?.plan_code || ""} onChange={(e) => setRestaurant({ ...restaurant, subscription: { ...(restaurant.subscription || defaultSubscription()), plan_code: e.target.value } })} />
          </Field>
          <Field label="Status">
            <Input className={inputClass} disabled={!editMode} value={restaurant.subscription?.status || ""} onChange={(e) => setRestaurant({ ...restaurant, subscription: { ...(restaurant.subscription || defaultSubscription()), status: e.target.value } })} />
          </Field>
          <Field label="Starts At">
            <Input className={inputClass} disabled={!editMode} type="datetime-local" value={restaurant.subscription?.starts_at || ""} onChange={(e) => setRestaurant({ ...restaurant, subscription: { ...(restaurant.subscription || defaultSubscription()), starts_at: e.target.value } })} />
          </Field>
          <Field label="Expires At">
            <Input className={inputClass} disabled={!editMode} type="datetime-local" value={restaurant.subscription?.expires_at || ""} onChange={(e) => setRestaurant({ ...restaurant, subscription: { ...(restaurant.subscription || defaultSubscription()), expires_at: e.target.value } })} />
          </Field>
          <ToggleField label="Unlock all" checked={!!restaurant.subscription?.unlock_all} disabled={!editMode} onCheckedChange={(value) => setRestaurant({ ...restaurant, subscription: { ...(restaurant.subscription || defaultSubscription()), unlock_all: value } })} />
          <ToggleField label="Time slot enabled" checked={!!restaurant.subscription?.time_slot_enabled} disabled={!editMode} onCheckedChange={(value) => setRestaurant({ ...restaurant, subscription: { ...(restaurant.subscription || defaultSubscription()), time_slot_enabled: value } })} />
          <ToggleField label="Repeat rewards enabled" checked={!!restaurant.subscription?.repeat_rewards_enabled} disabled={!editMode} onCheckedChange={(value) => setRestaurant({ ...restaurant, subscription: { ...(restaurant.subscription || defaultSubscription()), repeat_rewards_enabled: value } })} />
          <ToggleField label="Dish discounts enabled" checked={!!restaurant.subscription?.dish_discounts_enabled} disabled={!editMode} onCheckedChange={(value) => setRestaurant({ ...restaurant, subscription: { ...(restaurant.subscription || defaultSubscription()), dish_discounts_enabled: value } })} />
        </Grid>
      </Section>

      <Section title="Ratings (Computed from Reviews)">
        <Grid>
          <ReadOnly label="Overall" value={restaurant.rating} />
          <ReadOnly label="Food" value={restaurant.food_rating} />
          <ReadOnly label="Service" value={restaurant.service_rating} />
          <ReadOnly label="Ambience" value={restaurant.ambience_rating} />
          <ReadOnly label="Drinks" value={restaurant.drinks_rating} />
          <ReadOnly label="Crowd" value={restaurant.crowd_rating} />
          <ReadOnly label="Total Ratings" value={restaurant.total_ratings} />
          <ReadOnly label="Subscribed Plan" value={restaurant.subscribed_plan} />
        </Grid>
      </Section>

      <Section title="Reviews (Read Only)">
        <Textarea className={inputClass} readOnly value={restaurant.reviews.length ? JSON.stringify(restaurant.reviews, null, 2) : ""} placeholder="No reviews" />
      </Section>
    </div>
  );
}

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-4">
    <h2 className="text-lg font-semibold">{title}</h2>
    {children}
  </section>
);

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="space-y-1">
    <label className="text-xs text-gray-500 uppercase">{label}</label>
    {children}
  </div>
);

const Grid = ({ children }: { children: ReactNode }) => (
  <div className="grid grid-cols-2 gap-6">{children}</div>
);

const ReadOnly = ({ label, value }: { label: string; value: unknown }) => (
  <div>
    <label className="text-xs text-gray-500 uppercase">{label}</label>
    <div className="text-sm font-medium">{value ?? "-"}</div>
  </div>
);

function ToggleField({
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function EditableImageSection({
  title,
  images,
  files,
  setFiles,
  onDelete,
  disabled,
}: {
  title: string;
  images: string[];
  files: File[];
  setFiles: Dispatch<SetStateAction<File[]>>;
  onDelete: (url: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="grid grid-cols-4 gap-3">
        {images.length ? (
          images.map((src, index) => (
            <div key={`${src}-${index}`} className="relative h-32 rounded-md overflow-hidden border">
              <img src={src} className="w-full h-full object-cover" alt={`${title} ${index + 1}`} />
              {!disabled && (
                <button type="button" onClick={() => onDelete(src)} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black">
                  <X size={14} />
                </button>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-400">No images</p>
        )}
      </div>
      {!disabled && (
        <>
          <Input type="file" multiple accept="image/*" onChange={(e) => setFiles((previous) => [...previous, ...Array.from(e.target.files || [])])} />
          <div className="grid grid-cols-4 gap-3 mt-3">
            {files.map((file, index) => (
              <div key={`${file.name}-${index}`} className="relative h-32 rounded-md overflow-hidden border border-gray-300">
                <img src={URL.createObjectURL(file)} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                <button type="button" onClick={() => setFiles((previous) => previous.filter((_, fileIndex) => fileIndex !== index))} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

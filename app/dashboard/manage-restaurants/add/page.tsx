"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, X } from "lucide-react";

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
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";
import {
  DAY_NAMES,
  DayHours,
  RestaurantOfferInput,
  RestaurantSubscriptionInput,
  buildRestaurantInsertPayload,
  replaceRestaurantRelations,
  uploadRestaurantImages,
} from "@/lib/restaurantAdmin";

const inputClass = "border border-gray-300 focus:border-gray-400 focus:ring-0";
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, "0")}:00`);
const PARTNER_ROLE = "restaurantpartner" as const;
const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

type MoodCategoryRecord = { title?: string };

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function buildUniqueRestaurantSlug(baseValue: string) {
  const normalizedBase = slugify(baseValue) || `restaurant-${Date.now()}`;

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? normalizedBase : `${normalizedBase}-${attempt + 1}`;
    const { data, error } = await supabaseBrowser
      .from("restaurants")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) throw error;
    if (!data) return candidate;
  }

  return `${normalizedBase}-${Date.now()}`;
}

function extractCategoryList(payload: unknown): MoodCategoryRecord[] {
  if (Array.isArray(payload)) return payload as MoodCategoryRecord[];

  const recordPayload =
    payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;

  if (!recordPayload) return [];

  const possibleKeys = ["data", "items", "results", "categories", "moodCategories"];
  for (const key of possibleKeys) {
    if (Array.isArray(recordPayload[key])) return recordPayload[key] as MoodCategoryRecord[];
  }

  return [];
}

function bookingTermsToPayload(value: string): string[] {
  const normalized = value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

  return normalized;
}

function commaSeparatedToArray(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function emptyOpeningHours() {
  return DAY_NAMES.reduce<Record<string, DayHours>>((accumulator, day) => {
    accumulator[day] = { open: "", close: "", closed: false };
    return accumulator;
  }, {});
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

async function getAccessToken() {
  const { data, error } = await supabaseBrowser.auth.getSession();
  console.log("[AddRestaurant] getAccessToken session", {
    hasSession: !!data.session,
    userId: data.session?.user?.id,
    email: data.session?.user?.email,
    expiresAt: data.session?.expires_at,
    hasAccessToken: !!data.session?.access_token,
  });
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error("Not logged in. Please login as admin/superadmin.");
  return token;
}

export default function AddRestaurantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [moodCategoryOptions, setMoodCategoryOptions] = useState<string[]>([]);
  const [selectedMoodTags, setSelectedMoodTags] = useState<string[]>([]);
  const [foodImages, setFoodImages] = useState<File[]>([]);
  const [ambienceImages, setAmbienceImages] = useState<File[]>([]);
  const [menuImages, setMenuImages] = useState<File[]>([]);
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerPassword, setPartnerPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [offers, setOffers] = useState<RestaurantOfferInput[]>([]);
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(false);
  const [subscription, setSubscription] = useState<RestaurantSubscriptionInput>(defaultSubscription());

  const [form, setForm] = useState({
    name: "",
    phone: "",
    city: "",
    area: "",
    full_address: "",
    description: "",
    cuisines: "",
    cost_for_two: "",
    facilities: "",
    highlights: "",
    worth_visit: "",
    latitude: "",
    longitude: "",
    is_pure_veg: false,
    booking_enabled: true,
    avg_duration_minutes: "90",
    max_bookings_per_slot: "",
    advance_booking_days: "30",
    booking_terms: "",
    modification_available: false,
    modification_cutoff_minutes: "",
    cancellation_available: false,
    cancellation_cutoff_minutes: "",
    cover_charge_enabled: false,
    cover_charge_amount: "",
    is_advertised: false,
    ad_priority: "",
    ad_badge_text: "",
    ad_starts_at: "",
    ad_ends_at: "",
  });

  const [openingHours, setOpeningHours] = useState<Record<string, DayHours>>(emptyOpeningHours());

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((previous) => ({ ...previous, [e.target.name]: e.target.value }));

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
        // Keep form usable if mood categories fail.
      }
    };

    void loadMoodCategories();
  }, []);

  const createPartnerViaBackend = async ({
    email,
    password,
    full_name,
    phone,
    role,
  }: {
    email: string;
    password: string;
    full_name?: string;
    phone?: string;
    role: string;
  }) => {
    const token = await getAccessToken();
    const requestPayload = { email, password, full_name, phone, role };

    console.log("[AddRestaurant] createPartnerViaBackend request", {
      url: `${API_BASE}/api/auth/create-user`,
      payload: {
        ...requestPayload,
        password: password ? `[masked:${password.length}]` : "",
      },
      tokenPreview: token ? `${token.slice(0, 16)}...` : null,
    });

    const res = await fetch(`${API_BASE}/api/auth/create-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestPayload),
    });

    const json = await res.json().catch(() => null);
    console.log("[AddRestaurant] createPartnerViaBackend response", {
      status: res.status,
      ok: res.ok,
      body: json,
    });

    if (!res.ok) throw new Error(json?.error || "Failed to create partner user");
    return json.user as { id: string; email: string; role: string };
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      showToast({ type: "error", title: "Restaurant name is required" });
      return;
    }
    if (!partnerEmail || !partnerPassword) {
      showToast({ type: "error", title: "Partner Email & Password are required" });
      return;
    }
    if (partnerPassword.length < 6) {
      showToast({ type: "error", title: "Password must be at least 6 characters" });
      return;
    }

    setLoading(true);
    let createdRestaurantId: string | null = null;

    try {
      console.log("[AddRestaurant] handleSubmit start", {
        form: {
          ...form,
          partnerEmail,
          partnerPassword: partnerPassword ? `[masked:${partnerPassword.length}]` : "",
          selectedMoodTags,
          foodImages: foodImages.map((file) => file.name),
          ambienceImages: ambienceImages.map((file) => file.name),
          menuImages: menuImages.map((file) => file.name),
          offersCount: offers.length,
          subscriptionEnabled,
        },
      });

      const partner = await createPartnerViaBackend({
        email: partnerEmail.trim(),
        password: partnerPassword,
        full_name: form.name.trim(),
        phone: form.phone || undefined,
        role: PARTNER_ROLE,
      });

      const slug = await buildUniqueRestaurantSlug(
        `${form.name} ${form.area} ${form.city}`.trim() || form.name
      );
      const basePayload = buildRestaurantInsertPayload({
        name: form.name.trim(),
        phone: form.phone || undefined,
        city: form.city || undefined,
        area: form.area || undefined,
        full_address: form.full_address || undefined,
        description: form.description || undefined,
        slug,
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
        cost_for_two: form.cost_for_two ? Number(form.cost_for_two) : undefined,
        is_active: true,
        owner_user_id: partner.id,
        is_pure_veg: form.is_pure_veg,
        booking_enabled: form.booking_enabled,
        avg_duration_minutes: form.avg_duration_minutes ? Number(form.avg_duration_minutes) : 90,
        max_bookings_per_slot: form.max_bookings_per_slot ? Number(form.max_bookings_per_slot) : undefined,
        advance_booking_days: form.advance_booking_days ? Number(form.advance_booking_days) : 30,
        booking_terms: bookingTermsToPayload(form.booking_terms),
        modification_available: form.modification_available,
        modification_cutoff_minutes:
          form.modification_available && form.modification_cutoff_minutes
            ? Number(form.modification_cutoff_minutes)
            : undefined,
        cancellation_available: form.cancellation_available,
        cancellation_cutoff_minutes:
          form.cancellation_available && form.cancellation_cutoff_minutes
            ? Number(form.cancellation_cutoff_minutes)
            : undefined,
        cover_charge_enabled: form.cover_charge_enabled,
        cover_charge_amount:
          form.cover_charge_enabled && form.cover_charge_amount
            ? Number(form.cover_charge_amount)
            : undefined,
        is_advertised: form.is_advertised,
        ad_priority: form.ad_priority ? Number(form.ad_priority) : undefined,
        ad_badge_text: form.ad_badge_text || undefined,
        ad_starts_at: form.ad_starts_at || undefined,
        ad_ends_at: form.ad_ends_at || undefined,
      });

      console.log("[AddRestaurant] restaurant insert payload", basePayload);

      const { data: restaurant, error: restaurantError } = await supabaseBrowser
        .from("restaurants")
        .insert(basePayload)
        .select("*")
        .single();

      if (restaurantError || !restaurant?.id) {
        throw restaurantError || new Error("Failed to create restaurant");
      }

      createdRestaurantId = restaurant.id;

      const [foodUrls, ambienceUrls, menuUrls] = await Promise.all([
        uploadRestaurantImages(restaurant.id, foodImages, "food"),
        uploadRestaurantImages(restaurant.id, ambienceImages, "ambience"),
        uploadRestaurantImages(restaurant.id, menuImages, "menu"),
      ]);

      const coverImage = foodUrls[0] || ambienceUrls[0] || menuUrls[0] || null;

      const { error: coverError } = await supabaseBrowser
        .from("restaurants")
        .update({ cover_image: coverImage })
        .eq("id", restaurant.id);

      if (coverError) throw coverError;

      await replaceRestaurantRelations(restaurant.id, {
        cuisines: commaSeparatedToArray(form.cuisines),
        facilities: commaSeparatedToArray(form.facilities),
        highlights: commaSeparatedToArray(form.highlights),
        worth_visit: commaSeparatedToArray(form.worth_visit),
        mood_tags: selectedMoodTags,
        food_images: foodUrls,
        ambience_images: ambienceUrls,
        menu: menuUrls,
        opening_hours: openingHours,
        offers,
        subscription: subscriptionEnabled ? subscription : null,
      });

      showToast({
        type: "success",
        title: "Restaurant added successfully",
        description: "Partner account created and normalized restaurant data saved.",
      });

      router.push("/dashboard/manage-restaurants");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      console.error("[AddRestaurant] handleSubmit error", err);
      if (createdRestaurantId) {
        const { error: cleanupError } = await supabaseBrowser
          .from("restaurants")
          .delete()
          .eq("id", createdRestaurantId);

        if (cleanupError) {
          console.error("[AddRestaurant] restaurant cleanup error", cleanupError);
        }
      }

      showToast({
        type: "error",
        title: "Failed to add restaurant",
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <section className="space-y-4 border-b pb-8">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">Basic Information</h2>
        <Input className={inputClass} name="name" placeholder="Restaurant name" onChange={handleChange} />
        <Input className={inputClass} name="phone" placeholder="Phone number" onChange={handleChange} />
        <div className="grid grid-cols-2 gap-4">
          <Input className={inputClass} name="city" placeholder="City" onChange={handleChange} />
          <Input className={inputClass} name="area" placeholder="Area" onChange={handleChange} />
        </div>
        <Textarea className={inputClass} name="full_address" placeholder="Full address" onChange={handleChange} />
        <Textarea className={inputClass} name="description" placeholder="Description" onChange={handleChange} />
      </section>

      <section className="space-y-4 border-b py-8">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">Restaurant Partner Login</h2>
        <Input type="email" className={inputClass} placeholder="Partner Email (login)" value={partnerEmail} onChange={(e) => setPartnerEmail(e.target.value)} />
        <div className="space-y-1 relative">
          <label className="text-sm font-medium">Partner Password</label>
          <div className="relative">
            <Input type={showPassword ? "text" : "password"} value={partnerPassword} onChange={(e) => setPartnerPassword(e.target.value)} className="pr-10" placeholder="Partner Password" />
            <span className="absolute inset-y-0 right-3 flex items-center cursor-pointer text-gray-400" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-4 border-b py-8">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">Cuisine, Tags & Location</h2>
        <Input className={inputClass} name="cuisines" placeholder="Cuisines (comma separated)" onChange={handleChange} />
        <div>
          <label className="text-sm font-medium">Mood Tags</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" className="w-full mt-1 justify-between bg-white border-gray-300">
                {selectedMoodTags.length ? `${selectedMoodTags.length} mood tags selected` : "Select mood tags"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={6} className="z-[9999] w-[420px] max-w-[calc(100vw-2rem)] max-h-72 overflow-y-auto rounded-md border border-gray-300 bg-white shadow-xl">
              {moodCategoryOptions.length ? (
                moodCategoryOptions.map((mood) => (
                  <DropdownMenuCheckboxItem
                    key={mood}
                    checked={selectedMoodTags.includes(mood)}
                    onCheckedChange={(checked) =>
                      setSelectedMoodTags((previous) =>
                        checked === true
                          ? previous.includes(mood)
                            ? previous
                            : [...previous, mood]
                          : previous.filter((value) => value !== mood)
                      )
                    }
                  >
                    {mood}
                  </DropdownMenuCheckboxItem>
                ))
              ) : (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">No mood categories found</div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input type="number" className={inputClass} name="cost_for_two" placeholder="Cost for two" onChange={handleChange} />
          <div className="flex items-center gap-3 pt-1">
            <Switch checked={form.is_pure_veg} onCheckedChange={(value) => setForm((previous) => ({ ...previous, is_pure_veg: value }))} />
            <span className="text-sm">Pure Veg</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input type="number" step="0.000001" className={inputClass} name="latitude" placeholder="Latitude" onChange={handleChange} />
          <Input type="number" step="0.000001" className={inputClass} name="longitude" placeholder="Longitude" onChange={handleChange} />
        </div>
      </section>

      <section className="space-y-4 border-b py-8">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">Images</h2>
        <ImagePicker title="Food Images" files={foodImages} setFiles={setFoodImages} />
        <ImagePicker title="Ambience Images" files={ambienceImages} setFiles={setAmbienceImages} />
        <ImagePicker title="Menu Images" files={menuImages} setFiles={setMenuImages} />
      </section>

      <section className="space-y-4 border-b py-8">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">Booking, Policies & Cover Charge</h2>
        <div className="grid grid-cols-2 gap-4">
          <ToggleField label="Booking Enabled" checked={form.booking_enabled} onCheckedChange={(value) => setForm((previous) => ({ ...previous, booking_enabled: value }))} />
          <Input type="number" className={inputClass} name="avg_duration_minutes" placeholder="Avg Duration (minutes)" value={form.avg_duration_minutes} onChange={handleChange} />
          <Input type="number" className={inputClass} name="max_bookings_per_slot" placeholder="Max bookings per slot" value={form.max_bookings_per_slot} onChange={handleChange} />
          <Input type="number" className={inputClass} name="advance_booking_days" placeholder="Advance booking days" value={form.advance_booking_days} onChange={handleChange} />
        </div>
        <Textarea className={inputClass} name="booking_terms" placeholder="Booking terms" value={form.booking_terms} onChange={handleChange} />
        <div className="grid grid-cols-2 gap-4">
          <ToggleField label="Modification Available" checked={form.modification_available} onCheckedChange={(value) => setForm((previous) => ({ ...previous, modification_available: value }))} />
          <Input type="number" className={inputClass} name="modification_cutoff_minutes" placeholder="Modification cutoff (minutes)" value={form.modification_cutoff_minutes} onChange={handleChange} />
          <ToggleField label="Cancellation Available" checked={form.cancellation_available} onCheckedChange={(value) => setForm((previous) => ({ ...previous, cancellation_available: value }))} />
          <Input type="number" className={inputClass} name="cancellation_cutoff_minutes" placeholder="Cancellation cutoff (minutes)" value={form.cancellation_cutoff_minutes} onChange={handleChange} />
          <ToggleField label="Cover Charge Enabled" checked={form.cover_charge_enabled} onCheckedChange={(value) => setForm((previous) => ({ ...previous, cover_charge_enabled: value }))} />
          <Input type="number" step="0.01" className={inputClass} name="cover_charge_amount" placeholder="Cover charge amount" value={form.cover_charge_amount} onChange={handleChange} />
        </div>
      </section>

      <section className="space-y-4 border-b py-8">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">Features</h2>
        <Textarea className={inputClass} name="facilities" placeholder="Facilities (comma separated)" onChange={handleChange} />
        <Textarea className={inputClass} name="highlights" placeholder="Highlights (comma separated)" onChange={handleChange} />
        <Textarea className={inputClass} name="worth_visit" placeholder="Why worth visiting" onChange={handleChange} />
      </section>

      <section className="space-y-4 border-b py-8">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">Offers</h2>
        {offers.map((offer, index) => (
          <div key={index} className="grid grid-cols-2 gap-4 rounded-md border border-gray-200 p-4">
            <Input className={inputClass} placeholder="Title" value={offer.title} onChange={(e) => setOffers((previous) => previous.map((entry, entryIndex) => (entryIndex === index ? { ...entry, title: e.target.value } : entry)))} />
            <Input className={inputClass} placeholder="Badge text" value={offer.badge_text || ""} onChange={(e) => setOffers((previous) => previous.map((entry, entryIndex) => (entryIndex === index ? { ...entry, badge_text: e.target.value } : entry)))} />
            <Input className={inputClass} placeholder="Offer type" value={offer.offer_type || ""} onChange={(e) => setOffers((previous) => previous.map((entry, entryIndex) => (entryIndex === index ? { ...entry, offer_type: e.target.value } : entry)))} />
            <Input type="number" className={inputClass} placeholder="Discount value" value={offer.discount_value ?? ""} onChange={(e) => setOffers((previous) => previous.map((entry, entryIndex) => (entryIndex === index ? { ...entry, discount_value: e.target.value ? Number(e.target.value) : null } : entry)))} />
            <Input type="number" className={inputClass} placeholder="Minimum spend" value={offer.min_spend ?? ""} onChange={(e) => setOffers((previous) => previous.map((entry, entryIndex) => (entryIndex === index ? { ...entry, min_spend: e.target.value ? Number(e.target.value) : null } : entry)))} />
            <ToggleField label="Active" checked={offer.is_active !== false} onCheckedChange={(value) => setOffers((previous) => previous.map((entry, entryIndex) => (entryIndex === index ? { ...entry, is_active: value } : entry)))} />
            <Input type="datetime-local" className={inputClass} value={offer.start_at || ""} onChange={(e) => setOffers((previous) => previous.map((entry, entryIndex) => (entryIndex === index ? { ...entry, start_at: e.target.value } : entry)))} />
            <Input type="datetime-local" className={inputClass} value={offer.end_at || ""} onChange={(e) => setOffers((previous) => previous.map((entry, entryIndex) => (entryIndex === index ? { ...entry, end_at: e.target.value } : entry)))} />
            <Textarea className="col-span-2" placeholder="Description" value={offer.description || ""} onChange={(e) => setOffers((previous) => previous.map((entry, entryIndex) => (entryIndex === index ? { ...entry, description: e.target.value } : entry)))} />
            <div className="col-span-2 flex justify-end">
              <Button variant="outline" onClick={() => setOffers((previous) => previous.filter((_, entryIndex) => entryIndex !== index))}>Remove offer</Button>
            </div>
          </div>
        ))}
        <Button variant="outline" onClick={() => setOffers((previous) => [...previous, defaultOffer()])}>Add offer</Button>
      </section>

      <section className="space-y-4 border-b py-8">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">Subscription</h2>
        <ToggleField label="Enable subscription" checked={subscriptionEnabled} onCheckedChange={setSubscriptionEnabled} />
        {subscriptionEnabled && (
          <div className="grid grid-cols-2 gap-4">
            <Input className={inputClass} placeholder="Plan code" value={subscription.plan_code || ""} onChange={(e) => setSubscription((previous) => ({ ...previous, plan_code: e.target.value }))} />
            <Input className={inputClass} placeholder="Status" value={subscription.status || ""} onChange={(e) => setSubscription((previous) => ({ ...previous, status: e.target.value }))} />
            <Input type="datetime-local" className={inputClass} value={subscription.starts_at || ""} onChange={(e) => setSubscription((previous) => ({ ...previous, starts_at: e.target.value }))} />
            <Input type="datetime-local" className={inputClass} value={subscription.expires_at || ""} onChange={(e) => setSubscription((previous) => ({ ...previous, expires_at: e.target.value }))} />
            <ToggleField label="Unlock all" checked={!!subscription.unlock_all} onCheckedChange={(value) => setSubscription((previous) => ({ ...previous, unlock_all: value }))} />
            <ToggleField label="Time slot enabled" checked={!!subscription.time_slot_enabled} onCheckedChange={(value) => setSubscription((previous) => ({ ...previous, time_slot_enabled: value }))} />
            <ToggleField label="Repeat rewards enabled" checked={!!subscription.repeat_rewards_enabled} onCheckedChange={(value) => setSubscription((previous) => ({ ...previous, repeat_rewards_enabled: value }))} />
            <ToggleField label="Dish discounts enabled" checked={!!subscription.dish_discounts_enabled} onCheckedChange={(value) => setSubscription((previous) => ({ ...previous, dish_discounts_enabled: value }))} />
          </div>
        )}
      </section>

      <section className="space-y-4 border-b py-8">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">Advertising</h2>
        <div className="grid grid-cols-2 gap-4">
          <ToggleField label="Advertised" checked={form.is_advertised} onCheckedChange={(value) => setForm((previous) => ({ ...previous, is_advertised: value }))} />
          <Input type="number" className={inputClass} name="ad_priority" placeholder="Ad priority" value={form.ad_priority} onChange={handleChange} />
          <Input className={inputClass} name="ad_badge_text" placeholder="Ad badge text" value={form.ad_badge_text} onChange={handleChange} />
          <Input type="datetime-local" className={inputClass} name="ad_starts_at" value={form.ad_starts_at} onChange={handleChange} />
          <Input type="datetime-local" className={inputClass} name="ad_ends_at" value={form.ad_ends_at} onChange={handleChange} />
        </div>
      </section>

      <section className="space-y-4 py-8">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">Opening Hours</h2>
        {DAY_NAMES.map((day) => (
          <div key={day} className="space-y-3 rounded-md border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{day}</span>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={openingHours[day].closed}
                  onChange={(e) =>
                    setOpeningHours((previous) => ({
                      ...previous,
                      [day]: {
                        ...previous[day],
                        closed: e.target.checked,
                        open: e.target.checked ? "" : previous[day].open,
                        close: e.target.checked ? "" : previous[day].close,
                      },
                    }))
                  }
                />
                Closed
              </label>
            </div>
            {!openingHours[day].closed && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select className="border rounded-md px-3 py-2 text-sm bg-white" value={openingHours[day].open || ""} onChange={(e) => setOpeningHours((previous) => ({ ...previous, [day]: { ...previous[day], open: e.target.value } }))}>
                  <option value="">Open</option>
                  {HOUR_OPTIONS.map((time) => <option key={`${day}-open-${time}`} value={time}>{time}</option>)}
                </select>
                <select className="border rounded-md px-3 py-2 text-sm bg-white" value={openingHours[day].close || ""} onChange={(e) => setOpeningHours((previous) => ({ ...previous, [day]: { ...previous[day], close: e.target.value } }))}>
                  <option value="">Close</option>
                  {HOUR_OPTIONS.map((time) => <option key={`${day}-close-${time}`} value={time}>{time}</option>)}
                </select>
              </div>
            )}
          </div>
        ))}
      </section>

      <div className="flex justify-end gap-3 pt-6">
        <Button variant="outline" onClick={() => router.back()} disabled={loading}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={loading} className="bg-[#DA3224] hover:bg-[#c92b20] text-white">
          {loading ? "Saving..." : "Save Restaurant"}
        </Button>
      </div>
    </div>
  );
}

function ToggleField({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function ImagePreviewGrid({
  files,
  onRemove,
}: {
  files: File[];
  onRemove: (index: number) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-3 mt-3">
      {files.map((file, index) => (
        <div key={`${file.name}-${index}`} className="relative h-20 rounded-md overflow-hidden border border-gray-200">
          <img src={URL.createObjectURL(file)} alt="preview" className="h-full w-full object-cover" />
          <button type="button" onClick={() => onRemove(index)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black">
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

function ImagePicker({
  title,
  files,
  setFiles,
}: {
  title: string;
  files: File[];
  setFiles: Dispatch<SetStateAction<File[]>>;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-900">{title}</p>
      <Input className={inputClass} type="file" multiple accept="image/*" onChange={(e) => setFiles((previous) => [...previous, ...Array.from(e.target.files || [])])} />
      <ImagePreviewGrid files={files} onRemove={(index) => setFiles((previous) => previous.filter((_, fileIndex) => fileIndex !== index))} />
    </div>
  );
}

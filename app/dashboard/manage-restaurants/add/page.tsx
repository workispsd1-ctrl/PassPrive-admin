"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { X, Eye, EyeOff } from "lucide-react";

const inputClass = "border border-gray-300 focus:border-gray-400 focus:ring-0";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const HOUR_OPTIONS = Array.from(
  { length: 24 },
  (_, hour) => `${String(hour).padStart(2, "0")}:00`
);

type DayHours = { open: string; close: string; closed: boolean };
type MoodCategoryRecord = { title?: string };

const PARTNER_ROLE = "restaurantpartner" as const;

// ✅ change this if you deploy backend
const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

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

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
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

async function getAccessToken() {
  const { data, error } = await supabaseBrowser.auth.getSession();
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

  // partner credentials
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerPassword, setPartnerPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    city: "",
    area: "",
    full_address: "",
    cuisines: "",
    cost_for_two: "",
    distance: "",
    offer: "",
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
  });

  const [openingHours, setOpeningHours] = useState<Record<string, DayHours>>(
    DAYS.reduce((acc, day) => {
      acc[day] = { open: "", close: "", closed: false };
      return acc;
    }, {} as Record<string, DayHours>)
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm({ ...form, [e.target.name]: e.target.value });

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
        // keep form functional even when mood categories cannot be loaded
      }
    };

    void loadMoodCategories();
  }, []);

  /* ---------------------------------------------
     IMAGE UPLOAD (still direct to storage)
  --------------------------------------------- */
  const uploadImages = async (
    restaurantId: string,
    files: File[],
    type: "food" | "ambience"
  ) => {
    const urls: string[] = [];

    for (const file of files) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${type}/${restaurantId}/${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}.${ext}`;

      const { error } = await supabaseBrowser.storage
        .from("restaurants")
        .upload(path, file);

      if (error) throw error;

      const { data } = supabaseBrowser.storage
        .from("restaurants")
        .getPublicUrl(path);

      urls.push(data.publicUrl);
    }

    return urls;
  };

  /* ---------------------------------------------
     BACKEND: CREATE PARTNER USER (auth.ts does auth + users insert)
  --------------------------------------------- */
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

    const res = await fetch(`${API_BASE}/api/auth/create-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email, password, full_name, phone, role }),
    });

    const json = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        throw new Error("Unauthorized. Please login again as admin/superadmin.");
      }
      if (res.status === 403) {
        throw new Error(
          "Access denied. Current account is not admin/superadmin. Please login with an admin account."
        );
      }
      throw new Error(json?.error || "Failed to create partner user");
    }

    return json.user as { id: string; email: string; role: string };
  };

  /* ---------------------------------------------
     BACKEND: CREATE RESTAURANT
  --------------------------------------------- */
  const createRestaurantViaBackend = async (payload: any) => {
    const token = await getAccessToken();

    const res = await fetch(`${API_BASE}/api/restaurants`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // ✅ required (admin-only create)
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Failed to create restaurant");

    // backend returns { restaurant }
    return json.restaurant as { id: string };
  };

  /* ---------------------------------------------
     BACKEND: UPDATE RESTAURANT (images, etc.)
  --------------------------------------------- */
  const updateRestaurantViaBackend = async (id: string, patch: any) => {
    const token = await getAccessToken();

    const res = await fetch(`${API_BASE}/api/restaurants/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // ✅ required (admin or owner partner)
      },
      body: JSON.stringify(patch),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Failed to update restaurant");

    return json.item;
  };

  /* ---------------------------------------------
     SUBMIT
  --------------------------------------------- */
  const handleSubmit = async () => {
    if (!form.name) {
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
      // opening_hours jsonb - include all days for consistent backend validation
      const formattedOpeningHours: Record<string, { open: string; close: string; closed: boolean }> = {};
      const DAYS_LOCAL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      DAYS_LOCAL.forEach((day) => {
        const dayData = (openingHours as any)[day] || { open: "", close: "", closed: false };
        const isClosed = dayData.closed || (!dayData.open && !dayData.close);

        formattedOpeningHours[day.toLowerCase()] = {
          open: dayData.open || "",
          close: dayData.close || "",
          closed: isClosed,
        };
      });

      // slug
      const baseSlug = slugify(`${form.name} ${form.area || ""} ${form.city || ""}`);
      const slug = baseSlug || slugify(form.name);

      // 1) Create partner first (auth.ts handles auth + users table)
      const partner = await createPartnerViaBackend({
        email: partnerEmail,
        password: partnerPassword,
        full_name: form.name,
        phone: form.phone || undefined,
        role: PARTNER_ROLE,
      });

      // 2) Create restaurant via backend (admin-only)
      const restaurant = await createRestaurantViaBackend({
        name: form.name,
        phone: form.phone || null,
        city: form.city || null,
        area: form.area || null,
        full_address: form.full_address || null,

        cuisines: form.cuisines ? form.cuisines.split(",").map((v) => v.trim()) : [],
        cost_for_two: form.cost_for_two ? Number(form.cost_for_two) : null,
        distance: form.distance ? Number(form.distance) : null,
        offer: offerToPayload(form.offer),

        facilities: form.facilities ? form.facilities.split(",").map((v) => v.trim()) : [],
        highlights: form.highlights ? form.highlights.split(",").map((v) => v.trim()) : [],
        worth_visit: form.worth_visit ? form.worth_visit.split(",").map((v) => v.trim()) : [],
        mood_tags: selectedMoodTags,
        is_pure_veg: !!form.is_pure_veg,

        opening_hours: formattedOpeningHours,
        reviews: [],
        menu: [],

        food_images: [],
        ambience_images: [],
        cover_image: null,

        is_active: true,

        slug,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        booking_enabled: Boolean(form.booking_enabled),
        avg_duration_minutes: form.avg_duration_minutes ? Number(form.avg_duration_minutes) : 90,
        max_bookings_per_slot: form.max_bookings_per_slot ? Number(form.max_bookings_per_slot) : null,
        advance_booking_days: form.advance_booking_days ? Number(form.advance_booking_days) : 30,

        owner_user_id: partner.id, // ✅ link owner at creation
      });

      createdRestaurantId = restaurant.id;

      // 3) Upload images to storage
      const foodUrls = await uploadImages(restaurant.id, foodImages, "food");
      const ambienceUrls = await uploadImages(restaurant.id, ambienceImages, "ambience");
      const coverImage = foodUrls[0] || ambienceUrls[0] || null;

      // 4) Update restaurant images via backend
      await updateRestaurantViaBackend(restaurant.id, {
        food_images: foodUrls,
        ambience_images: ambienceUrls,
        cover_image: coverImage,
      });

      showToast({
        type: "success",
        title: "Restaurant added successfully",
        description: "Partner account created and linked successfully.",
      });

      router.push("/dashboard/manage-restaurants");
    } catch (err: any) {
      console.error(err);

      // Optional cleanup: if restaurant created but later failed
      // (this will work only if current token has delete permissions)
      if (createdRestaurantId) {
        try {
          const token = await getAccessToken();
          await fetch(`${API_BASE}/api/restaurants/${createdRestaurantId}?hard=true`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch {}
      }

      showToast({
        type: "error",
        title: "Failed to add restaurant",
        description: err?.message || "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------
     IMAGE TILE COMPONENT
  --------------------------------------------- */
  const ImagePreviewGrid = ({
    files,
    onRemove,
  }: {
    files: File[];
    onRemove: (index: number) => void;
  }) => (
    <div className="grid grid-cols-5 gap-3 mt-3">
      {files.map((file, index) => (
        <div
          key={index}
          className="relative h-20 rounded-md overflow-hidden border border-gray-200"
        >
          <img
            src={URL.createObjectURL(file)}
            alt="preview"
            className="h-full w-full object-cover"
          />
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* BASIC INFO */}
      <section className="space-y-4 border-b pb-8">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">
          Basic Information
        </h2>

        <Input className={inputClass} name="name" placeholder="Restaurant name" onChange={handleChange} />
        <Input className={inputClass} name="phone" placeholder="Phone number" onChange={handleChange} />

        <div className="grid grid-cols-2 gap-4">
          <Input className={inputClass} name="city" placeholder="City" onChange={handleChange} />
          <Input className={inputClass} name="area" placeholder="Area" onChange={handleChange} />
        </div>

        <Textarea className={inputClass} name="full_address" placeholder="Full address" onChange={handleChange} />
      </section>

      {/* PARTNER AUTH CREDENTIALS */}
      <section className="space-y-4 border-b py-8">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">
          Restaurant Partner Login
        </h2>

        <Input
          className={inputClass}
          type="email"
          placeholder="Partner Email (login)"
          value={partnerEmail}
          onChange={(e) => setPartnerEmail(e.target.value)}
        />

        <div className="space-y-1 relative">
          <label className="text-sm font-medium">Partner Password</label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={partnerPassword}
              onChange={(e) => setPartnerPassword(e.target.value)}
              required
              className="pr-10"
              placeholder="Partner Password"
            />
            <span
              className="absolute inset-y-0 right-3 flex items-center cursor-pointer text-gray-400"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </span>
          </div>
        </div>
      </section>

      {/* CUISINE */}
      <section className="space-y-4 border-b py-8">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">
          Cuisine & Cost
        </h2>

        <Input className={inputClass} name="cuisines" placeholder="Cuisines (comma separated)" onChange={handleChange} />

        <div>
          <label className="text-sm font-medium">Mood Tags</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full mt-1 justify-between bg-white border-gray-300"
              >
                {selectedMoodTags.length
                  ? `${selectedMoodTags.length} mood tag${selectedMoodTags.length > 1 ? "s" : ""} selected`
                  : "Select mood tags"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              sideOffset={6}
              className="z-[9999] w-[420px] max-w-[calc(100vw-2rem)] max-h-72 overflow-y-auto rounded-md border border-gray-300 bg-white shadow-xl"
            >
              {moodCategoryOptions.length ? (
                moodCategoryOptions.map((mood) => (
                  <DropdownMenuCheckboxItem
                    key={mood}
                    checked={selectedMoodTags.includes(mood)}
                    onCheckedChange={(checked) => {
                      setSelectedMoodTags((prev) => {
                        if (checked === true) {
                          return prev.includes(mood) ? prev : [...prev, mood];
                        }
                        return prev.filter((item) => item !== mood);
                      });
                    }}
                  >
                    {mood}
                  </DropdownMenuCheckboxItem>
                ))
              ) : (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  No mood categories found
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {selectedMoodTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedMoodTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full border border-gray-300 bg-white px-2 py-1 text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Pick one or more mood categories.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input 
            type="number" 
            className={inputClass} 
            name="cost_for_two" 
            placeholder="Cost for two" 
            onChange={handleChange} 
          />
          <Input 
            type="number" 
            step="0.1"
            className={inputClass} 
            name="distance" 
            placeholder="Distance (km)" 
            onChange={handleChange} 
          />
          <Input className={inputClass} name="offer" placeholder="Offer (optional)" onChange={handleChange} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input 
            type="number" 
            step="0.000001"
            className={inputClass} 
            name="latitude" 
            placeholder="Latitude" 
            onChange={handleChange} 
          />
          <Input 
            type="number" 
            step="0.000001"
            className={inputClass} 
            name="longitude" 
            placeholder="Longitude" 
            onChange={handleChange} 
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Switch
            checked={!!form.is_pure_veg}
            onCheckedChange={(value) => setForm((prev) => ({ ...prev, is_pure_veg: value }))}
          />
          <span className="text-sm">Pure Veg</span>
        </div>
      </section>

      {/* IMAGES */}
      <section className="space-y-4 border-b py-8">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">
          Images
        </h2>

        <Input
          className={inputClass}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => setFoodImages([...foodImages, ...(e.target.files || [])])}
        />
        <ImagePreviewGrid files={foodImages} onRemove={(i) => setFoodImages(foodImages.filter((_, idx) => idx !== i))} />

        <Input
          className={inputClass}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => setAmbienceImages([...ambienceImages, ...(e.target.files || [])])}
        />
        <ImagePreviewGrid
          files={ambienceImages}
          onRemove={(i) => setAmbienceImages(ambienceImages.filter((_, idx) => idx !== i))}
        />
      </section>

      {/* FEATURES */}
      <section className="space-y-4 border-b py-8">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">
          Features
        </h2>

        <Textarea className={inputClass} name="facilities" placeholder="Facilities (comma separated)" onChange={handleChange} />
        <Textarea className={inputClass} name="highlights" placeholder="Highlights (comma separated)" onChange={handleChange} />
        <Textarea className={inputClass} name="worth_visit" placeholder="Why worth visiting" onChange={handleChange} />
      </section>

      {/* OPENING HOURS */}
      <section className="space-y-4 py-8">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">
          Opening Hours
        </h2>

        {DAYS.map((day) => (
          <div key={day} className="space-y-3 rounded-md border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{day}</span>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={openingHours[day].closed}
                  onChange={(e) =>
                    setOpeningHours((prev) => ({
                      ...prev,
                      [day]: {
                        ...prev[day],
                        closed: e.target.checked,
                        open: e.target.checked ? "" : prev[day].open,
                        close: e.target.checked ? "" : prev[day].close,
                      },
                    }))
                  }
                />
                Closed
              </label>
            </div>

            {!openingHours[day].closed && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  className="border rounded-md px-3 py-2 text-sm bg-white"
                  value={openingHours[day].open || ""}
                  onChange={(e) =>
                    setOpeningHours((prev) => ({
                      ...prev,
                      [day]: { ...prev[day], open: e.target.value },
                    }))
                  }
                >
                  <option value="">Open</option>
                  {HOUR_OPTIONS.map((t) => (
                    <option key={`${day}-open-${t}`} value={t}>
                      {t}
                    </option>
                  ))}
                </select>

                <select
                  className="border rounded-md px-3 py-2 text-sm bg-white"
                  value={openingHours[day].close || ""}
                  onChange={(e) =>
                    setOpeningHours((prev) => ({
                      ...prev,
                      [day]: { ...prev[day], close: e.target.value },
                    }))
                  }
                >
                  <option value="">Close</option>
                  {HOUR_OPTIONS.map((t) => (
                    <option key={`${day}-close-${t}`} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ))}
      </section>

      {/* ACTIONS */}
      <div className="flex justify-end gap-3 pt-6">
        <Button variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-[#DA3224] hover:bg-[#c92b20] text-white"
        >
          {loading ? "Saving..." : "Save Restaurant"}
        </Button>
      </div>
    </div>
  );
}

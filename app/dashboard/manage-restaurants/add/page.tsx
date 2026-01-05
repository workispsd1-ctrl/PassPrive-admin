"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
];

type DayHours = {
  open: string;
  close: string;
};

const PARTNER_ROLE = "restaurantpartner" as const;

export default function AddRestaurantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [foodImages, setFoodImages] = useState<File[]>([]);
  const [ambienceImages, setAmbienceImages] = useState<File[]>([]);

  // ✅ NEW: partner auth credentials (like your admin page)
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
  });

  const [openingHours, setOpeningHours] = useState<Record<string, DayHours>>(
    DAYS.reduce((acc, day) => {
      acc[day] = { open: "", close: "" };
      return acc;
    }, {} as Record<string, DayHours>)
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ---------------------------------------------
     IMAGE UPLOAD
  --------------------------------------------- */
  const uploadImages = async (
    restaurantId: string,
    files: File[],
    type: "food" | "ambience"
  ) => {
    const urls: string[] = [];

    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `${type}/${restaurantId}/${Date.now()}.${ext}`;

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
     SUBMIT
  --------------------------------------------- */
  const handleSubmit = async () => {
    if (!form.name) {
      showToast({ type: "error", title: "Restaurant name is required" });
      return;
    }

    // ✅ NEW: partner credentials required
    if (!partnerEmail || !partnerPassword) {
      showToast({
        type: "error",
        title: "Partner Email & Password are required",
      });
      return;
    }

    if (partnerPassword.length < 6) {
      showToast({
        type: "error",
        title: "Password must be at least 6 characters",
      });
      return;
    }

    setLoading(true);

    let createdRestaurantId: string | null = null;

    try {
      const formattedOpeningHours: Record<string, string> = {};
      Object.entries(openingHours).forEach(([day, time]) => {
        if (time.open && time.close) {
          formattedOpeningHours[day] = `${time.open} - ${time.close}`;
        }
      });

      // 0) Save current admin session (so we can restore it if signUp switches session)
      const { data: adminSessionBefore } =
        await supabaseBrowser.auth.getSession();

      // 1) Create restaurant (unchanged)
      const { data: restaurant, error } = await supabaseBrowser
        .from("restaurants")
        .insert({
          name: form.name,
          phone: form.phone || null,
          city: form.city || null,
          area: form.area || null,
          full_address: form.full_address || null,
          cuisines: form.cuisines
            ? form.cuisines.split(",").map((v) => v.trim())
            : [],
          cost_for_two: form.cost_for_two ? Number(form.cost_for_two) : null,
          distance: form.distance ? Number(form.distance) : null,
          offer: form.offer || null,
          facilities: form.facilities
            ? form.facilities.split(",").map((v) => v.trim())
            : [],
          highlights: form.highlights
            ? form.highlights.split(",").map((v) => v.trim())
            : [],
          worth_visit: form.worth_visit
            ? form.worth_visit.split(",").map((v) => v.trim())
            : [],
          opening_hours: formattedOpeningHours,
          food_images: [],
          ambience_images: [],
          reviews: [],
          menu: [],
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      createdRestaurantId = restaurant.id;

      // 2) Upload images (unchanged)
      const foodUrls = await uploadImages(restaurant.id, foodImages, "food");
      const ambienceUrls = await uploadImages(
        restaurant.id,
        ambienceImages,
        "ambience"
      );

      await supabaseBrowser
        .from("restaurants")
        .update({
          food_images: foodUrls,
          ambience_images: ambienceUrls,
        })
        .eq("id", restaurant.id);

      // 3) Create AUTH user for restaurant partner (frontend, like your admin page)
      const { data: signUpData, error: signUpError } =
        await supabaseBrowser.auth.signUp({
          email: partnerEmail,
          password: partnerPassword,
          options: {
            data: {
              role: PARTNER_ROLE,
              full_name: form.name, // partner name
              phone: form.phone || null,
              restaurant_id: restaurant.id, // optional metadata (useful later)
            },
            // emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

      if (signUpError) throw new Error(signUpError.message);

      const partnerUserId = signUpData?.user?.id;
      if (!partnerUserId) throw new Error("Partner user id not returned");

      // 4) Insert into public.users (manual, no trigger)
      // ⚠️ Will fail if your RLS doesn't allow it (see note above)
      const { error: userInsertErr } = await supabaseBrowser
        .from("users")
        .insert({
          id: partnerUserId,
          email: partnerEmail,
          full_name: form.name || null,
          phone: form.phone || null,
          role: PARTNER_ROLE,
          profile_image: null,
          gender: null,
          dob: null,
        });

      if (userInsertErr) {
        throw new Error(
          `Failed inserting into public.users: ${userInsertErr.message}. ` +
            `If email confirmation is ON, signUp may not create a session and RLS may block this insert.`
        );
      }

      // 5) Restore admin session if signUp switched auth session
      if (signUpData?.session && adminSessionBefore?.session) {
        await supabaseBrowser.auth.setSession({
          access_token: adminSessionBefore.session.access_token,
          refresh_token: adminSessionBefore.session.refresh_token,
        });
      }

      showToast({
        type: "success",
        title: "Restaurant added successfully",
        description: "Partner account created with role restaurantpartner.",
      });

      router.push("/dashboard/manage-restaurants");
    } catch (err: any) {
      console.error(err);

      // Optional cleanup: delete restaurant if something failed after creation
      if (createdRestaurantId) {
        await supabaseBrowser
          .from("restaurants")
          .delete()
          .eq("id", createdRestaurantId);
      }

      showToast({
        type: "error",
        title: "Failed to add restaurant",
        description: err?.message || "Something went wrong",
      });
    }

    setLoading(false);
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

        <Input
          className={inputClass}
          name="name"
          placeholder="Restaurant name"
          onChange={handleChange}
        />
        <Input
          className={inputClass}
          name="phone"
          placeholder="Phone number"
          onChange={handleChange}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            className={inputClass}
            name="city"
            placeholder="City"
            onChange={handleChange}
          />
          <Input
            className={inputClass}
            name="area"
            placeholder="Area"
            onChange={handleChange}
          />
        </div>

        <Textarea
          className={inputClass}
          name="full_address"
          placeholder="Full address"
          onChange={handleChange}
        />
      </section>

      {/* ✅ NEW: PARTNER AUTH CREDENTIALS (minimal add, like your admin page) */}
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

        <Input
          className={inputClass}
          name="cuisines"
          placeholder="Cuisines (comma separated)"
          onChange={handleChange}
        />

        <div className="grid grid-cols-3 gap-4">
          <Input
            className={inputClass}
            name="cost_for_two"
            placeholder="Cost for two"
            onChange={handleChange}
          />
          <Input
            className={inputClass}
            name="distance"
            placeholder="Distance (km)"
            onChange={handleChange}
          />
          <Input
            className={inputClass}
            name="offer"
            placeholder="Offer (optional)"
            onChange={handleChange}
          />
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
          onChange={(e) =>
            setFoodImages([...foodImages, ...(e.target.files || [])])
          }
        />
        <ImagePreviewGrid
          files={foodImages}
          onRemove={(i) =>
            setFoodImages(foodImages.filter((_, idx) => idx !== i))
          }
        />

        <Input
          className={inputClass}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) =>
            setAmbienceImages([...ambienceImages, ...(e.target.files || [])])
          }
        />
        <ImagePreviewGrid
          files={ambienceImages}
          onRemove={(i) =>
            setAmbienceImages(ambienceImages.filter((_, idx) => idx !== i))
          }
        />
      </section>

      {/* FEATURES */}
      <section className="space-y-4 border-b py-8">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">
          Features
        </h2>

        <Textarea
          className={inputClass}
          name="facilities"
          placeholder="Facilities (comma separated)"
          onChange={handleChange}
        />
        <Textarea
          className={inputClass}
          name="highlights"
          placeholder="Highlights (comma separated)"
          onChange={handleChange}
        />
        <Textarea
          className={inputClass}
          name="worth_visit"
          placeholder="Why worth visiting"
          onChange={handleChange}
        />
      </section>

      {/* OPENING HOURS */}
      <section className="space-y-4 py-8">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">
          Opening Hours
        </h2>

        {DAYS.map((day) => (
          <div key={day} className="grid grid-cols-3 gap-4 items-center">
            <span className="text-sm">{day}</span>
            <Input
              className={inputClass}
              type="time"
              value={openingHours[day].open}
              onChange={(e) =>
                setOpeningHours({
                  ...openingHours,
                  [day]: { ...openingHours[day], open: e.target.value },
                })
              }
            />
            <Input
              className={inputClass}
              type="time"
              value={openingHours[day].close}
              onChange={(e) =>
                setOpeningHours({
                  ...openingHours,
                  [day]: { ...openingHours[day], close: e.target.value },
                })
              }
            />
          </div>
        ))}
      </section>

      {/* ACTIONS */}
      <div className="flex justify-end gap-3 pt-6">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
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

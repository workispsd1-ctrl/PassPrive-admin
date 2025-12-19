"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";
import { X } from "lucide-react";

const inputClass =
  "border border-gray-300 focus:border-gray-400 focus:ring-0";

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
  closed?: boolean;
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function AddStorePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);

  const [form, setForm] = useState({
    name: "",
    category: "",
    subcategory: "",
    tags: "",

    phone: "",
    whatsapp: "",
    email: "",
    website: "",

    location_name: "",
    address_line1: "",
    address_line2: "",
    city: "",
    region: "",
    postal_code: "",
    lat: "",
    lng: "",
    google_place_id: "",

    description: "",

    instagram: "",
    facebook: "",
    tiktok: "",
    maps: "",
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

  /* ---------------------------------------------
     IMAGE UPLOAD HELPERS
  --------------------------------------------- */
  const uploadSingle = async (
    storeId: string,
    file: File | null,
    folder: "logo" | "cover"
  ) => {
    if (!file) return null;

    const ext = file.name.split(".").pop();
    const path = `${folder}/${storeId}/${Date.now()}.${ext}`;

    const { error } = await supabaseBrowser.storage.from("stores").upload(path, file);
    if (error) throw error;

    const { data } = supabaseBrowser.storage.from("stores").getPublicUrl(path);
    return data.publicUrl;
  };

  const uploadMultiple = async (
    storeId: string,
    files: File[],
    folder: "gallery"
  ) => {
    const urls: string[] = [];

    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `${folder}/${storeId}/${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}.${ext}`;

      const { error } = await supabaseBrowser.storage.from("stores").upload(path, file);
      if (error) throw error;

      const { data } = supabaseBrowser.storage.from("stores").getPublicUrl(path);
      urls.push(data.publicUrl);
    }

    return urls;
  };

  /* ---------------------------------------------
     SUBMIT
  --------------------------------------------- */
  const handleSubmit = async () => {
    if (!form.name) {
      showToast({ type: "error", title: "Store name is required" });
      return;
    }

    setLoading(true);

    try {
      // Build hours JSON (your table expects jsonb array)
      const hours = DAYS.map((day) => {
        const d = openingHours[day];
        const closed = !!d.closed || (!d.open && !d.close);
        return {
          day,
          closed,
          slots: closed ? [] : [{ open: d.open, close: d.close }],
        };
      });

      const social_links = {
        instagram: form.instagram || undefined,
        facebook: form.facebook || undefined,
        tiktok: form.tiktok || undefined,
        maps: form.maps || undefined,
        website: form.website || undefined,
      };

      const tagsArray = form.tags
        ? form.tags.split(",").map((v) => v.trim()).filter(Boolean)
        : [];

      const lat =
        form.lat && !Number.isNaN(Number(form.lat)) ? Number(form.lat) : null;
      const lng =
        form.lng && !Number.isNaN(Number(form.lng)) ? Number(form.lng) : null;

      // 1) Insert store row first (media URLs empty for now)
      const { data: store, error } = await supabaseBrowser
        .from("stores")
        .insert({
          name: form.name,
          slug: null,
          description: form.description || null,

          category: form.category || null,
          subcategory: form.subcategory || null,
          tags: tagsArray,

          phone: form.phone || null,
          whatsapp: form.whatsapp || null,
          email: form.email || null,
          website: form.website || null,

          social_links,

          location_name: form.location_name || null,
          address_line1: form.address_line1 || null,
          address_line2: form.address_line2 || null,
          city: form.city || null,
          region: form.region || null,
          postal_code: form.postal_code || null,
          country: "Mauritius",

          lat,
          lng,
          google_place_id: form.google_place_id || null,

          hours,

          logo_url: null,
          cover_image_url: null,
          gallery_urls: [],

          amenities: {},
          services: {},
          pricing: {},
          offers: [],

          metadata: {},
          is_active: true,
          is_featured: false,
        })
        .select()
        .single();

      if (error) throw error;

      // 2) Upload media
      const logoUrl = await uploadSingle(store.id, logoFile, "logo");
      const coverUrl = await uploadSingle(store.id, coverFile, "cover");
      const galleryUrls = await uploadMultiple(store.id, galleryFiles, "gallery");

      // 3) Update row with media URLs
      const { error: upErr } = await supabaseBrowser
        .from("stores")
        .update({
          logo_url: logoUrl,
          cover_image_url: coverUrl,
          gallery_urls: galleryUrls,
        })
        .eq("id", store.id);

      if (upErr) throw upErr;

      showToast({ type: "success", title: "Store added successfully" });
      router.push("/dashboard/manage-stores");
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Failed to add store",
        description: err.message,
      });
    }

    setLoading(false);
  };

  /* ---------------------------------------------
     IMAGE TILE COMPONENTS
  --------------------------------------------- */
  const SinglePreview = ({
    file,
    onRemove,
  }: {
    file: File | null;
    onRemove: () => void;
  }) => {
    if (!file) return null;
    return (
      <div className="relative h-24 w-24 rounded-md overflow-hidden border border-gray-200 mt-3">
        <img
          src={URL.createObjectURL(file)}
          alt="preview"
          className="h-full w-full object-cover"
        />
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black"
        >
          <X size={12} />
        </button>
      </div>
    );
  };

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
          placeholder="Store name"
          onChange={handleChange}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            className={inputClass}
            name="category"
            placeholder="Category (e.g. Supermarket)"
            onChange={handleChange}
          />
          <Input
            className={inputClass}
            name="subcategory"
            placeholder="Subcategory (optional)"
            onChange={handleChange}
          />
        </div>

        <Textarea
          className={inputClass}
          name="tags"
          placeholder="Tags (comma separated) e.g. grocery, electronics, deals"
          onChange={handleChange}
        />

        <Textarea
          className={inputClass}
          name="description"
          placeholder="Description"
          onChange={handleChange}
        />
      </section>

      {/* CONTACT */}
      <section className="space-y-4 border-b py-8">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">
          Contact
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <Input
            className={inputClass}
            name="phone"
            placeholder="Phone"
            onChange={handleChange}
          />
          <Input
            className={inputClass}
            name="whatsapp"
            placeholder="WhatsApp (optional)"
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            className={inputClass}
            name="email"
            placeholder="Email (optional)"
            onChange={handleChange}
          />
          <Input
            className={inputClass}
            name="website"
            placeholder="Website (optional)"
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            className={inputClass}
            name="instagram"
            placeholder="Instagram URL (optional)"
            onChange={handleChange}
          />
          <Input
            className={inputClass}
            name="facebook"
            placeholder="Facebook URL (optional)"
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          
          <Input
            className={inputClass}
            name="maps"
            placeholder="Google Maps link (optional)"
            onChange={handleChange}
          />
        </div>
      </section>

      {/* LOCATION */}
      <section className="space-y-4 border-b py-8">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">
          Location
        </h2>

        <Input
          className={inputClass}
          name="location_name"
          placeholder="Location name (e.g. Bagatelle Mall)"
          onChange={handleChange}
        />

        <Textarea
          className={inputClass}
          name="address_line1"
          placeholder="Address line 1"
          onChange={handleChange}
        />

        <Textarea
          className={inputClass}
          name="address_line2"
          placeholder="Address line 2 (optional)"
          onChange={handleChange}
        />

        <div className="grid grid-cols-3 gap-4">
          <Input
            className={inputClass}
            name="city"
            placeholder="City"
            onChange={handleChange}
          />
          <Input
            className={inputClass}
            name="region"
            placeholder="Region (optional)"
            onChange={handleChange}
          />
          <Input
            className={inputClass}
            name="postal_code"
            placeholder="Postal code (optional)"
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input
            className={inputClass}
            name="lat"
            placeholder="Latitude (optional)"
            onChange={handleChange}
          />
          <Input
            className={inputClass}
            name="lng"
            placeholder="Longitude (optional)"
            onChange={handleChange}
          />
          <Input
            className={inputClass}
            name="google_place_id"
            placeholder="Google Place ID (optional)"
            onChange={handleChange}
          />
        </div>
      </section>

      {/* IMAGES */}
      <section className="space-y-4 border-b py-8">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">
          Images
        </h2>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Logo (single)</p>
          <Input
            className={inputClass}
            type="file"
            accept="image/*"
            onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
          />
          <SinglePreview file={logoFile} onRemove={() => setLogoFile(null)} />
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Cover (single)</p>
          <Input
            className={inputClass}
            type="file"
            accept="image/*"
            onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
          />
          <SinglePreview file={coverFile} onRemove={() => setCoverFile(null)} />
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Gallery (multiple)</p>
          <Input
            className={inputClass}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) =>
              setGalleryFiles([...galleryFiles, ...(e.target.files || [])])
            }
          />

          <ImagePreviewGrid
            files={galleryFiles}
            onRemove={(i) =>
              setGalleryFiles(galleryFiles.filter((_, idx) => idx !== i))
            }
          />
        </div>
      </section>

      {/* OPENING HOURS */}
      <section className="space-y-4 py-8">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">
          Opening Hours
        </h2>

        {DAYS.map((day) => (
          <div key={day} className="grid grid-cols-5 gap-4 items-center">
            <span className="text-sm col-span-1">{day}</span>

            <div className="col-span-1 flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!openingHours[day].closed}
                onChange={(e) =>
                  setOpeningHours({
                    ...openingHours,
                    [day]: {
                      ...openingHours[day],
                      closed: e.target.checked,
                      open: e.target.checked ? "" : openingHours[day].open,
                      close: e.target.checked ? "" : openingHours[day].close,
                    },
                  })
                }
              />
              <span className="text-sm text-gray-600">Closed</span>
            </div>

            <Input
              className={inputClass + " col-span-1"}
              type="time"
              value={openingHours[day].open}
              disabled={!!openingHours[day].closed}
              onChange={(e) =>
                setOpeningHours({
                  ...openingHours,
                  [day]: { ...openingHours[day], open: e.target.value },
                })
              }
            />

            <Input
              className={inputClass + " col-span-1"}
              type="time"
              value={openingHours[day].close}
              disabled={!!openingHours[day].closed}
              onChange={(e) =>
                setOpeningHours({
                  ...openingHours,
                  [day]: { ...openingHours[day], close: e.target.value },
                })
              }
            />

            <div className="col-span-1" />
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
          className="bg-[#DA3224] hover:bg-[#c92b20] text-white cursor-pointer"
        >
          {loading ? "Saving..." : "Save Store"}
        </Button>
      </div>
    </div>
  );
}

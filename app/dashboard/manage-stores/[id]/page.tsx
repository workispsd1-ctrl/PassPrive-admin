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

/** Generates 15-min slots in 24h format */
const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const h = String(Math.floor(i / 4)).padStart(2, "0");
  const m = String((i % 4) * 15).padStart(2, "0");
  return `${h}:${m}`;
});

type DayHours = {
  open: string;
  close: string;
  closed: boolean;
};

const emptyWeek = () =>
  DAYS.reduce((acc, day) => {
    acc[day] = { open: "", close: "", closed: false };
    return acc;
  }, {} as Record<string, DayHours>);

/* ---------------- HOURS UTILS ---------------- */

const parseHours = (raw: any) => {
  const week = emptyWeek();
  if (!Array.isArray(raw)) return week;

  for (const item of raw) {
    const day = item?.day;
    if (!day || !week[day]) continue;

    const closed = !!item?.closed;
    const slot0 = Array.isArray(item?.slots) ? item.slots[0] : null;

    week[day] = {
      closed,
      open: closed ? "" : (slot0?.open || ""),
      close: closed ? "" : (slot0?.close || ""),
    };
  }

  return week;
};

const serializeHours = (week: Record<string, DayHours>) => {
  return DAYS.map((day) => {
    const d = week[day] || { open: "", close: "", closed: false };
    const closed = !!d.closed || (!d.open && !d.close);

    return {
      day,
      closed,
      slots: closed ? [] : [{ open: d.open, close: d.close }],
    };
  });
};

const cleanObject = (obj: Record<string, any>) => {
  const out: Record<string, any> = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (typeof v === "string" && v.trim() === "") return;
    out[k] = v;
  });
  return out;
};

/* ---------------- COMPONENT ---------------- */

export default function StoreDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [store, setStore] = useState<any>(null);
  const [storeOriginal, setStoreOriginal] = useState<any>(null);

  const [openingHours, setOpeningHours] = useState<Record<string, DayHours>>(
    emptyWeek()
  );
  const [openingHoursOriginal, setOpeningHoursOriginal] =
    useState<Record<string, DayHours>>(emptyWeek());

  // ✅ week include/exclude (same as restaurants)
  const [weekEnabled, setWeekEnabled] = useState(true);

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const headerLocation = useMemo(() => {
    if (!store) return "";
    const parts = [store.location_name, store.city, store.region].filter(Boolean);
    return parts.join(", ");
  }, [store]);

  useEffect(() => {
    const fetchStore = async () => {
      const { data, error } = await supabaseBrowser
        .from("stores")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        showToast({
          type: "error",
          title: "Failed to load store",
          description: error.message,
        });
        return;
      }

      setStore(data);
      setStoreOriginal(data);

      const parsed = parseHours(data.hours);
      setOpeningHours(parsed);
      setOpeningHoursOriginal(parsed);

      setWeekEnabled(Array.isArray(data.hours) && data.hours.length > 0);
    };

    fetchStore();
  }, [id]);

  const handleCancel = () => {
    setStore(storeOriginal);
    setOpeningHours(openingHoursOriginal);
    setWeekEnabled(Array.isArray(storeOriginal?.hours) && storeOriginal.hours.length > 0);
    setEditMode(false);
  };

  const handleSave = async () => {
    if (!store?.name) {
      showToast({ type: "error", title: "Store name is required" });
      return;
    }

    setSaving(true);

    try {
      const tagsArray =
        typeof store.tags === "string"
          ? store.tags
              .split(",")
              .map((v: string) => v.trim())
              .filter(Boolean)
          : Array.isArray(store.tags)
          ? store.tags
          : [];

      const lat =
        store.lat !== "" && store.lat !== null && !Number.isNaN(Number(store.lat))
          ? Number(store.lat)
          : null;

      const lng =
        store.lng !== "" && store.lng !== null && !Number.isNaN(Number(store.lng))
          ? Number(store.lng)
          : null;

      const social_links = cleanObject({
        instagram: store.instagram,
        facebook: store.facebook,
        tiktok: store.tiktok,
        maps: store.maps,
        website: store.website,
        ...(store.social_links || {}),
      });

      const payload: any = {
        name: store.name,
        description: store.description || null,

        category: store.category || null,
        subcategory: store.subcategory || null,
        tags: tagsArray,

        phone: store.phone || null,
        whatsapp: store.whatsapp || null,
        email: store.email || null,
        website: store.website || null,

        social_links,

        location_name: store.location_name || null,
        address_line1: store.address_line1 || null,
        address_line2: store.address_line2 || null,
        city: store.city || null,
        region: store.region || null,
        country: store.country || "Mauritius",
        postal_code: store.postal_code || null,

        lat,
        lng,
        google_place_id: store.google_place_id || null,

        // ✅ week enable/disable
        hours: weekEnabled ? serializeHours(openingHours) : [],

        is_active: !!store.is_active,
        is_featured: !!store.is_featured,

        // keep images unchanged unless you later add upload/delete here
        logo_url: store.logo_url || null,
        cover_image_url: store.cover_image_url || null,
        gallery_urls: Array.isArray(store.gallery_urls) ? store.gallery_urls : [],
      };

      const { error } = await supabaseBrowser
        .from("stores")
        .update(payload)
        .eq("id", id);

      if (error) {
        showToast({
          type: "error",
          title: "Update failed",
          description: error.message,
        });
        setSaving(false);
        return;
      }

      showToast({ type: "success", title: "Store updated" });
      setEditMode(false);

      // refresh originals
      const merged = {
        ...store,
        ...payload,
        tags: payload.tags,
        hours: payload.hours,
        social_links: payload.social_links,
        lat: payload.lat,
        lng: payload.lng,
      };
      setStore(merged);
      setStoreOriginal(merged);
      setOpeningHoursOriginal(openingHours);

      setSaving(false);
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Failed to update store",
        description: err.message,
      });
      setSaving(false);
    }
  };

  if (!store) return <div className="p-6">Loading…</div>;

  // Make social links editable via separate inputs (same style as add page)
  const social = store.social_links || {};

  return (
    <div className="w-full p-4 space-y-12">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-gray-300 pb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-2xl font-semibold">{store.name}</h1>
            <p className="text-sm text-gray-500">{headerLocation || "-"}</p>
          </div>
        </div>

        {!editMode ? (
          <Button onClick={() => setEditMode(true)}>Edit</Button>
        ) : (
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#DA3224] text-white"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>

      {/* SYSTEM */}
      <Section title="System">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4">
            <span>Active</span>
            <Switch
              checked={!!store.is_active}
              disabled={!editMode}
              onCheckedChange={(v) => setStore({ ...store, is_active: v })}
            />
          </div>

          <div className="flex items-center gap-4">
            <span>Featured</span>
            <Switch
              checked={!!store.is_featured}
              disabled={!editMode}
              onCheckedChange={(v) => setStore({ ...store, is_featured: v })}
            />
          </div>
        </div>
      </Section>

      {/* BASIC INFO */}
      <Section title="Basic Information">
        <Grid>
          <Field label="Name">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.name || ""}
              onChange={(e) => setStore({ ...store, name: e.target.value })}
            />
          </Field>

          <Field label="Category">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.category ?? ""}
              onChange={(e) => setStore({ ...store, category: e.target.value })}
            />
          </Field>

          <Field label="Subcategory">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.subcategory ?? ""}
              onChange={(e) => setStore({ ...store, subcategory: e.target.value })}
            />
          </Field>

          <Field label="Tags (comma separated)">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={
                Array.isArray(store.tags)
                  ? store.tags.join(", ")
                  : (store.tags ?? "")
              }
              onChange={(e) => setStore({ ...store, tags: e.target.value })}
            />
          </Field>
        </Grid>

        <Field label="Description">
          <Textarea
            className={inputClass}
            disabled={!editMode}
            value={store.description ?? ""}
            onChange={(e) => setStore({ ...store, description: e.target.value })}
          />
        </Field>
      </Section>

      {/* CONTACT */}
      <Section title="Contact">
        <Grid>
          <Field label="Phone">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.phone ?? ""}
              onChange={(e) => setStore({ ...store, phone: e.target.value })}
            />
          </Field>

          <Field label="WhatsApp">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.whatsapp ?? ""}
              onChange={(e) => setStore({ ...store, whatsapp: e.target.value })}
            />
          </Field>

          <Field label="Email">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.email ?? ""}
              onChange={(e) => setStore({ ...store, email: e.target.value })}
            />
          </Field>

          <Field label="Website">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.website ?? ""}
              onChange={(e) => setStore({ ...store, website: e.target.value })}
            />
          </Field>
        </Grid>

        <Grid>
          <Field label="Instagram">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.instagram ?? social.instagram ?? ""}
              onChange={(e) => setStore({ ...store, instagram: e.target.value })}
            />
          </Field>

          <Field label="Facebook">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.facebook ?? social.facebook ?? ""}
              onChange={(e) => setStore({ ...store, facebook: e.target.value })}
            />
          </Field>

          <Field label="TikTok">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.tiktok ?? social.tiktok ?? ""}
              onChange={(e) => setStore({ ...store, tiktok: e.target.value })}
            />
          </Field>

          <Field label="Google Maps Link">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.maps ?? social.maps ?? ""}
              onChange={(e) => setStore({ ...store, maps: e.target.value })}
            />
          </Field>
        </Grid>
      </Section>

      {/* LOCATION */}
      <Section title="Location">
        <Grid>
          <Field label="Location Name">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.location_name ?? ""}
              onChange={(e) => setStore({ ...store, location_name: e.target.value })}
            />
          </Field>

          <Field label="City">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.city ?? ""}
              onChange={(e) => setStore({ ...store, city: e.target.value })}
            />
          </Field>

          <Field label="Region">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.region ?? ""}
              onChange={(e) => setStore({ ...store, region: e.target.value })}
            />
          </Field>

          <Field label="Postal Code">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.postal_code ?? ""}
              onChange={(e) => setStore({ ...store, postal_code: e.target.value })}
            />
          </Field>
        </Grid>

        <Field label="Address Line 1">
          <Textarea
            className={inputClass}
            disabled={!editMode}
            value={store.address_line1 ?? ""}
            onChange={(e) => setStore({ ...store, address_line1: e.target.value })}
          />
        </Field>

        <Field label="Address Line 2">
          <Textarea
            className={inputClass}
            disabled={!editMode}
            value={store.address_line2 ?? ""}
            onChange={(e) => setStore({ ...store, address_line2: e.target.value })}
          />
        </Field>

        <Grid>
          <Field label="Latitude">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.lat ?? ""}
              onChange={(e) => setStore({ ...store, lat: e.target.value })}
            />
          </Field>

          <Field label="Longitude">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.lng ?? ""}
              onChange={(e) => setStore({ ...store, lng: e.target.value })}
            />
          </Field>

          <Field label="Google Place ID">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.google_place_id ?? ""}
              onChange={(e) =>
                setStore({ ...store, google_place_id: e.target.value })
              }
            />
          </Field>

          <Field label="Country">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.country ?? "Mauritius"}
              onChange={(e) => setStore({ ...store, country: e.target.value })}
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
          />
        </div>
        {!weekEnabled && (
          <p className="text-xs text-gray-500">
            Week disabled: hours will be saved as empty (store closed for the week).
          </p>
        )}
      </Section>

      {/* OPENING HOURS */}
      <Section title="Opening Hours">
        {DAYS.map((day) => (
          <div key={day} className="grid grid-cols-[120px_140px_1fr_1fr] gap-4 mb-2 items-center">
            <span className="text-sm">{day}</span>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                disabled={!editMode || !weekEnabled}
                checked={!!openingHours[day]?.closed}
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

            <select
              disabled={!editMode || !weekEnabled || !!openingHours[day]?.closed}
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
              disabled={!editMode || !weekEnabled || !!openingHours[day]?.closed}
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

      {/* IMAGES (Read Only) */}
      <Section title="Images">
        <SingleImage title="Logo" src={store.logo_url} />
        <SingleImage title="Cover" src={store.cover_image_url} />
        <ImageGrid title="Gallery" images={store.gallery_urls} />
      </Section>

      {/* SYSTEM (Read Only) */}
      <Section title="System Info (Read Only)">
        <Grid>
          <ReadOnly
            label="Created At"
            value={store.created_at ? new Date(store.created_at).toLocaleString() : "-"}
          />
          <ReadOnly
            label="Updated At"
            value={store.updated_at ? new Date(store.updated_at).toLocaleString() : "-"}
          />
        </Grid>
      </Section>
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

const SingleImage = ({ title, src }: any) => (
  <div className="space-y-2">
    <h3 className="text-sm font-medium">{title}</h3>
    {src ? (
      <img src={src} className="w-full max-w-sm h-48 object-cover rounded-md border" />
    ) : (
      <p className="text-sm text-gray-400">No image</p>
    )}
  </div>
);

const ImageGrid = ({ title, images }: any) => (
  <div className="space-y-2">
    <h3 className="text-sm font-medium">{title}</h3>
    <div className="grid grid-cols-4 gap-3">
      {images?.length ? (
        images.map((src: string, i: number) => (
          <img
            key={i}
            src={src}
            className="w-full h-32 object-cover rounded-md border"
          />
        ))
      ) : (
        <p className="text-sm text-gray-400">No images</p>
      )}
    </div>
  </div>
);

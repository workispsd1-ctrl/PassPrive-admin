"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { showToast } from "@/hooks/useToast";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type MoodCategory = { id: string; title: string; slug: string };

type CategoryRef = { type: string; value: string };

const CATEGORY_GROUPS = [
  { type: "restaurant", label: "Restaurants", table: "restaurant_mood_categories" },
  { type: "store", label: "Shopping", table: "store_mood_categories" },
  { type: "wellness", label: "Wellness", table: "service_categories" },
] as const;

const DISCOUNT_TYPES = [
  { key: "percent", label: "Percentage off" },
  { key: "flat", label: "Flat amount off" },
] as const;

const SORT_OPTIONS = [
  { key: "distance", label: "Nearest first" },
  { key: "rating_desc", label: "Top rated" },
  { key: "discount_desc", label: "Biggest discount" },
  { key: "popularity", label: "Most reviewed" },
] as const;

function discountLabel(c: PromotionalCollection): string {
  const min = c.min_discount_value;
  const max = c.max_discount_value;
  if (min == null && max == null) return "";
  const unit = c.discount_type === "flat" ? "MUR " : "";
  const suffix = c.discount_type === "flat" ? " off" : "% off";
  if (min != null && max != null) return `${unit}${min}-${max}${suffix}`;
  if (min != null) return `${unit}${min}+${suffix}`;
  return `up to ${unit}${max}${suffix}`;
}

function sameRef(a: CategoryRef, b: CategoryRef) {
  return a.type === b.type && a.value === b.value;
}

const SCREEN_OPTIONS = [
  { key: "home", label: "Home" },
  { key: "dinein", label: "DineinHome" },
  { key: "shopping", label: "ShoppingHome" },
  { key: "wellness", label: "WellnessHome" },
  { key: "tourist", label: "TouristHome" },
] as const;

type PromotionalCollection = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  banner_image_url?: string | null;
  mood_category_id?: string | null;
  category_refs?: CategoryRef[] | null;
  sort_modes?: string[] | null;
  discount_type?: string | null;
  min_discount_value?: number | null;
  max_discount_value?: number | null;
  sort_order: number;
  is_active: boolean;
  screens?: string[] | null;
  starts_at?: string | null;
  ends_at?: string | null;
  updated_at?: string;
  restaurant_mood_categories?: { title: string } | { title: string }[] | null;
};

function categoryTitle(c: PromotionalCollection): string {
  const rel = c.restaurant_mood_categories;
  if (Array.isArray(rel)) return rel[0]?.title || "";
  return rel?.title || "";
}

type FormState = {
  slug: string;
  title: string;
  subtitle: string;
  banner_image_url: string;
  mood_category_id: string;
  category_refs: CategoryRef[];
  sort_modes: string[];
  discount_type: string;
  min_discount_value: string;
  max_discount_value: string;
  sort_order: string;
  is_active: boolean;
  screens: string[];
  starts_at: string;
  ends_at: string;
};

const initialForm: FormState = {
  slug: "",
  title: "",
  subtitle: "",
  banner_image_url: "",
  mood_category_id: "",
  category_refs: [],
  sort_modes: ["distance"],
  discount_type: "percent",
  min_discount_value: "",
  max_discount_value: "",
  sort_order: "100",
  is_active: true,
  screens: ["home"],
  starts_at: "",
  ends_at: "",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("Unable to read the selected image."));
    };
    reader.onerror = () => reject(new Error("Unable to read the selected image."));
    reader.readAsDataURL(file);
  });
}

function BannerUploadField({
  value,
  uploadedValue,
  onUpload,
  onClearUpload,
  onUrlChange,
}: {
  value: string;
  uploadedValue: string;
  onUpload: (value: string) => void;
  onClearUpload: () => void;
  onUrlChange: (value: string) => void;
}) {
  const activeValue = uploadedValue || value.trim();
  const activeSource = uploadedValue ? "Uploaded from computer" : value.trim() ? "Image URL" : "No image selected";

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      onUpload(dataUrl);
      event.target.value = "";
    } catch (error: unknown) {
      showToast({ type: "error", title: "Failed to load banner image", description: error instanceof Error ? error.message : "Try another file." });
    }
  }

  return (
    <div className="grid gap-2">
      <Label>Banner image (full PNG/JPEG)</Label>
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {activeValue ? (
              <img src={activeValue} alt="Banner preview" className="h-full w-full object-cover" />
            ) : (
              <div className="px-2 text-center text-[10px] font-medium uppercase tracking-wide text-slate-400">Preview</div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900">{activeSource}</p>
            <p className="mt-1 text-xs text-slate-500">The full themed banner (gradient + art + title baked in) shown above the restaurant rail.</p>
          </div>
        </div>
        <div className="grid gap-2">
          <Input type="file" accept="image/*" onChange={handleFileChange} />
          {uploadedValue ? (
            <Button type="button" variant="outline" className="w-fit" onClick={onClearUpload}>Clear uploaded image</Button>
          ) : null}
          <Input value={value} onChange={(e) => onUrlChange(e.target.value)} placeholder="Or paste a banner image URL" />
        </div>
      </div>
    </div>
  );
}

export default function PromotionalCollectionManager() {
  const [collections, setCollections] = useState<PromotionalCollection[]>([]);
  const [categories, setCategories] = useState<MoodCategory[]>([]);
  const [storeCategories, setStoreCategories] = useState<MoodCategory[]>([]);
  const [wellnessCategories, setWellnessCategories] = useState<MoodCategory[]>([]);
  const [touristTags, setTouristTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PromotionalCollection | null>(null);
  const [deleting, setDeleting] = useState<PromotionalCollection | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [bannerUploadUrl, setBannerUploadUrl] = useState("");
  const [query, setQuery] = useState("");
  const [activeScreen, setActiveScreen] = useState<string>("home");

  const refLabels = useCallback(
    (c: PromotionalCollection) => {
      const refs = Array.isArray(c.category_refs) ? c.category_refs : [];
      if (refs.length === 0) return categoryTitle(c) ? [categoryTitle(c)] : [];
      return refs
        .map((ref) => {
          if (ref.type === "tourist") return ref.value;
          const pool =
            ref.type === "store" ? storeCategories : ref.type === "wellness" ? wellnessCategories : categories;
          return pool.find((cat) => cat.id === ref.value)?.title || "";
        })
        .filter(Boolean);
    },
    [categories, storeCategories, wellnessCategories],
  );

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return collections.filter((c) => {
      if (!(c.screens || []).includes(activeScreen)) return false;
      if (!search) return true;
      return [c.title, c.slug, c.subtitle || ""].join(" ").toLowerCase().includes(search);
    });
  }, [collections, query, activeScreen]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const catQuery = (table: string) =>
        supabaseBrowser
          .from(table)
          .select("id,title,slug")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

      const [
        { data: rows, error },
        { data: catRows, error: catError },
        { data: storeRows },
        { data: wellnessRows },
        { data: touristRows },
      ] = await Promise.all([
        supabaseBrowser
          .from("promotional_collections")
          .select("id,slug,title,subtitle,banner_image_url,mood_category_id,category_refs,sort_modes,discount_type,min_discount_value,max_discount_value,sort_order,is_active,screens,starts_at,ends_at,updated_at,restaurant_mood_categories(title)")
          .order("sort_order", { ascending: true }),
        catQuery("restaurant_mood_categories"),
        catQuery("store_mood_categories"),
        catQuery("service_categories"),
        supabaseBrowser.from("tourist_places").select("tags").eq("is_active", true),
      ]);
      if (error) throw error;
      if (catError) throw catError;
      setCollections((rows as unknown as PromotionalCollection[] | null) || []);
      setCategories((catRows as MoodCategory[] | null) || []);
      setStoreCategories((storeRows as MoodCategory[] | null) || []);
      setWellnessCategories((wellnessRows as MoodCategory[] | null) || []);
      setTouristTags(
        Array.from(
          new Set(
            ((touristRows as { tags: string[] | null }[] | null) || [])
              .flatMap((r) => r.tags || [])
              .filter(Boolean),
          ),
        ).sort(),
      );
    } catch (error: unknown) {
      showToast({ type: "error", title: "Failed to load promotional cards", description: error instanceof Error ? error.message : "Unable to fetch." });
      setCollections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ ...initialForm, screens: [activeScreen] });
    setBannerUploadUrl("");
    setDialogOpen(true);
  }

  function openEdit(c: PromotionalCollection) {
    setEditing(c);
    setBannerUploadUrl("");
    setForm({
      slug: c.slug || "",
      title: c.title || "",
      subtitle: c.subtitle || "",
      banner_image_url: c.banner_image_url || "",
      mood_category_id: c.mood_category_id || "",
      category_refs: Array.isArray(c.category_refs) ? c.category_refs : [],
      sort_modes: Array.isArray(c.sort_modes) && c.sort_modes.length ? c.sort_modes : ["distance"],
      discount_type: c.discount_type || "percent",
      min_discount_value: c.min_discount_value == null ? "" : String(c.min_discount_value),
      max_discount_value: c.max_discount_value == null ? "" : String(c.max_discount_value),
      sort_order: String(c.sort_order ?? 100),
      is_active: Boolean(c.is_active),
      screens: c.screens || [],
      starts_at: toDateTimeLocal(c.starts_at),
      ends_at: toDateTimeLocal(c.ends_at),
    });
    setDialogOpen(true);
  }

  async function save() {
    if (!form.slug.trim()) return showToast({ type: "error", title: "Slug is required" });
    if (!form.title.trim()) return showToast({ type: "error", title: "Title is required" });
    if (form.category_refs.length === 0) return showToast({ type: "error", title: "Pick at least one category" });
    if (form.screens.length === 0) return showToast({ type: "error", title: "Pick at least one screen" });
    const sortOrder = Number(form.sort_order);
    if (!Number.isFinite(sortOrder)) return showToast({ type: "error", title: "Sort order must be a number" });

    if (form.sort_modes.length === 0) return showToast({ type: "error", title: "Pick at least one sort order" });

    const isPercent = form.discount_type === "percent";
    const ceiling = isPercent ? 100 : Number.POSITIVE_INFINITY;
    const parseDiscount = (raw: string, label: string): number | null | "invalid" => {
      const trimmed = raw.trim();
      if (!trimmed) return null;
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > ceiling) {
        showToast({
          type: "error",
          title: isPercent ? `${label} discount must be between 0 and 100` : `${label} discount must be 0 or more`,
        });
        return "invalid";
      }
      return parsed;
    };

    const minDiscount = parseDiscount(form.min_discount_value, "Minimum");
    if (minDiscount === "invalid") return;
    const maxDiscount = parseDiscount(form.max_discount_value, "Maximum");
    if (maxDiscount === "invalid") return;
    if (minDiscount != null && maxDiscount != null && maxDiscount < minDiscount) {
      return showToast({ type: "error", title: "Maximum discount must be at least the minimum" });
    }

    const startsAtIso = toIsoOrNull(form.starts_at);
    const endsAtIso = toIsoOrNull(form.ends_at);
    if (form.starts_at.trim() && !startsAtIso) return showToast({ type: "error", title: "Start date/time is invalid" });
    if (form.ends_at.trim() && !endsAtIso) return showToast({ type: "error", title: "End date/time is invalid" });
    if (startsAtIso && endsAtIso && new Date(endsAtIso) <= new Date(startsAtIso)) {
      return showToast({ type: "error", title: "End date must be later than start date" });
    }

    const record: Record<string, unknown> = {
      slug: form.slug.trim(),
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      banner_image_url: bannerUploadUrl || form.banner_image_url.trim() || null,
      mood_category_id: form.category_refs.find((r) => r.type === "restaurant")?.value || null,
      category_refs: form.category_refs,
      sort_modes: form.sort_modes,
      discount_type: form.discount_type,
      min_discount_value: minDiscount,
      max_discount_value: maxDiscount,
      sort_order: sortOrder,
      is_active: form.is_active,
      screens: form.screens,
      ends_at: endsAtIso,
      updated_at: new Date().toISOString(),
      ...(startsAtIso ? { starts_at: startsAtIso } : editing?.starts_at ? { starts_at: editing.starts_at } : {}),
    };

    try {
      setSaving(true);
      if (editing) {
        const { error } = await supabaseBrowser.from("promotional_collections").update(record).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabaseBrowser.from("promotional_collections").insert(record);
        if (error) throw error;
      }
      showToast({ title: editing ? "Promotional card updated" : "Promotional card created" });
      setDialogOpen(false);
      setEditing(null);
      setForm(initialForm);
      setBannerUploadUrl("");
      await load();
    } catch (error: unknown) {
      showToast({ type: "error", title: "Failed to save", description: error instanceof Error ? error.message : "Save failed." });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      setSaving(true);
      const { error } = await supabaseBrowser.from("promotional_collections").delete().eq("id", deleting.id);
      if (error) throw error;
      showToast({ title: "Promotional card deleted" });
      setDeleting(null);
      await load();
    } catch (error: unknown) {
      showToast({ type: "error", title: "Failed to delete", description: error instanceof Error ? error.message : "Delete failed." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "#FFFFFF4D" }}>
      <div className="mx-auto flex min-h-screen w-full max-w-[1360px] flex-col" style={{ background: "#FFFFFF4D" }}>
        <div className="flex-1 px-4 pb-6 pt-4 sm:px-5 lg:px-6">
          <Card
            className="overflow-hidden rounded-[18px] border border-slate-200/70 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-sm"
            style={{ background: "linear-gradient(310.35deg, rgba(255, 255, 255, 0.4) 4.07%, rgba(255, 255, 255, 0.3) 48.73%, rgba(255, 255, 255, 0.2) 100%)" }}
          >
            <CardHeader className="space-y-4 border-b border-slate-100/90 bg-white/70 px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="text-[18px] leading-6 text-slate-900">Promotional Cards</CardTitle>
                  <CardDescription className="mt-1 text-[12px] leading-5 text-slate-500">
                    Themed promo banners (e.g. &quot;For the Football Fanatics&quot;). Each shows every restaurant in the chosen category.
                  </CardDescription>
                </div>
                <Button className="h-10 rounded-2xl bg-[#5800AB] px-5 text-sm text-white shadow-[0_10px_20px_rgba(88,0,171,0.25)] hover:bg-[#4a0090]" onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add promotional card
                </Button>
              </div>
              <div className="relative w-full lg:max-w-[1120px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title or slug" className="h-10 rounded-xl border-slate-200 bg-white pl-10 text-sm" />
              </div>
              <div className="flex flex-wrap gap-2">
                {SCREEN_OPTIONS.map((s) => {
                  const active = activeScreen === s.key;
                  const count = collections.filter((c) => (c.screens || []).includes(s.key)).length;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setActiveScreen(s.key)}
                      className={`h-9 rounded-xl px-4 text-[13px] font-medium transition ${active ? "bg-[#5800AB] text-white shadow-[0_6px_16px_rgba(88,0,171,0.22)]" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                    >
                      {s.label}
                      <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </CardHeader>

            <CardContent className="px-4 py-4 sm:px-5">
              {loading ? (
                <div className="flex items-center justify-center gap-3 rounded-[16px] border border-dashed border-slate-200 bg-white px-6 py-20 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading promotional cards...
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-[16px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
                  <p className="text-sm font-medium text-slate-900">No promotional cards yet.</p>
                  <p className="mt-2 text-sm text-slate-500">Create one and choose the restaurant category it should feature.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {filtered.map((c) => (
                    <div key={c.id} className="rounded-[14px] border border-slate-200/80 px-4 py-4 shadow-[0_2px_14px_rgba(15,23,42,0.07)]" style={{ background: "linear-gradient(0deg, #FFFFFF, #FFFFFF), linear-gradient(142.22deg, #ECFEFF 4.91%, #F3E8FF 95.09%)" }}>
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 flex-1 gap-3">
                          <div className="h-16 w-28 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                            {c.banner_image_url ? <img src={c.banner_image_url} alt="" className="h-full w-full object-cover" /> : null}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-[14px] font-semibold leading-5 text-slate-900">{c.title}</p>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium leading-4 ${c.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                                {c.is_active ? "Active" : "Inactive"}
                              </span>
                              {refLabels(c).map((label) => (
                                <span key={label} className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium capitalize leading-4 text-violet-700">{label}</span>
                              ))}
                              {discountLabel(c) ? (
                                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium leading-4 text-amber-700">{discountLabel(c)}</span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-[12px] leading-5 text-slate-500">{c.slug}</p>
                            <p className="mt-1 text-[12px] leading-5 text-slate-500">{c.subtitle || "No subtitle added yet."}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {(c.screens || []).map((sk) => (
                                <span key={sk} className="rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-medium leading-4 text-cyan-700">
                                  {SCREEN_OPTIONS.find((s) => s.key === sk)?.label || sk}
                                </span>
                              ))}
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] leading-4 text-slate-400">
                              <span>Sort: {c.sort_order ?? 0}</span>
                              <span>Updated: {formatDate(c.updated_at)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                          <Button variant="outline" className="h-9 rounded-xl border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 shadow-sm hover:bg-slate-50" onClick={() => openEdit(c)}>
                            <Image src="/restaurentpasspriveedit.png" alt="Edit" width={14} height={14} className="mr-2 h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button variant="outline" className="h-9 rounded-xl border-red-200 bg-white px-3 text-[13px] font-medium text-red-600 shadow-sm hover:bg-red-50 hover:text-red-700" onClick={() => setDeleting(c)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit promotional card" : "Create promotional card"}</DialogTitle>
            <DialogDescription>Set the banner, then pick the categories to feature.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="promo-slug">Slug</Label>
                <Input id="promo-slug" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="football-fanatics" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="promo-title">Title</Label>
                <Input id="promo-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="For the Football Fanatics" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="promo-subtitle">Subtitle</Label>
              <Textarea id="promo-subtitle" value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} placeholder="Enjoy FIFA 2026 screenings while also getting exclusive offers!" className="min-h-[70px]" />
            </div>

            <div className="grid gap-3">
              <Label>Categories</Label>
              {CATEGORY_GROUPS.map((group) => {
                const options =
                  group.type === "restaurant"
                    ? categories
                    : group.type === "store"
                      ? storeCategories
                      : wellnessCategories;
                if (options.length === 0) return null;
                return (
                  <div key={group.type} className="grid gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{group.label}</p>
                    <div className="flex flex-wrap gap-2">
                      {options.map((cat) => {
                        const ref: CategoryRef = { type: group.type, value: cat.id };
                        const checked = form.category_refs.some((r) => sameRef(r, ref));
                        return (
                          <button
                            key={`${group.type}-${cat.id}`}
                            type="button"
                            onClick={() =>
                              setForm((f) => ({
                                ...f,
                                category_refs: checked
                                  ? f.category_refs.filter((r) => !sameRef(r, ref))
                                  : [...f.category_refs, ref],
                              }))
                            }
                            className={`h-9 rounded-xl px-4 text-[13px] font-medium transition ${checked ? "bg-[#5800AB] text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                          >
                            {cat.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {touristTags.length > 0 ? (
                <div className="grid gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tourist</p>
                  <div className="flex flex-wrap gap-2">
                    {touristTags.map((tag) => {
                      const ref: CategoryRef = { type: "tourist", value: tag };
                      const checked = form.category_refs.some((r) => sameRef(r, ref));
                      return (
                        <button
                          key={`tourist-${tag}`}
                          type="button"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              category_refs: checked
                                ? f.category_refs.filter((r) => !sameRef(r, ref))
                                : [...f.category_refs, ref],
                            }))
                          }
                          className={`h-9 rounded-xl px-4 text-[13px] font-medium capitalize transition ${checked ? "bg-[#5800AB] text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <p className="text-xs text-slate-500">Pick one or more categories, from any mix of verticals — e.g. &quot;Drink &amp; dine&quot; plus a Shopping category on the same card.</p>
            </div>

            <div className="grid gap-2">
              <Label>Order results by</Label>
              <div className="flex flex-wrap gap-2">
                {SORT_OPTIONS.map((o) => {
                  const index = form.sort_modes.indexOf(o.key);
                  const checked = index >= 0;
                  return (
                    <button
                      key={o.key}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          sort_modes: checked
                            ? f.sort_modes.filter((k) => k !== o.key)
                            : [...f.sort_modes, o.key],
                        }))
                      }
                      className={`h-9 rounded-xl px-4 text-[13px] font-medium transition ${checked ? "bg-[#5800AB] text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                    >
                      {checked ? `${index + 1}. ` : ""}{o.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500">Pick one or more — they apply in the order you tap them, e.g. 1. Nearest first, 2. Top rated.</p>
            </div>

            <div className="grid gap-2">
              <Label>Discount filter</Label>
              <div className="flex flex-wrap gap-2">
                {DISCOUNT_TYPES.map((t) => {
                  const checked = form.discount_type === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, discount_type: t.key }))}
                      className={`h-9 rounded-xl px-4 text-[13px] font-medium transition ${checked ? "bg-[#5800AB] text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="promo-min-discount">Minimum {form.discount_type === "percent" ? "%" : "MUR"}</Label>
                  <Input
                    id="promo-min-discount"
                    type="number"
                    min={0}
                    max={form.discount_type === "percent" ? 100 : undefined}
                    value={form.min_discount_value}
                    onChange={(e) => setForm((f) => ({ ...f, min_discount_value: e.target.value }))}
                    placeholder={form.discount_type === "percent" ? "e.g. 50" : "e.g. 200"}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="promo-max-discount">Maximum {form.discount_type === "percent" ? "%" : "MUR"}</Label>
                  <Input
                    id="promo-max-discount"
                    type="number"
                    min={0}
                    max={form.discount_type === "percent" ? 100 : undefined}
                    value={form.max_discount_value}
                    onChange={(e) => setForm((f) => ({ ...f, max_discount_value: e.target.value }))}
                    placeholder={form.discount_type === "percent" ? "e.g. 70" : "e.g. 500"}
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">Leave both blank for no discount filter. Min only = &quot;50% off or better&quot;; both = a band.</p>
            </div>

            <div className="grid gap-2">
              <Label>Show on screens</Label>
              <div className="flex flex-wrap gap-2">
                {SCREEN_OPTIONS.map((s) => {
                  const checked = form.screens.includes(s.key);
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          screens: checked ? f.screens.filter((k) => k !== s.key) : [...f.screens, s.key],
                        }))
                      }
                      className={`h-9 rounded-xl px-4 text-[13px] font-medium transition ${checked ? "bg-[#5800AB] text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500">Pick one or more screens. A card can appear on multiple screens at once.</p>
            </div>

            <BannerUploadField
              value={form.banner_image_url}
              uploadedValue={bannerUploadUrl}
              onUpload={(v) => { setBannerUploadUrl(v); setForm((f) => ({ ...f, banner_image_url: "" })); }}
              onClearUpload={() => setBannerUploadUrl("")}
              onUrlChange={(v) => { setBannerUploadUrl(""); setForm((f) => ({ ...f, banner_image_url: v })); }}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="promo-sort-order">Sort order</Label>
                <Input id="promo-sort-order" type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="promo-starts-at">Starts at</Label>
                <Input id="promo-starts-at" type="datetime-local" value={form.starts_at} onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="promo-ends-at">Ends at</Label>
                <Input id="promo-ends-at" type="datetime-local" value={form.ends_at} onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Card active</p>
                <p className="text-xs text-slate-500">Toggle visibility in the app without deleting it.</p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={(checked) => setForm((f) => ({ ...f, is_active: checked }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={() => void save()} disabled={saving} className="bg-[#5800AB] text-white hover:bg-[#4a0090]">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editing ? "Save changes" : "Create card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this promotional card?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the card.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); void remove(); }} disabled={saving} className="bg-red-600 text-white hover:bg-red-700">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

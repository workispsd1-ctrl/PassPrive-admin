"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Pencil, Plus, RefreshCw, Search, Tags, Trash2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showToast } from "@/hooks/useToast";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

type MoodCategoryRecord = {
  id: string;
  key: string;
  slug: string;
  title: string;
  light_theme_image_url?: string | null;
  light_theme_image_path?: string | null;
  dark_theme_image_url?: string | null;
  dark_theme_image_path?: string | null;
  updated_at?: string;
  sort_order?: number;
};

type MoodCategoryForm = {
  title: string;
  light_theme_image_url: string;
  light_theme_image_path: string;
  dark_theme_image_url: string;
  dark_theme_image_path: string;
  sort_order: number;
};

const initialForm: MoodCategoryForm = {
  title: "",
  light_theme_image_url: "",
  light_theme_image_path: "",
  dark_theme_image_url: "",
  dark_theme_image_path: "",
  sort_order: 100,
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function keyify(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function extractErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

type Props = {
  title: string;
  description: string;
  apiPath: string;
  supabaseTable?: string;
  storageBucket?: string;
  storageFolder?: string;
};

function buildStoragePath(folder: string, fileName: string) {
  const extension = fileName.split(".").pop() || "jpg";
  const random = Math.random().toString(36).slice(2, 9);
  return `${folder}/${Date.now()}-${random}.${extension}`;
}

export default function MoodCategoryManager({
  title,
  description,
  apiPath,
  supabaseTable,
  storageBucket,
  storageFolder = "mood-categories",
}: Props) {
  const [categories, setCategories] = useState<MoodCategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<MoodCategoryForm>(initialForm);

  const [lightFile, setLightFile] = useState<File | null>(null);
  const [darkFile, setDarkFile] = useState<File | null>(null);
  const [lightPreview, setLightPreview] = useState("");
  const [darkPreview, setDarkPreview] = useState("");
  const [removeLight, setRemoveLight] = useState(false);
  const [removeDark, setRemoveDark] = useState(false);

  const lightRef = useRef<HTMLInputElement | null>(null);
  const darkRef = useRef<HTMLInputElement | null>(null);

  const filteredCategories = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return categories;
    return categories.filter((category) =>
      [category.title, category.key, category.slug].join(" ").toLowerCase().includes(search)
    );
  }, [categories, query]);

  function isServiceCategoriesRoute(path: string) {
    return String(path || "").trim() === "/api/service-categories";
  }

  async function getAccessToken() {
    const { data, error } = await supabaseBrowser.auth.getSession();
    if (error) throw error;
    const token = data.session?.access_token;
    if (!token) throw new Error("Not logged in. Please login as admin/superadmin.");
    return token;
  }

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      if (supabaseTable) {
        const { data, error } = await supabaseBrowser
          .from(supabaseTable)
          .select("id,key,slug,title,light_theme_image_url,light_theme_image_path,dark_theme_image_url,dark_theme_image_path,updated_at,sort_order")
          .order("sort_order", { ascending: true });
        if (error) throw error;
        setCategories((data as MoodCategoryRecord[] | null) || []);
        return;
      }

      const url = isServiceCategoriesRoute(apiPath) ? apiPath : `${API_BASE}${apiPath}`;
      const response = await fetch(url, { method: "GET", cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load categories.");
      const payload = (await response.json()) as MoodCategoryRecord[] | { items?: MoodCategoryRecord[] };
      setCategories(Array.isArray(payload) ? payload : payload.items || []);
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: `Failed to load ${title.toLowerCase()}`,
        description: extractErrorMessage(error, "Unable to fetch categories."),
      });
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [apiPath, supabaseTable, title]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    return () => {
      if (lightPreview.startsWith("blob:")) URL.revokeObjectURL(lightPreview);
      if (darkPreview.startsWith("blob:")) URL.revokeObjectURL(darkPreview);
    };
  }, [darkPreview, lightPreview]);

  function resetForm() {
    if (lightPreview.startsWith("blob:")) URL.revokeObjectURL(lightPreview);
    if (darkPreview.startsWith("blob:")) URL.revokeObjectURL(darkPreview);
    setEditingId(null);
    setForm(initialForm);
    setLightFile(null);
    setDarkFile(null);
    setLightPreview("");
    setDarkPreview("");
    setRemoveLight(false);
    setRemoveDark(false);
    if (lightRef.current) lightRef.current.value = "";
    if (darkRef.current) darkRef.current.value = "";
  }

  function populateForm(category: MoodCategoryRecord) {
    setEditingId(category.id);
    setForm({
      title: category.title || "",
      light_theme_image_url: category.light_theme_image_url || "",
      light_theme_image_path: category.light_theme_image_path || "",
      dark_theme_image_url: category.dark_theme_image_url || "",
      dark_theme_image_path: category.dark_theme_image_path || "",
      sort_order: category.sort_order || 100,
    });
    setLightFile(null);
    setDarkFile(null);
    setLightPreview(category.light_theme_image_url || "");
    setDarkPreview(category.dark_theme_image_url || "");
    setRemoveLight(false);
    setRemoveDark(false);
    if (lightRef.current) lightRef.current.value = "";
    if (darkRef.current) darkRef.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handlePick(event: ChangeEvent<HTMLInputElement>, variant: "light" | "dark") {
    const file = event.target.files?.[0] || null;
    if (variant === "light") {
      setLightFile(file);
      setRemoveLight(false);
      if (lightPreview.startsWith("blob:")) URL.revokeObjectURL(lightPreview);
      setLightPreview(file ? URL.createObjectURL(file) : form.light_theme_image_url || "");
      return;
    }
    setDarkFile(file);
    setRemoveDark(false);
    if (darkPreview.startsWith("blob:")) URL.revokeObjectURL(darkPreview);
    setDarkPreview(file ? URL.createObjectURL(file) : form.dark_theme_image_url || "");
  }

  function clearVariant(variant: "light" | "dark") {
    if (variant === "light") {
      if (lightPreview.startsWith("blob:")) URL.revokeObjectURL(lightPreview);
      setLightFile(null);
      setLightPreview("");
      setRemoveLight(true);
      setForm((current) => ({ ...current, light_theme_image_url: "", light_theme_image_path: "" }));
      if (lightRef.current) lightRef.current.value = "";
      return;
    }
    if (darkPreview.startsWith("blob:")) URL.revokeObjectURL(darkPreview);
    setDarkFile(null);
    setDarkPreview("");
    setRemoveDark(true);
    setForm((current) => ({ ...current, dark_theme_image_url: "", dark_theme_image_path: "" }));
    if (darkRef.current) darkRef.current.value = "";
  }

  async function saveCategory() {
    if (!form.title.trim()) {
      showToast({ type: "error", title: "Title is required." });
      return;
    }

    try {
      setSaving(true);
      if (!supabaseTable) {
        throw new Error("This screen currently requires Supabase table binding.");
      }

      let nextLightUrl = form.light_theme_image_url || null;
      let nextLightPath = form.light_theme_image_path || null;
      let nextDarkUrl = form.dark_theme_image_url || null;
      let nextDarkPath = form.dark_theme_image_path || null;

      if (storageBucket && removeLight && form.light_theme_image_path) {
        await supabaseBrowser.storage.from(storageBucket).remove([form.light_theme_image_path]);
        nextLightUrl = null;
        nextLightPath = null;
      }
      if (storageBucket && removeDark && form.dark_theme_image_path) {
        await supabaseBrowser.storage.from(storageBucket).remove([form.dark_theme_image_path]);
        nextDarkUrl = null;
        nextDarkPath = null;
      }

      if (storageBucket && lightFile) {
        const path = buildStoragePath(storageFolder, lightFile.name);
        const { error: uploadError } = await supabaseBrowser.storage.from(storageBucket).upload(path, lightFile);
        if (uploadError) throw uploadError;
        const { data } = supabaseBrowser.storage.from(storageBucket).getPublicUrl(path);
        nextLightUrl = data.publicUrl;
        nextLightPath = path;
      }

      if (storageBucket && darkFile) {
        const path = buildStoragePath(storageFolder, darkFile.name);
        const { error: uploadError } = await supabaseBrowser.storage.from(storageBucket).upload(path, darkFile);
        if (uploadError) throw uploadError;
        const { data } = supabaseBrowser.storage.from(storageBucket).getPublicUrl(path);
        nextDarkUrl = data.publicUrl;
        nextDarkPath = path;
      }

      const record = {
        key: keyify(form.title),
        slug: slugify(form.title),
        title: form.title.trim(),
        light_theme_image_url: nextLightUrl,
        light_theme_image_path: nextLightPath,
        dark_theme_image_url: nextDarkUrl,
        dark_theme_image_path: nextDarkPath,
        sort_order: Number(form.sort_order ?? 100),
        is_active: true,
        selection_type: "MULTI" as const,
      };

      if (isServiceCategoriesRoute(apiPath)) {
        // Call server-side API (uses service role) to bypass RLS
        const token = await getAccessToken();
        const url = editingId ? `${apiPath}/${editingId}` : apiPath;
        const res = await fetch(url, {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(record),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Save failed");
      } else {
        if (editingId) {
          const { error } = await supabaseBrowser.from(supabaseTable).update(record).eq("id", editingId);
          if (error) throw error;
        } else {
          const { error } = await supabaseBrowser.from(supabaseTable).insert(record);
          if (error) throw error;
        }
      }

      showToast({ title: editingId ? "Category updated" : "Category created" });
      await loadCategories();
      resetForm();
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: "Failed to save category",
        description: extractErrorMessage(error, "Save operation failed."),
      });
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(id: string) {
    const category = categories.find((item) => item.id === id);
    if (!category) return;
    if (!window.confirm(`Delete "${category.title}"?`)) return;

    try {
      setDeletingId(id);
      if (isServiceCategoriesRoute(apiPath)) {
        const token = await getAccessToken();
        const res = await fetch(`${apiPath}/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Delete failed");
      } else {
        if (!supabaseTable) throw new Error("Delete unsupported for this route.");
        if (storageBucket && category.light_theme_image_path) {
          await supabaseBrowser.storage.from(storageBucket).remove([category.light_theme_image_path]).catch(() => undefined);
        }
        if (storageBucket && category.dark_theme_image_path) {
          await supabaseBrowser.storage.from(storageBucket).remove([category.dark_theme_image_path]).catch(() => undefined);
        }
        const { error } = await supabaseBrowser.from(supabaseTable).delete().eq("id", id);
        if (error) throw error;
      }
      if (editingId === id) resetForm();
      setCategories((current) => current.filter((item) => item.id !== id));
      showToast({ title: "Category deleted" });
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: "Failed to delete category",
        description: extractErrorMessage(error, "Delete operation failed."),
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-full bg-white">
      <div className="mx-auto max-w-full space-y-8 px-0 pt-2 pb-8">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "Total Categories", value: categories.length },
            { label: "Editing", value: categories.length },
            { label: "Image Source", value: categories.filter(c => c.light_theme_image_url || c.dark_theme_image_url).length },
          ].map((metric) => (
            <div
              key={metric.label}
              className="flex h-[90px] w-full flex-col justify-center rounded-[16px] border border-slate-200/50 bg-white px-5 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] border-l-4 border-l-[#5800AB] border-y-0 border-r-0"
            >
              <span className="text-[13px] font-semibold text-slate-500 font-['Be_Vietnam_Pro',sans-serif] tracking-[0px]">
                {metric.label}
              </span>
              <span className="mt-1.5 text-[22px] font-bold text-slate-900 font-['Be_Vietnam_Pro',sans-serif] leading-none">
                {loading ? "—" : metric.value}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card className="md:col-span-2 rounded-[16px] border border-slate-200/60 shadow-[0_2px_12px_rgba(15,23,42,0.04)] bg-white p-5 flex flex-col gap-5 h-fit">
            <div>
              <h2 className="text-[20px] font-semibold text-[#000000] font-['Be_Vietnam_Pro',sans-serif] leading-7 tracking-[0px]">
                {editingId ? "Edit category" : "New category"}
              </h2>
              <p className="mt-1 text-[14px] text-slate-500 font-['Be_Vietnam_Pro',sans-serif] leading-5">
                {editingId ? "Edit category details and upload cover assets." : "Only the essentials are editable. Key and slug are generated automatically."}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="title"
                  className="text-[16px] font-medium text-black font-['Be_Vietnam_Pro',sans-serif] tracking-[0.5px] leading-5"
                >
                  Title
                </Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Weekend unwind"
                  className="h-[44px] rounded-[12px] border border-slate-200 bg-white font-['Be_Vietnam_Pro',sans-serif] text-[14px] text-black placeholder:text-[#938F96] p-3 focus-visible:ring-1 focus-visible:ring-[#5800AB]"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="sort_order"
                  className="text-[16px] font-medium text-black font-['Be_Vietnam_Pro',sans-serif] tracking-[0.5px] leading-5"
                >
                  Sort order
                </Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={form.sort_order}
                  onChange={(event) => setForm((current) => ({ ...current, sort_order: Number(event.target.value) }))}
                  placeholder="100"
                  className="h-[44px] rounded-[12px] border border-slate-200 bg-white font-['Be_Vietnam_Pro',sans-serif] text-[14px] text-black placeholder:text-[#938F96] p-3 focus-visible:ring-1 focus-visible:ring-[#5800AB]"
                />
              </div>

              {[
                {
                  key: "light",
                  label: "Light Theme Image",
                  preview: lightPreview,
                  pick: () => lightRef.current?.click(),
                  clear: () => clearVariant("light"),
                  ref: lightRef,
                  change: (event: ChangeEvent<HTMLInputElement>) => handlePick(event, "light"),
                },
                {
                  key: "dark",
                  label: "Dark Theme Image",
                  preview: darkPreview,
                  pick: () => darkRef.current?.click(),
                  clear: () => clearVariant("dark"),
                  ref: darkRef,
                  change: (event: ChangeEvent<HTMLInputElement>) => handlePick(event, "dark"),
                },
              ].map((item) => (
                <div key={item.key} className="space-y-2">
                  <Label className="text-[16px] font-medium text-black font-['Be_Vietnam_Pro',sans-serif] tracking-[0.5px] leading-5">
                    {item.label}
                  </Label>
                  <div className="overflow-hidden rounded-[12px] border-2 border-dashed border-[#CAC5CD] bg-[#F8FAFC] h-[192px] flex flex-col items-center justify-center gap-3 relative p-4">
                    {item.preview ? (
                      <>
                        <div className="relative h-full w-full bg-white rounded-[10px] overflow-hidden">
                          <Image src={item.preview} alt={item.label} fill className="object-contain p-2" unoptimized />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/65 hover:bg-black/85 text-white p-0 flex items-center justify-center"
                          onClick={item.clear}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="text-[14px] text-[#938F96] font-['Be_Vietnam_Pro',sans-serif] leading-5">Preview unavailable</span>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 rounded-xl border-slate-200 bg-white font-['Be_Vietnam_Pro',sans-serif] text-[16px] font-medium tracking-[0.5px] text-black hover:bg-slate-50 flex items-center gap-1.5 shadow-sm px-4"
                          onClick={item.pick}
                        >
                          <Upload className="h-4 w-4 text-black" />
                          Upload image
                        </Button>
                      </>
                    )}
                  </div>
                  <input ref={item.ref} type="file" accept="image/*" className="hidden" onChange={item.change} />
                </div>
              ))}

              <div className="flex items-center gap-[12px] pt-2 border-t border-slate-100">
                <Button
                  onClick={() => void saveCategory()}
                  disabled={saving}
                  className="flex-1 h-[40px] rounded-[12px] bg-[#5800AB] text-white hover:bg-[#4a0090] font-['Be_Vietnam_Pro',sans-serif] text-[16px] font-medium tracking-[0.5px] leading-5 shadow-[0_4px_4px_rgba(0,0,0,0.25)] transition-all"
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin animate-spin" /> : null}
                  {editingId ? "Save changes" : "Create category"}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetForm}
                  disabled={saving}
                  className="h-[40px] w-[70px] shrink-0 rounded-[12px] border-[0.5px] border-[#CAC5CD] bg-white font-['Be_Vietnam_Pro',sans-serif] text-[16px] font-medium tracking-[0.5px] leading-5 text-black hover:bg-slate-50 p-0 flex items-center justify-center transition-all"
                >
                  Reset
                </Button>
              </div>
            </div>
          </Card>

          <div className="rounded-[16px] border border-[#E5E7EB] bg-white p-[16px] flex flex-col gap-[16px] shadow-sm md:col-span-3">
            <div className="flex flex-col gap-[16px] border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-[20px] font-semibold text-[#000000] font-['Be_Vietnam_Pro',sans-serif] leading-[28px] tracking-[0px]">
                  Category list
                </h2>
                <p className="mt-1 text-[14px] text-[#AEA9B1] font-['Be_Vietnam_Pro',sans-serif] leading-[20px]">
                  Search, review, and update existing categories.
                </p>
              </div>
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-[16px] top-1/2 h-4 w-4 -translate-y-1/2 text-[#938F96]" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by title, key, or slug.."
                  className="pl-[44px] pr-[16px] h-[40px] w-full rounded-[12px] border border-[#938F96]/40 bg-white font-['Be_Vietnam_Pro',sans-serif] text-[14px] text-black placeholder:text-[#AEA9B1] focus-visible:ring-1 focus-visible:ring-[#5800AB] focus-visible:border-[#5800AB] transition-colors"
                />
              </div>
            </div>

            <div className="space-y-[16px]">
              {loading ? (
                <div className="flex h-48 items-center justify-center text-slate-500 font-['Be_Vietnam_Pro',sans-serif]">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#5800AB]" />
                  Loading categories...
                </div>
              ) : filteredCategories.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-['Be_Vietnam_Pro',sans-serif] text-sm">No categories found.</div>
              ) : (
                <div className="space-y-[16px]">
                  {filteredCategories.map((category) => (
                    <div
                      key={category.id}
                      className="h-[124px] w-full rounded-[16px] border border-[#E5E7EB] bg-white p-[16px] flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center justify-between w-full h-full min-w-0">
                        <div className="flex items-center gap-[16px] min-w-0 flex-1 h-full">
                          <div className="relative h-[56px] w-[56px] shrink-0 overflow-hidden rounded-[10px] border border-slate-200 bg-slate-50">
                            {category.light_theme_image_url ? (
                              <Image
                                src={category.light_theme_image_url}
                                alt={category.title}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-400">
                                <Tags className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-col justify-center gap-[4px] min-w-0 h-full">
                            <div className="flex items-center gap-[8px]">
                              <p className="truncate text-[18px] font-medium text-black font-['Be_Vietnam_Pro',sans-serif] leading-[28px] tracking-[0px]">{category.title}</p>
                              <span className="rounded-full bg-[#5800AB]/15 px-[6px] py-[1px] text-[12px] font-medium text-[#5800AB] font-['Be_Vietnam_Pro',sans-serif] leading-[16px] tracking-[0px] shrink-0">
                                Sort {category.sort_order ?? 100}
                              </span>
                            </div>
                            <div className="space-y-[2px] font-['Be_Vietnam_Pro',sans-serif] leading-[20px]">
                              <p className="text-[14px] font-medium text-[#AEA9B1] tracking-[0.25px]">
                                Key: <span className="font-medium text-[#AEA9B1]">{category.key}</span>
                              </p>
                              <p className="text-[14px] font-normal text-[#AEA9B1] tracking-[0.25px]">
                                Updated: {formatDate(category.updated_at)}
                              </p>
                              <p className="text-[14px] font-normal text-[#938F96] tracking-[0.25px] truncate">
                                ID: {category.id}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-[10px]">
                          <Button
                            variant="outline"
                            className="h-[36px] w-[80.73px] rounded-[12px] border border-[#CAC5CD] bg-white px-[12px] py-[8px] font-['Be_Vietnam_Pro',sans-serif] text-[16px] font-medium tracking-[0px] text-black shadow-[0_4px_4px_rgba(0,0,0,0.25)] hover:bg-[#000000]/[0.04] transition-colors flex items-center justify-center gap-[4px] border-solid"
                            onClick={() => populateForm(category)}
                          >
                            <Pencil className="h-4 w-4 text-black shrink-0" />
                            <span>Edit</span>
                          </Button>
                          <Button
                            variant="outline"
                            className="h-[36px] w-[92px] rounded-[12px] border border-[#CAC5CD] bg-white px-[12px] py-[8px] font-['Be_Vietnam_Pro',sans-serif] text-[16px] font-medium tracking-[0px] text-red-600 shadow-[0_4px_4px_rgba(0,0,0,0.25)] hover:bg-red-50 transition-colors flex items-center justify-center gap-[4px] border-solid"
                            onClick={() => void deleteCategory(category.id)}
                            disabled={deletingId === category.id}
                          >
                            {deletingId === category.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-red-600 shrink-0" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-red-600 shrink-0" />
                            )}
                            <span>Delete</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

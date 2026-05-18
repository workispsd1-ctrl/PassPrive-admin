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
};

type MoodCategoryForm = {
  title: string;
  light_theme_image_url: string;
  light_theme_image_path: string;
  dark_theme_image_url: string;
  dark_theme_image_path: string;
};

const initialForm: MoodCategoryForm = {
  title: "",
  light_theme_image_url: "",
  light_theme_image_path: "",
  dark_theme_image_url: "",
  dark_theme_image_path: "",
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

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      if (supabaseTable) {
        const { data, error } = await supabaseBrowser
          .from(supabaseTable)
          .select("id,key,slug,title,light_theme_image_url,light_theme_image_path,dark_theme_image_url,dark_theme_image_path,updated_at")
          .order("title", { ascending: true });
        if (error) throw error;
        setCategories((data as MoodCategoryRecord[] | null) || []);
        return;
      }

      const response = await fetch(`${API_BASE}${apiPath}`, { method: "GET", cache: "no-store" });
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
        sort_order: 100,
        is_active: true,
        selection_type: "MULTI" as const,
      };

      if (editingId) {
        const { error } = await supabaseBrowser.from(supabaseTable).update(record).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabaseBrowser.from(supabaseTable).insert(record);
        if (error) throw error;
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
      if (!supabaseTable) throw new Error("Delete unsupported for this route.");
      if (storageBucket && category.light_theme_image_path) {
        await supabaseBrowser.storage.from(storageBucket).remove([category.light_theme_image_path]).catch(() => undefined);
      }
      if (storageBucket && category.dark_theme_image_path) {
        await supabaseBrowser.storage.from(storageBucket).remove([category.dark_theme_image_path]).catch(() => undefined);
      }
      const { error } = await supabaseBrowser.from(supabaseTable).delete().eq("id", id);
      if (error) throw error;
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
    <div className="min-h-full bg-[linear-gradient(135deg,_#ECFEFF_0%,_#F3E8FF_100%)]">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <Card className="border border-slate-200 bg-white">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void loadCategories()} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              New category
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? "Edit category" : "New category"}</CardTitle>
              <CardDescription>Only title + light image + dark image.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Weekend unwind"
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
                  <Label>{item.label}</Label>
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    {item.preview ? (
                      <div className="relative aspect-[16/9] w-full">
                        <Image src={item.preview} alt={item.label} fill className="object-contain p-2" unoptimized />
                      </div>
                    ) : (
                      <div className="flex aspect-[16/9] items-center justify-center text-sm text-slate-400">Preview unavailable</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={item.pick}>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                    </Button>
                    {item.preview ? (
                      <Button type="button" variant="ghost" onClick={item.clear}>
                        <X className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    ) : null}
                  </div>
                  <input ref={item.ref} type="file" accept="image/*" className="hidden" onChange={item.change} />
                </div>
              ))}

              <div className="flex gap-2">
                <Button onClick={() => void saveCategory()} disabled={saving} className="flex-1">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {editingId ? "Save changes" : "Create category"}
                </Button>
                <Button variant="outline" onClick={resetForm} disabled={saving}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>Category list</CardTitle>
                  <CardDescription>Search and manage categories.</CardDescription>
                </div>
                <div className="relative w-full lg:max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title, key, or slug" className="pl-9" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex h-48 items-center justify-center text-slate-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading categories...
                </div>
              ) : filteredCategories.length === 0 ? (
                <div className="py-12 text-center text-slate-500">No categories found.</div>
              ) : (
                <div className="space-y-3">
                  {filteredCategories.map((category) => (
                    <div key={category.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-slate-900">{category.title}</p>
                          <p className="mt-1 font-mono text-xs text-slate-600">{category.slug}</p>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span>Key: {category.key}</span>
                            <span>Updated: {formatDate(category.updated_at)}</span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-3 max-w-md">
                            <div className="rounded-lg border border-slate-200 bg-white p-2">
                              <p className="mb-1 text-[11px] text-slate-500">Light</p>
                              <div className="relative h-14 w-full overflow-hidden rounded bg-slate-50">
                                {category.light_theme_image_url ? (
                                  <Image src={category.light_theme_image_url} alt={`${category.title} light`} fill className="object-contain p-1" unoptimized />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-slate-400"><Tags className="h-3.5 w-3.5" /></div>
                                )}
                              </div>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white p-2">
                              <p className="mb-1 text-[11px] text-slate-500">Dark</p>
                              <div className="relative h-14 w-full overflow-hidden rounded bg-slate-50">
                                {category.dark_theme_image_url ? (
                                  <Image src={category.dark_theme_image_url} alt={`${category.title} dark`} fill className="object-contain p-1" unoptimized />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-slate-400"><Tags className="h-3.5 w-3.5" /></div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <Button variant={editingId === category.id ? "default" : "outline"} onClick={() => populateForm(category)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {editingId === category.id ? "Editing" : "Edit"}
                          </Button>
                          <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => void deleteCategory(category.id)} disabled={deletingId === category.id}>
                            {deletingId === category.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
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
    </div>
  );
}

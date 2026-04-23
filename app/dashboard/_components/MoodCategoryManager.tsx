"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowUpDown,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Tags,
  Trash2,
  Upload,
  X,
} from "lucide-react";

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
  image_url?: string | null;
  image_path?: string | null;
  sort_order: number;
  updated_at?: string;
};

type MoodCategoryForm = {
  title: string;
  image_url: string;
  image_path: string;
  sort_order: string;
};

const initialForm: MoodCategoryForm = {
  title: "",
  image_url: "",
  image_path: "",
  sort_order: "100",
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

function extractCategory(payload: unknown): MoodCategoryRecord | null {
  if (!payload || typeof payload !== "object") return null;
  if ("id" in (payload as Record<string, unknown>)) return payload as MoodCategoryRecord;

  const recordPayload = payload as Record<string, unknown>;
  const possibleKeys = ["data", "item", "category", "moodCategory"];
  for (const key of possibleKeys) {
    const value = recordPayload[key];
    if (value && typeof value === "object" && "id" in (value as Record<string, unknown>)) {
      return value as MoodCategoryRecord;
    }
  }

  return null;
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json();
  return response.text();
}

async function getErrorFromResponse(response: Response, fallback: string) {
  const payload = await parseResponse(response).catch(() => null);

  if (typeof payload === "string" && payload.trim()) return payload;

  if (payload && typeof payload === "object") {
    const recordPayload = payload as Record<string, unknown>;
    const possibleKeys = ["message", "error", "detail"];
    for (const key of possibleKeys) {
      const value = recordPayload[key];
      if (typeof value === "string" && value.trim()) return value;
    }
  }

  return fallback;
}

function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
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
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<MoodCategoryForm>(initialForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [removeImage, setRemoveImage] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

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
          .select("id,key,slug,title,image_url,image_path,sort_order,updated_at")
          .order("sort_order", { ascending: true });

        if (error) {
          throw error;
        }

        setCategories((data as MoodCategoryRecord[] | null) || []);
        return;
      }

      const response = await fetch(`${API_BASE}${apiPath}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(await getErrorFromResponse(response, `Failed to load ${title.toLowerCase()}.`));
      }

      const payload = await parseResponse(response);
      setCategories(extractCategoryList(payload));
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: `Failed to load ${title.toLowerCase()}`,
        description: extractErrorMessage(error, "Unable to fetch categories from backend."),
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
      if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const totalCategories = categories.length;
  const hasActiveEdit = Boolean(editingId);
  const currentImageState = imageFile ? "Local upload" : form.image_url ? "Uploaded image" : "Not set";

  function resetForm() {
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setEditingId(null);
    setForm(initialForm);
    setImageFile(null);
    setImagePreview("");
    setRemoveImage(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function populateForm(category: MoodCategoryRecord) {
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setEditingId(category.id);
    setForm({
      title: category.title || "",
      image_url: category.image_url || "",
      image_path: category.image_path || "",
      sort_order: String(category.sort_order ?? 100),
    });
    setImageFile(null);
    setImagePreview(category.image_url || "");
    setRemoveImage(false);
    if (fileRef.current) fileRef.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function startEdit(id: string) {
    const listCategory = categories.find((item) => item.id === id);
    if (listCategory) populateForm(listCategory);

    try {
      setLoadingEditId(id);
      if (supabaseTable) {
        const { data, error } = await supabaseBrowser
          .from(supabaseTable)
          .select("id,key,slug,title,image_url,image_path,sort_order,updated_at")
          .eq("id", id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error("Category not found.");
        }

        populateForm(data as MoodCategoryRecord);
        return;
      }

      const response = await fetch(`${API_BASE}${apiPath}/${id}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(await getErrorFromResponse(response, "Failed to load category details."));
      }

      const payload = await parseResponse(response);
      const category = extractCategory(payload);
      if (!category) throw new Error("Category payload is invalid.");
      populateForm(category);
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: "Failed to load category details",
        description: extractErrorMessage(error, "Could not load the selected category."),
      });
    } finally {
      setLoadingEditId(null);
    }
  }

  function handleImagePick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setImageFile(file);
    setRemoveImage(false);
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    if (!file) {
      setImagePreview(form.image_url || "");
      return;
    }
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview("");
    setRemoveImage(true);
    setForm((current) => ({ ...current, image_url: "", image_path: "" }));
    if (fileRef.current) fileRef.current.value = "";
  }

  function validateForm() {
    if (!form.title.trim()) return "Title is required.";
    const sortOrder = Number(form.sort_order);
    if (!Number.isFinite(sortOrder)) return "Sort order must be a valid number.";
    if (!keyify(form.title)) return "Title must contain letters or numbers to generate a key.";
    if (!slugify(form.title)) return "Title must contain letters or numbers to generate a slug.";
    return null;
  }

  async function saveCategory() {
    const validationError = validateForm();
    if (validationError) {
      showToast({ type: "error", title: validationError });
      return;
    }

    const payload = {
      key: keyify(form.title),
      slug: slugify(form.title),
      title: form.title.trim(),
      subtitle: null,
      description: null,
      badge_text: null,
      image_url: form.image_url.trim() || null,
      image_path: form.image_path.trim() || null,
      sort_order: Number(form.sort_order || 100),
      is_active: true,
      selection_type: "MULTI" as const,
      metadata: {},
      remove_image: removeImage,
    };

    try {
      setSaving(true);
      if (supabaseTable) {
        let nextImageUrl = payload.image_url;
        let nextImagePath = payload.image_path;

        if (storageBucket && removeImage && form.image_path) {
          const { error: removeError } = await supabaseBrowser.storage
            .from(storageBucket)
            .remove([form.image_path]);
          if (removeError) {
            throw removeError;
          }
          nextImageUrl = null;
          nextImagePath = null;
        }

        if (storageBucket && imageFile) {
          const path = buildStoragePath(storageFolder, imageFile.name);
          const { error: uploadError } = await supabaseBrowser.storage
            .from(storageBucket)
            .upload(path, imageFile);
          if (uploadError) {
            throw uploadError;
          }

          const { data } = supabaseBrowser.storage.from(storageBucket).getPublicUrl(path);
          nextImageUrl = data.publicUrl;
          nextImagePath = path;

          if (editingId && form.image_path && form.image_path !== path) {
            await supabaseBrowser.storage.from(storageBucket).remove([form.image_path]).catch(() => undefined);
          }
        }

        const record = {
          key: payload.key,
          slug: payload.slug,
          title: payload.title,
          subtitle: payload.subtitle,
          description: payload.description,
          badge_text: payload.badge_text,
          image_url: nextImageUrl,
          image_path: nextImagePath,
          sort_order: payload.sort_order,
          is_active: payload.is_active,
          selection_type: payload.selection_type,
          metadata: payload.metadata,
        };

        if (editingId) {
          const { error } = await supabaseBrowser.from(supabaseTable).update(record).eq("id", editingId);
          if (error) {
            throw error;
          }
        } else {
          const { error } = await supabaseBrowser.from(supabaseTable).insert(record);
          if (error) {
            throw error;
          }
        }

        showToast({ title: editingId ? "Category updated" : "Category created" });
        await loadCategories();
        resetForm();
        return;
      }

      const method = editingId ? "PUT" : "POST";
      const endpoint = editingId ? `${API_BASE}${apiPath}/${editingId}` : `${API_BASE}${apiPath}`;

      let response: Response;
      if (imageFile) {
        const formData = new FormData();
        formData.append("key", payload.key);
        formData.append("slug", payload.slug);
        formData.append("title", payload.title);
        formData.append("image_url", payload.image_url ?? "");
        formData.append("sort_order", String(payload.sort_order));
        formData.append("remove_image", String(payload.remove_image));
        formData.append("image", imageFile);

        response = await fetch(endpoint, {
          method,
          body: formData,
        });
      } else {
        response = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        throw new Error(await getErrorFromResponse(response, "Failed to save category."));
      }

      showToast({ title: editingId ? "Category updated" : "Category created" });
      await loadCategories();
      resetForm();
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: "Failed to save category",
        description: extractErrorMessage(error, "Please verify the backend route payload handling."),
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
      if (supabaseTable) {
        if (storageBucket && category.image_path) {
          await supabaseBrowser.storage.from(storageBucket).remove([category.image_path]).catch(() => undefined);
        }

        const { error } = await supabaseBrowser.from(supabaseTable).delete().eq("id", id);
        if (error) {
          throw error;
        }

        if (editingId === id) resetForm();
        setCategories((current) => current.filter((item) => item.id !== id));
        showToast({ title: "Category deleted" });
        return;
      }

      const response = await fetch(`${API_BASE}${apiPath}/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await getErrorFromResponse(response, "Failed to delete category."));
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
    <div className="min-h-full bg-[linear-gradient(135deg,_#ECFEFF_0%,_#F3E8FF_100%)]">
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
        <Card
          className="mt-2 overflow-hidden rounded-[18px] border border-slate-200/70 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-sm"
          style={{
            background:
              "linear-gradient(310.35deg, rgba(255, 255, 255, 0.42) 4.07%, rgba(255, 255, 255, 0.32) 48.73%, rgba(255, 255, 255, 0.22) 100%)",
          }}
        >
          <CardContent className="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
            <div className="space-y-2">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => void loadCategories()}
                  disabled={loading}
                  className="h-11 rounded-2xl border-slate-200 bg-white px-5 text-sm shadow-sm sm:min-w-36"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button
                  onClick={resetForm}
                  className="h-11 rounded-2xl bg-[#5800AB] px-5 text-sm text-white shadow-[0_10px_20px_rgba(88,0,171,0.25)] hover:bg-[#4a0090] sm:min-w-40"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New category
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: "Total categories", value: totalCategories },
                { label: "Editing", value: hasActiveEdit ? form.title || "Draft" : "None" },
                { label: "Image source", value: currentImageState },
              ].map((card) => (
                <Card key={card.label} className="border-white/70 bg-white/80 shadow-sm backdrop-blur">
                  <CardContent className="p-4">
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{card.label}</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="mt-2 grid gap-7 xl:grid-cols-[380px_minmax(0,1fr)]">
          <Card className="h-fit border-slate-200/90 bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100 px-5 pb-5 pt-5 sm:px-6">
              <CardTitle className="text-lg tracking-tight">{editingId ? "Edit category" : "New category"}</CardTitle>
              <CardDescription className="max-w-xl leading-6">Only the essentials are editable. Key and slug are generated automatically.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-7 px-5 py-6 sm:px-6 sm:py-7">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Weekend unwind"
                  className="h-11 border-slate-300 bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sort_order">Sort order</Label>
                <div className="relative">
                  <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="sort_order"
                    type="number"
                    value={form.sort_order}
                    onChange={(event) => setForm((current) => ({ ...current, sort_order: event.target.value }))}
                    className="h-11 border-slate-300 bg-white pl-9"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">Category image</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Upload the image shown on the category card.</p>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  {imagePreview ? (
                    <div className="relative aspect-[4/3] w-full">
                      <Image
                        src={imagePreview}
                        alt={`${title} preview`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center text-sm text-slate-400">
                      Preview unavailable
                    </div>
                  )}
                </div>

                <div className="grid gap-3">
                  <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="h-11 justify-start rounded-2xl border-slate-300 bg-white px-4 shadow-sm">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload image
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImagePick}
                  />
                  {(imagePreview || form.image_url) ? (
                    <Button type="button" variant="ghost" onClick={clearImage} className="h-10 justify-start rounded-2xl px-4 text-slate-600">
                      <X className="mr-2 h-4 w-4" />
                      Remove image
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
                <Button
                  className="h-11 flex-1 rounded-2xl bg-[#5800AB] px-5 text-white shadow-[0_10px_20px_rgba(88,0,171,0.25)] hover:bg-[#4a0090]"
                  onClick={() => void saveCategory()}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {editingId ? "Save changes" : "Create category"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} disabled={saving} className="h-11 rounded-2xl border-slate-300 bg-white px-5 shadow-sm sm:w-32">
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/90 bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100 px-5 pb-5 pt-5 sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
                <div>
                  <CardTitle className="text-lg tracking-tight">Category list</CardTitle>
                  <CardDescription className="max-w-xl leading-6">Search, review, and update existing categories.</CardDescription>
                </div>
                <div className="relative w-full lg:max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by title, key, or slug"
                    className="h-11 border-slate-300 bg-white pl-9 shadow-sm"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="flex h-64 items-center justify-center px-6 text-slate-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading categories...
                </div>
              ) : filteredCategories.length === 0 ? (
                <div className="px-6 py-16 text-center text-slate-500">No categories found.</div>
              ) : (
                <div className="space-y-4 px-5 py-5 sm:px-6 sm:py-6">
                  {filteredCategories.map((category) => (
                    <div key={category.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm transition hover:border-slate-300 hover:bg-white sm:p-5">
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
                        <div className="flex min-w-0 items-start gap-4 sm:gap-5">
                          <div className="relative h-18 w-18 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
                            {category.image_url ? (
                              <Image
                                src={category.image_url}
                                alt={category.title}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-slate-400">
                                <Tags className="h-4 w-4" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-base font-semibold text-slate-900">{category.title}</p>
                              <span className="rounded-full bg-cyan-50 px-2 py-1 text-[11px] font-medium text-cyan-700">
                                Sort {category.sort_order}
                              </span>
                            </div>
                            <p className="mt-1 font-mono text-xs text-slate-600">{category.slug}</p>
                            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
                              <span>Key: {category.key}</span>
                              <span>Updated: {formatDate(category.updated_at)}</span>
                              <span className="truncate">ID: {category.id}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                          <Button
                            variant={editingId === category.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => void startEdit(category.id)}
                            className={editingId === category.id ? "h-10 rounded-xl bg-[#5800AB] px-4 text-white hover:bg-[#4a0090]" : "h-10 rounded-xl bg-white px-4 shadow-sm"}
                            disabled={loadingEditId === category.id}
                          >
                            {loadingEditId === category.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Pencil className="mr-2 h-4 w-4" />
                            )}
                            {editingId === category.id ? "Editing" : "Edit"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-10 rounded-xl border-red-200 bg-white px-4 text-red-600 shadow-sm hover:bg-red-50 hover:text-red-700"
                            onClick={() => void deleteCategory(category.id)}
                            disabled={deletingId === category.id}
                          >
                            {deletingId === category.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="mr-2 h-4 w-4" />
                            )}
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

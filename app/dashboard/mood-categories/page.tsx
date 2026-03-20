"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
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

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

type MoodCategoryRecord = {
  id: string;
  key: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  badge_text?: string | null;
  image_url?: string | null;
  image_path?: string | null;
  sort_order: number;
  is_active: boolean;
  selection_type: "MULTI" | "SINGLE";
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
};

type MoodCategoryForm = {
  title: string;
  image_url: string;
  sort_order: string;
};

const initialForm: MoodCategoryForm = {
  title: "",
  image_url: "",
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
  if ("id" in (payload as Record<string, unknown>)) {
    return payload as MoodCategoryRecord;
  }

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
  if (contentType.includes("application/json")) {
    return response.json();
  }
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

export default function MoodCategoriesPage() {
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
      [
        category.title,
        category.key,
        category.slug,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [categories, query]);

  useEffect(() => {
    void loadCategories();
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  async function loadCategories() {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/moodcategories`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(await getErrorFromResponse(response, "Failed to load mood categories."));
      }

      const payload = await parseResponse(response);
      setCategories(extractCategoryList(payload));
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: "Failed to load mood categories",
        description: extractErrorMessage(error, "Unable to fetch categories from backend."),
      });
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setEditingId(null);
    setForm(initialForm);
    setImageFile(null);
    setImagePreview("");
    setRemoveImage(false);

    if (fileRef.current) fileRef.current.value = "";
  }

  function populateForm(category: MoodCategoryRecord) {
    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setEditingId(category.id);
    setForm({
      title: category.title || "",
      image_url: category.image_url || "",
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
    if (listCategory) {
      populateForm(listCategory);
    }

    try {
      setLoadingEditId(id);
      const response = await fetch(`${API_BASE}/api/moodcategories/${id}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(await getErrorFromResponse(response, "Failed to load mood category."));
      }

      const payload = await parseResponse(response);
      const category = extractCategory(payload);
      if (!category) {
        throw new Error("Mood category payload is invalid.");
      }

      populateForm(category);
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: "Failed to load category details",
        description: extractErrorMessage(error, "Could not load the selected mood category."),
      });
    } finally {
      setLoadingEditId(null);
    }
  }

  function handleImagePick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setImageFile(file);
    setRemoveImage(false);

    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    if (!file) {
      setImagePreview(form.image_url || "");
      return;
    }

    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(null);
    setImagePreview("");
    setRemoveImage(true);
    setForm((current) => ({
      ...current,
      image_url: "",
    }));

    if (fileRef.current) fileRef.current.value = "";
  }

  function validateForm() {
    if (!form.title.trim()) return "Title is required.";

    const sortOrder = Number(form.sort_order);
    if (!Number.isFinite(sortOrder)) return "Sort order must be a valid number.";

    const generatedKey = keyify(form.title);
    const generatedSlug = slugify(form.title);

    if (!generatedKey) return "Title must contain letters or numbers to generate a key.";
    if (!generatedSlug) return "Title must contain letters or numbers to generate a slug.";

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
      sort_order: Number(form.sort_order || 100),
      is_active: true,
      selection_type: "MULTI" as const,
      metadata: {},
      remove_image: removeImage,
    };

    try {
      setSaving(true);

      const method = editingId ? "PUT" : "POST";
      const endpoint = editingId
        ? `${API_BASE}/api/moodcategories/${editingId}`
        : `${API_BASE}/api/moodcategories`;

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
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        throw new Error(await getErrorFromResponse(response, "Failed to save mood category."));
      }

      showToast({
        title: editingId ? "Mood category updated" : "Mood category created",
      });

      await loadCategories();
      resetForm();
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: "Failed to save mood category",
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
      const response = await fetch(`${API_BASE}/api/moodcategories/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await getErrorFromResponse(response, "Failed to delete mood category."));
      }

      if (editingId === id) resetForm();
      setCategories((current) => current.filter((item) => item.id !== id));
      showToast({ title: "Mood category deleted" });
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: "Failed to delete mood category",
        description: extractErrorMessage(error, "Delete operation failed."),
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-full bg-slate-100">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                <Tags className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Mood Categories</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Create, edit, and organize category cards shown in the app.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void loadCategories()} disabled={loading} className="bg-white">
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              {editingId ? (
                <Button variant="outline" onClick={resetForm} className="bg-white">
                  <Plus className="mr-2 h-4 w-4" />
                  New category
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Categories</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{categories.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Editing</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{editingId ? form.title || "Draft" : "None"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Image Source</p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {imageFile ? "Local upload" : form.image_url ? "Remote URL" : "Not set"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <Card className="h-fit border-slate-200 bg-white shadow-none">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-lg">{editingId ? "Edit category" : "New category"}</CardTitle>
              <CardDescription>Only the essentials are editable. Key and slug are generated automatically.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
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
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Category image</p>
                    <p className="text-xs text-slate-500">Upload the image shown on the category card.</p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  {imagePreview ? (
                    <div className="relative aspect-[4/3] w-full">
                      <Image
                        src={imagePreview}
                        alt="Mood category preview"
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
                  <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="justify-start bg-white">
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
                    <Button type="button" variant="ghost" onClick={clearImage} className="justify-start text-slate-600">
                      <X className="mr-2 h-4 w-4" />
                      Remove image
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="flex gap-3 border-t border-slate-100 pt-4">
                <Button
                  className="flex-1 bg-slate-900 text-white hover:bg-slate-800"
                  onClick={() => void saveCategory()}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {editingId ? "Save changes" : "Create category"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} disabled={saving} className="bg-white">
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-none">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-lg">Category list</CardTitle>
                  <CardDescription>Search, review, and update existing mood categories.</CardDescription>
                </div>
                <div className="relative w-full lg:max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by title, key, or slug"
                    className="h-11 border-slate-300 bg-white pl-9"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="flex h-64 items-center justify-center text-slate-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading categories...
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredCategories.map((category) => (
                    <div key={category.id} className="px-6 py-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 items-start gap-4">
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
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
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
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

                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button
                            variant={editingId === category.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => void startEdit(category.id)}
                            className={editingId === category.id ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-white"}
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
                            className="border-red-200 bg-white text-red-600 hover:bg-red-50 hover:text-red-700"
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

                  {filteredCategories.length === 0 ? (
                    <div className="px-6 py-16 text-center text-slate-500">
                      No mood categories found.
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

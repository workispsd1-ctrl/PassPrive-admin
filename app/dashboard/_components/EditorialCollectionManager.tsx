"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Plus, Search, Trash2, type LucideIcon } from "lucide-react";

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

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

type CollectionContentType = "LIST" | "GUIDE" | "HOTLIST" | "ARTICLE";
type CollectionEntityType = "STORE" | "RESTAURANT" | "BOTH";

type EditorialCollection = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  cover_image_url?: string | null;
  badge_text?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  content_type: CollectionContentType;
  entity_type: CollectionEntityType;
  city?: string | null;
  area?: string | null;
  sort_order: number;
  is_featured: boolean;
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  updated_at?: string;
  item_count?: number | null;
  items?: unknown[];
};

type FormState = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  cover_image_url: string;
  badge_text: string;
  source_name: string;
  source_url: string;
  content_type: CollectionContentType;
  entity_type: CollectionEntityType;
  city: string;
  area: string;
  sort_order: string;
  is_featured: boolean;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
};

const initialForm: FormState = {
  slug: "",
  title: "",
  subtitle: "",
  description: "",
  cover_image_url: "",
  badge_text: "",
  source_name: "PassPrive",
  source_url: "",
  content_type: "LIST",
  entity_type: "BOTH",
  city: "",
  area: "",
  sort_order: "100",
  is_featured: false,
  is_active: true,
  starts_at: "",
  ends_at: "",
};

type Props = {
  apiPath: string;
  basePath: string;
  pageTitle: string;
  description: string;
  searchPlaceholder: string;
  emptyTitle: string;
  emptyDescription: string;
  detailLabel: string;
  icon: LucideIcon;
};

function extractCollections(payload: unknown): EditorialCollection[] {
  if (Array.isArray(payload)) return payload as EditorialCollection[];

  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  if (!record) return [];

  for (const key of ["collections", "data", "items", "results"]) {
    if (Array.isArray(record[key])) return record[key] as EditorialCollection[];
  }

  return [];
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
    const record = payload as Record<string, unknown>;
    for (const key of ["message", "error", "detail"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value;
    }
  }

  return fallback;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function itemCount(collection: EditorialCollection) {
  if (typeof collection.item_count === "number") return collection.item_count;
  if (Array.isArray(collection.items)) return collection.items.length;
  return 0;
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toIsoOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default function EditorialCollectionManager({
  apiPath,
  basePath,
  pageTitle,
  description,
  searchPlaceholder,
  emptyTitle,
  emptyDescription,
  detailLabel,
  icon: _icon,
}: Props) {
  const [collections, setCollections] = useState<EditorialCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<EditorialCollection | null>(null);
  const [deletingCollection, setDeletingCollection] = useState<EditorialCollection | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [query, setQuery] = useState("");

  const filteredCollections = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return collections;
    return collections.filter((collection) =>
      [
        collection.title,
        collection.slug,
        collection.subtitle || "",
        collection.city || "",
        collection.area || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [collections, query]);

  const loadCollections = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}${apiPath}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(await getErrorFromResponse(response, "Failed to load collections."));
      }

      const payload = await parseResponse(response);
      setCollections(extractCollections(payload));
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: `Failed to load ${pageTitle}`,
        description: error instanceof Error ? error.message : "Unable to fetch collections.",
      });
      setCollections([]);
    } finally {
      setLoading(false);
    }
  }, [apiPath, pageTitle]);

  useEffect(() => {
    void loadCollections();
  }, [loadCollections]);

  function openCreateDialog() {
    setEditingCollection(null);
    setForm(initialForm);
    setDialogOpen(true);
  }

  function openEditDialog(collection: EditorialCollection) {
    setEditingCollection(collection);
    setForm({
      slug: collection.slug || "",
      title: collection.title || "",
      subtitle: collection.subtitle || "",
      description: collection.description || "",
      cover_image_url: collection.cover_image_url || "",
      badge_text: collection.badge_text || "",
      source_name: collection.source_name || "PassPrive",
      source_url: collection.source_url || "",
      content_type: collection.content_type || "LIST",
      entity_type: collection.entity_type || "BOTH",
      city: collection.city || "",
      area: collection.area || "",
      sort_order: String(collection.sort_order ?? 100),
      is_featured: Boolean(collection.is_featured),
      is_active: Boolean(collection.is_active),
      starts_at: toDateTimeLocal(collection.starts_at),
      ends_at: toDateTimeLocal(collection.ends_at),
    });
    setDialogOpen(true);
  }

  async function saveCollection() {
    if (!form.slug.trim()) {
      showToast({ type: "error", title: "Slug is required" });
      return;
    }

    if (!form.title.trim()) {
      showToast({ type: "error", title: "Title is required" });
      return;
    }

    const sortOrder = Number(form.sort_order);
    if (!Number.isFinite(sortOrder)) {
      showToast({ type: "error", title: "Sort order must be a valid number" });
      return;
    }

    const startsAtIso = toIsoOrNull(form.starts_at);
    const endsAtIso = toIsoOrNull(form.ends_at);

    if (form.starts_at.trim() && !startsAtIso) {
      showToast({ type: "error", title: "Start date/time is invalid" });
      return;
    }

    if (form.ends_at.trim() && !endsAtIso) {
      showToast({ type: "error", title: "End date/time is invalid" });
      return;
    }

    if (startsAtIso && endsAtIso && new Date(endsAtIso) <= new Date(startsAtIso)) {
      showToast({ type: "error", title: "End date must be later than start date" });
      return;
    }

    const payload = {
      slug: form.slug.trim(),
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      description: form.description.trim() || null,
      cover_image_url: form.cover_image_url.trim() || null,
      badge_text: form.badge_text.trim() || null,
      source_name: form.source_name.trim() || "PassPrive",
      source_url: form.source_url.trim() || null,
      content_type: form.content_type,
      entity_type: form.entity_type,
      city: form.city.trim() || null,
      area: form.area.trim() || null,
      sort_order: sortOrder,
      is_featured: form.is_featured,
      is_active: form.is_active,
      starts_at: startsAtIso,
      ends_at: endsAtIso,
    };

    try {
      setSaving(true);
      const endpoint = editingCollection ? `${API_BASE}${apiPath}/${editingCollection.id}` : `${API_BASE}${apiPath}`;

      const response = await fetch(endpoint, {
        method: editingCollection ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await getErrorFromResponse(response, "Failed to save collection."));
      }

      showToast({ title: editingCollection ? "Collection updated" : "Collection created" });
      setDialogOpen(false);
      setEditingCollection(null);
      setForm(initialForm);
      await loadCollections();
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: "Failed to save collection",
        description: error instanceof Error ? error.message : "Save failed.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function deleteCollection() {
    if (!deletingCollection) return;

    try {
      setSaving(true);
      let deletionMode: "hard" | "soft" = "hard";
      let response = await fetch(`${API_BASE}${apiPath}/${deletingCollection.id}`, {
        method: "DELETE",
      });

      // Fallback to soft-delete when backend does not expose hard delete.
      if ([404, 405, 501].includes(response.status)) {
        deletionMode = "soft";
        response = await fetch(`${API_BASE}${apiPath}/${deletingCollection.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ is_active: false }),
        });
      }

      if (!response.ok) {
        throw new Error(await getErrorFromResponse(response, "Failed to delete collection."));
      }

      showToast({ title: deletionMode === "hard" ? "Collection deleted" : "Collection deactivated" });
      setDeletingCollection(null);
      await loadCollections();
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: "Failed to delete collection",
        description: error instanceof Error ? error.message : "Delete failed.",
      });
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
            style={{
              background:
                "linear-gradient(310.35deg, rgba(255, 255, 255, 0.4) 4.07%, rgba(255, 255, 255, 0.3) 48.73%, rgba(255, 255, 255, 0.2) 100%)",
            }}
          >
            <CardHeader className="space-y-4 border-b border-slate-100/90 bg-white/70 px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="text-[18px] leading-6 text-slate-900">Cards</CardTitle>
                  <CardDescription className="mt-1 text-[12px] leading-5 text-slate-500">{description}</CardDescription>
                </div>
                <Button className="h-10 rounded-2xl bg-[#5800AB] px-5 text-sm text-white shadow-[0_10px_20px_rgba(88,0,171,0.25)] hover:bg-[#4a0090]" onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add new card
                </Button>
              </div>

              <div className="relative w-full lg:max-w-[1120px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-10 rounded-xl border-slate-200 bg-white pl-10 text-sm shadow-[0_1px_0_rgba(15,23,42,0.02)] placeholder:text-slate-400"
                />
              </div>
            </CardHeader>

            <CardContent className="px-4 py-4 sm:px-5">
            {loading ? (
              <div className="flex items-center justify-center gap-3 rounded-[16px] border border-dashed border-slate-200 bg-white px-6 py-20 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading collections...
              </div>
            ) : filteredCollections.length === 0 ? (
              <div className="rounded-[16px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
                <p className="text-sm font-medium text-slate-900">{emptyTitle}</p>
                <p className="mt-2 text-sm text-slate-500">{emptyDescription}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredCollections.map((collection) => (
                  <div
                    key={collection.id}
                    className="rounded-[14px] border border-slate-200/80 px-4 py-4 shadow-[0_2px_14px_rgba(15,23,42,0.07)] transition-shadow hover:shadow-[0_6px_20px_rgba(15,23,42,0.09)]"
                    style={{
                      background:
                        "linear-gradient(0deg, #FFFFFF, #FFFFFF), linear-gradient(142.22deg, #ECFEFF 4.91%, #F3E8FF 95.09%)",
                    }}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-[14px] font-semibold leading-5 text-slate-900">{collection.title}</p>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium leading-4 text-slate-700">
                          {collection.content_type}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium leading-4 text-slate-700">
                          {collection.entity_type}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium leading-4 ${
                            collection.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                          }`}
                          >
                            {collection.is_active ? "Active" : "Inactive"}
                          </span>
                        {collection.is_featured ? (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium leading-4 text-amber-700">Featured</span>
                        ) : null}
                        </div>
                        <p className="mt-1 text-[12px] leading-5 text-slate-500">{collection.slug}</p>
                        <p className="mt-1 text-[12px] leading-5 text-slate-500">{collection.subtitle || "No subtitle added yet."}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] leading-4 text-slate-400">
                          <span>Sort: {collection.sort_order ?? 0}</span>
                          <span>Items: {itemCount(collection)}</span>
                          <span>Location: {[collection.area, collection.city].filter(Boolean).join(", ") || "All"}</span>
                          <span>Updated: {formatDate(collection.updated_at)}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <Button variant="outline" className="h-9 rounded-xl border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 shadow-sm hover:bg-slate-50" onClick={() => openEditDialog(collection)}>
                          <Image src="/restaurentpasspriveedit.png" alt="Edit" width={14} height={14} className="mr-2 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button asChild variant="outline" className="h-9 rounded-xl border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 shadow-sm hover:bg-slate-50">
                          <Link href={`${basePath}/${collection.id}`}>
                            <Image src="/restaurentpassprivemange.png" alt="Manage" width={14} height={14} className="mr-2 h-3.5 w-3.5" />
                            {detailLabel}
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-9 rounded-xl border-red-200 bg-white px-3 text-[13px] font-medium text-red-600 shadow-sm hover:bg-red-50 hover:text-red-700"
                          onClick={() => setDeletingCollection(collection)}
                        >
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
            <DialogTitle>{editingCollection ? "Edit collection" : "Create collection"}</DialogTitle>
            <DialogDescription>Set collection details and then add stores or restaurants in the items screen.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="collection-slug">Slug</Label>
                <Input
                  id="collection-slug"
                  value={form.slug}
                  onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                  placeholder="best-brunch-spots"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="collection-title">Title</Label>
                <Input
                  id="collection-title"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Best Brunch Spots"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="collection-subtitle">Subtitle</Label>
              <Input
                id="collection-subtitle"
                value={form.subtitle}
                onChange={(event) => setForm((current) => ({ ...current, subtitle: event.target.value }))}
                placeholder="Handpicked picks for your next weekend"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="collection-description">Description</Label>
              <Textarea
                id="collection-description"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Add a short editorial description"
                className="min-h-[90px]"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="collection-cover-image">Cover image URL</Label>
                <Input
                  id="collection-cover-image"
                  value={form.cover_image_url}
                  onChange={(event) => setForm((current) => ({ ...current, cover_image_url: event.target.value }))}
                  placeholder="https://..."
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="collection-badge">Badge text</Label>
                <Input
                  id="collection-badge"
                  value={form.badge_text}
                  onChange={(event) => setForm((current) => ({ ...current, badge_text: event.target.value }))}
                  placeholder="Editors Pick"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="collection-source-name">Source name</Label>
                <Input
                  id="collection-source-name"
                  value={form.source_name}
                  onChange={(event) => setForm((current) => ({ ...current, source_name: event.target.value }))}
                  placeholder="PassPrive"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="collection-source-url">Source URL</Label>
                <Input
                  id="collection-source-url"
                  value={form.source_url}
                  onChange={(event) => setForm((current) => ({ ...current, source_url: event.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="collection-content-type">Content type</Label>
                <select
                  id="collection-content-type"
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
                  value={form.content_type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      content_type: event.target.value as CollectionContentType,
                    }))
                  }
                >
                  <option value="LIST">LIST</option>
                  <option value="GUIDE">GUIDE</option>
                  <option value="HOTLIST">HOTLIST</option>
                  <option value="ARTICLE">ARTICLE</option>
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="collection-entity-type">Entity type</Label>
                <select
                  id="collection-entity-type"
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
                  value={form.entity_type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      entity_type: event.target.value as CollectionEntityType,
                    }))
                  }
                >
                  <option value="STORE">STORE</option>
                  <option value="RESTAURANT">RESTAURANT</option>
                  <option value="BOTH">BOTH</option>
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="collection-sort-order">Sort order</Label>
                <Input
                  id="collection-sort-order"
                  type="number"
                  value={form.sort_order}
                  onChange={(event) => setForm((current) => ({ ...current, sort_order: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="collection-city">City</Label>
                <Input
                  id="collection-city"
                  value={form.city}
                  onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                  placeholder="Mumbai"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="collection-area">Area</Label>
                <Input
                  id="collection-area"
                  value={form.area}
                  onChange={(event) => setForm((current) => ({ ...current, area: event.target.value }))}
                  placeholder="Bandra"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="collection-starts-at">Starts at</Label>
                <Input
                  id="collection-starts-at"
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(event) => setForm((current) => ({ ...current, starts_at: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="collection-ends-at">Ends at</Label>
                <Input
                  id="collection-ends-at"
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(event) => setForm((current) => ({ ...current, ends_at: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">Collection active</p>
                  <p className="text-xs text-slate-500">Toggle visibility without deleting it.</p>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm((current) => ({ ...current, is_active: checked }))}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">Featured collection</p>
                  <p className="text-xs text-slate-500">Use for homepage priority sections.</p>
                </div>
                <Switch
                  checked={form.is_featured}
                  onCheckedChange={(checked) => setForm((current) => ({ ...current, is_featured: checked }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void saveCollection()} disabled={saving} className="bg-[#5800AB] text-white hover:bg-[#4a0090]">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingCollection ? "Save changes" : "Create collection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingCollection)} onOpenChange={(open) => !open && setDeletingCollection(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this collection?</AlertDialogTitle>
            <AlertDialogDescription>
              We first try permanent delete. If delete endpoint is unavailable, this collection will be marked inactive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void deleteCollection();
              }}
              disabled={saving}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

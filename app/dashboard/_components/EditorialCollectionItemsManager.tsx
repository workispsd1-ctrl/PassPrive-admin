"use client";

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowUp, Loader2, Pencil, Plus, Search, Store, Trash2, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

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
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Textarea } from "@/components/ui/textarea";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

type CollectionEntityType = "STORE" | "RESTAURANT" | "BOTH";
type ItemEntityType = "STORE" | "RESTAURANT";

type EditorialCollection = {
  id: string;
  title: string;
  subtitle?: string | null;
  entity_type: CollectionEntityType;
  content_type: string;
};

type EditorialCollectionItem = {
  id: string;
  collection_id: string;
  store_id?: string | null;
  restaurant_id?: string | null;
  sort_order: number;
  note?: string | null;
  is_active: boolean;
  store?: EntityOption | null;
  restaurant?: EntityOption | null;
};

type EntityOption = {
  id: string;
  type: ItemEntityType;
  name: string;
  city?: string | null;
  area?: string | null;
  category?: string | null;
};

type FormState = {
  entity_type: ItemEntityType;
  entity_id: string;
  sort_order: string;
  note: string;
  is_active: boolean;
};

const initialForm: FormState = {
  entity_type: "STORE",
  entity_id: "",
  sort_order: "100",
  note: "",
  is_active: true,
};

type Props = {
  apiPath: string;
  basePath: string;
  pageTitle: string;
  pageDescription: string;
  backLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  searchPlaceholder: string;
  pickerPlaceholder: string;
  icon: LucideIcon;
};

function normalizeEntityOption(value: unknown, type: ItemEntityType): EntityOption | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.name !== "string") return null;

  const areaValue =
    typeof record.area === "string"
      ? record.area
      : typeof record.location_name === "string"
      ? record.location_name
      : null;

  return {
    id: record.id,
    type,
    name: record.name,
    city: typeof record.city === "string" ? record.city : null,
    area: areaValue,
    category: typeof record.category === "string" ? record.category : null,
  };
}

function extractCollectionPayload(payload: unknown) {
  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  if (!record) return { collection: null as EditorialCollection | null, items: [] as EditorialCollectionItem[] };

  const collection =
    (record.collection as EditorialCollection | undefined) ||
    (record.data as EditorialCollection | undefined) ||
    (("id" in record ? record : null) as EditorialCollection | null);

  const items =
    (Array.isArray(record.items) ? (record.items as EditorialCollectionItem[]) : undefined) ||
    (collection && Array.isArray((collection as unknown as Record<string, unknown>).items)
      ? ((collection as unknown as Record<string, unknown>).items as EditorialCollectionItem[])
      : undefined) ||
    [];

  return { collection: collection || null, items };
}

function extractItems(payload: unknown): EditorialCollectionItem[] {
  if (Array.isArray(payload)) return payload as EditorialCollectionItem[];

  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  if (!record) return [];

  for (const key of ["items", "data", "results"]) {
    if (Array.isArray(record[key])) return record[key] as EditorialCollectionItem[];
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

function optionMeta(item: EntityOption) {
  return [item.area, item.city, item.category].filter(Boolean).join(" • ");
}

function resolveItemType(item: EditorialCollectionItem): ItemEntityType {
  if (item.restaurant_id) return "RESTAURANT";
  return "STORE";
}

function getItemEntityId(item: EditorialCollectionItem) {
  return item.restaurant_id || item.store_id || "";
}

function updateEntityTypeByCollection(entityType: CollectionEntityType, setForm: Dispatch<SetStateAction<FormState>>) {
  if (entityType === "STORE") {
    setForm((current) => ({ ...current, entity_type: "STORE", entity_id: "" }));
  }

  if (entityType === "RESTAURANT") {
    setForm((current) => ({ ...current, entity_type: "RESTAURANT", entity_id: "" }));
  }
}

export default function EditorialCollectionItemsManager({
  apiPath,
  basePath,
  pageTitle,
  pageDescription,
  backLabel,
  emptyTitle,
  emptyDescription,
  searchPlaceholder,
  pickerPlaceholder,
  icon: Icon,
}: Props) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const collectionId = params?.id as string;

  const [collection, setCollection] = useState<EditorialCollection | null>(null);
  const [items, setItems] = useState<EditorialCollectionItem[]>([]);
  const [options, setOptions] = useState<EntityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reorderSaving, setReorderSaving] = useState(false);
  const [orderDirty, setOrderDirty] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EditorialCollectionItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<EditorialCollectionItem | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<FormState>(initialForm);

  const optionsMap = useMemo(() => new Map(options.map((item) => [item.id, item])), [options]);
  const selectedEntity = optionsMap.get(form.entity_id) || null;

  const allowedEntityType = collection?.entity_type || "BOTH";

  const filteredOptions = useMemo(() => {
    const filteredByEntityType = options.filter((option) => {
      if (allowedEntityType === "BOTH") return true;
      return option.type === allowedEntityType;
    });

    const search = pickerQuery.trim().toLowerCase();
    if (!search) return filteredByEntityType;

    return filteredByEntityType.filter((option) =>
      [option.name, option.city || "", option.area || "", option.category || ""]
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [allowedEntityType, options, pickerQuery]);

  const filteredItems = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return items;

    return items.filter((item) => {
      const entityId = getItemEntityId(item);
      const type = resolveItemType(item);
      const selected = optionsMap.get(entityId);
      const nested = type === "RESTAURANT" ? item.restaurant : item.store;

      return [
        selected?.name || nested?.name || entityId,
        type,
        nested?.city || selected?.city || "",
        nested?.area || selected?.area || "",
        nested?.category || selected?.category || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }, [items, optionsMap, query]);

  const loadCollection = useCallback(async () => {
    try {
      setLoading(true);

      const collectionResponse = await fetch(`${API_BASE}${apiPath}/${collectionId}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!collectionResponse.ok) {
        throw new Error(await getErrorFromResponse(collectionResponse, "Failed to load collection details."));
      }

      const payload = await parseResponse(collectionResponse);
      const extracted = extractCollectionPayload(payload);

      let nextItems = extracted.items;
      if (!nextItems.length) {
        const itemsResponse = await fetch(`${API_BASE}${apiPath}/${collectionId}/items`, {
          method: "GET",
          cache: "no-store",
        });

        if (itemsResponse.ok) {
          const itemsPayload = await parseResponse(itemsResponse);
          nextItems = extractItems(itemsPayload);
        }
      }

      setCollection(extracted.collection);
      setItems([...nextItems].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
      setOrderDirty(false);
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: "Failed to load collection details",
        description: error instanceof Error ? error.message : "Unable to fetch collection data.",
      });
      router.push(basePath);
    } finally {
      setLoading(false);
    }
  }, [apiPath, basePath, collectionId, router]);

  useEffect(() => {
    void loadCollection();
  }, [loadCollection]);

  useEffect(() => {
    updateEntityTypeByCollection(allowedEntityType, setForm);
  }, [allowedEntityType]);

  const loadOptions = useCallback(async () => {
    const [restaurantResponse, storeResponse] = await Promise.all([
      supabaseBrowser.from("restaurants").select("id,name,city,area").order("name", { ascending: true }),
      supabaseBrowser
        .from("stores")
        .select("id,name,city,location_name,category")
        .order("name", { ascending: true }),
    ]);

    const nextOptions: EntityOption[] = [];

    if (restaurantResponse.error) {
      showToast({
        type: "error",
        title: "Failed to load restaurants",
        description: restaurantResponse.error.message,
      });
    } else {
      nextOptions.push(
        ...((restaurantResponse.data as unknown[]) || [])
          .map((item) => normalizeEntityOption(item, "RESTAURANT"))
          .filter(Boolean) as EntityOption[]
      );
    }

    if (storeResponse.error) {
      showToast({
        type: "error",
        title: "Failed to load stores",
        description: storeResponse.error.message,
      });
    } else {
      nextOptions.push(
        ...((storeResponse.data as unknown[]) || [])
          .map((item) => normalizeEntityOption(item, "STORE"))
          .filter(Boolean) as EntityOption[]
      );
    }

    setOptions(nextOptions);
  }, []);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  function openCreateDialog() {
    setEditingItem(null);
    setPickerQuery("");
    setForm((current) => ({
      ...initialForm,
      entity_type: allowedEntityType === "BOTH" ? "STORE" : (allowedEntityType as ItemEntityType),
    }));
    setDialogOpen(true);
  }

  function openEditDialog(item: EditorialCollectionItem) {
    const entityType = resolveItemType(item);
    setEditingItem(item);
    setPickerQuery("");
    setForm({
      entity_type: entityType,
      entity_id: getItemEntityId(item),
      sort_order: String(item.sort_order ?? 100),
      note: item.note || "",
      is_active: Boolean(item.is_active),
    });
    setDialogOpen(true);
  }

  async function saveItem() {
    if (!form.entity_id) {
      showToast({ type: "error", title: "Please select a store or restaurant" });
      return;
    }

    const sortOrder = Number(form.sort_order);
    if (!Number.isFinite(sortOrder)) {
      showToast({ type: "error", title: "Sort order must be a valid number" });
      return;
    }

    const payload: Record<string, unknown> = {
      sort_order: sortOrder,
      is_active: form.is_active,
    };

    if (form.entity_type === "STORE") {
      payload.store_id = form.entity_id;
    } else {
      payload.restaurant_id = form.entity_id;
    }

    const trimmedNote = form.note.trim();
    if (trimmedNote) {
      payload.note = trimmedNote;
    }

    const duplicateItem = items.find((item) => {
      if (editingItem && item.id === editingItem.id) return false;
      if (form.entity_type === "STORE") {
        return item.store_id === form.entity_id;
      }
      return item.restaurant_id === form.entity_id;
    });

    const targetItemId = editingItem?.id || duplicateItem?.id || null;
    const requestMethod = targetItemId ? "PUT" : "POST";

    try {
      setSaving(true);
      const endpoint = targetItemId
        ? `${API_BASE}${apiPath}/${collectionId}/items/${targetItemId}`
        : `${API_BASE}${apiPath}/${collectionId}/items`;

      const response = await fetch(endpoint, {
        method: requestMethod,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await getErrorFromResponse(response, "Failed to save editorial item."));
      }

      showToast({ title: targetItemId ? "Editorial item updated" : "Editorial item added" });
      setDialogOpen(false);
      setEditingItem(null);
      setForm(initialForm);
      await loadCollection();
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: "Failed to save editorial item",
        description: error instanceof Error ? error.message : "Save failed.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem() {
    if (!deletingItem) return;

    try {
      setSaving(true);
      let deletionMode: "hard" | "soft" = "hard";
      let response = await fetch(`${API_BASE}${apiPath}/${collectionId}/items/${deletingItem.id}`, {
        method: "DELETE",
      });

      // Fallback to soft-delete when backend delete endpoint is not implemented yet.
      if ([404, 405, 501].includes(response.status)) {
        deletionMode = "soft";
        response = await fetch(`${API_BASE}${apiPath}/${collectionId}/items/${deletingItem.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ is_active: false }),
        });
      }

      if (!response.ok) {
        throw new Error(await getErrorFromResponse(response, "Failed to delete editorial item."));
      }

      showToast({ title: deletionMode === "hard" ? "Editorial item deleted" : "Editorial item deactivated" });
      setDeletingItem(null);
      await loadCollection();
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: "Failed to delete editorial item",
        description: error instanceof Error ? error.message : "Delete failed.",
      });
    } finally {
      setSaving(false);
    }
  }

  function moveItem(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;

    const nextItems = [...items];
    const [moved] = nextItems.splice(index, 1);
    nextItems.splice(nextIndex, 0, moved);

    setItems(
      nextItems.map((item, idx) => ({
        ...item,
        sort_order: idx + 1,
      }))
    );
    setOrderDirty(true);
  }

  async function saveReorder() {
    try {
      setReorderSaving(true);
      const response = await fetch(`${API_BASE}${apiPath}/${collectionId}/items/reorder`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          item_ids: items.map((item) => item.id),
        }),
      });

      if (!response.ok) {
        throw new Error(await getErrorFromResponse(response, "Failed to reorder items."));
      }

      showToast({ title: "Item order saved" });
      setOrderDirty(false);
      await loadCollection();
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: "Failed to save item order",
        description: error instanceof Error ? error.message : "Reorder failed.",
      });
    } finally {
      setReorderSaving(false);
    }
  }

  return (
    <div className="min-h-full bg-slate-100">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                <Icon className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <Button asChild variant="outline" size="sm" className="bg-white">
                    <Link href={basePath}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      {backLabel}
                    </Link>
                  </Button>
                </div>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                  {collection?.title || pageTitle}
                </h1>
                <p className="mt-1 text-sm text-slate-500">{collection?.subtitle || pageDescription}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-slate-100 px-2 py-1">{collection?.content_type || "LIST"}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1">{collection?.entity_type || "BOTH"}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="bg-white"
                onClick={() => void saveReorder()}
                disabled={!orderDirty || reorderSaving}
              >
                {reorderSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save order
              </Button>
              <Button className="bg-slate-900 text-white hover:bg-slate-800" onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add item
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Card className="border-slate-200 bg-white shadow-none">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-lg">Editorial Items</CardTitle>
                <CardDescription>
                  Manage linked items for this collection and adjust display order.
                </CardDescription>
              </div>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-11 w-full border-slate-300 bg-white lg:max-w-sm"
              />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center gap-3 px-6 py-20 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading editorial items...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-sm font-medium text-slate-900">{emptyTitle}</p>
                <p className="mt-2 text-sm text-slate-500">{emptyDescription}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const actualIndex = items.findIndex((candidate) => candidate.id === item.id);
                  const entityType = resolveItemType(item);
                  const entityId = getItemEntityId(item);
                  const option = optionsMap.get(entityId);
                  const nested = entityType === "RESTAURANT" ? item.restaurant : item.store;
                  const label = option?.name || nested?.name || entityId;
                  const meta = optionMeta(option || nested || { id: "", type: entityType, name: "" });

                  return (
                    <div key={item.id} className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="truncate text-base font-semibold text-slate-900">{label}</p>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            {entityType}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              item.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {item.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-500">{meta || "Item linked to this collection."}</p>
                        {item.note ? <p className="mt-1 text-sm text-slate-500">Note: {item.note}</p> : null}
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>Sort: {item.sort_order ?? 0}</span>
                          <span>ID: {entityId}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          className="bg-white"
                          onClick={() => moveItem(actualIndex, -1)}
                          disabled={actualIndex <= 0}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          className="bg-white"
                          onClick={() => moveItem(actualIndex, 1)}
                          disabled={actualIndex === items.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" className="bg-white" onClick={() => openEditDialog(item)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          className="bg-white border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setDeletingItem(item)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit item" : "Add item"}</DialogTitle>
            <DialogDescription>
              Select a store or restaurant and choose how it should appear in this collection.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="editorial-item-type">Item type</Label>
              <select
                id="editorial-item-type"
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={form.entity_type}
                disabled={allowedEntityType !== "BOTH"}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    entity_type: event.target.value as ItemEntityType,
                    entity_id: "",
                  }))
                }
              >
                {allowedEntityType !== "RESTAURANT" ? <option value="STORE">STORE</option> : null}
                {allowedEntityType !== "STORE" ? <option value="RESTAURANT">RESTAURANT</option> : null}
              </select>
            </div>

            <div className="grid gap-2">
              <Label>Item</Label>
              <Button type="button" variant="outline" className="justify-between bg-white" onClick={() => setPickerOpen(true)}>
                <span className="truncate text-left">
                  {selectedEntity ? `${selectedEntity.name}${selectedEntity.city ? ` • ${selectedEntity.city}` : ""}` : "Select an item"}
                </span>
                <Search className="ml-2 h-4 w-4 text-slate-400" />
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="item-sort-order">Sort order</Label>
                <Input
                  id="item-sort-order"
                  type="number"
                  value={form.sort_order}
                  onChange={(event) => setForm((current) => ({ ...current, sort_order: event.target.value }))}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 md:mt-7">
                <div>
                  <p className="text-sm font-medium text-slate-900">Item active</p>
                  <p className="text-xs text-slate-500">Turn this item off without removing it.</p>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm((current) => ({ ...current, is_active: checked }))}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="item-note">Note</Label>
              <Textarea
                id="item-note"
                value={form.note}
                onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                placeholder="Optional note for this item"
                className="min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void saveItem()} disabled={saving} className="bg-slate-900 text-white hover:bg-slate-800">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingItem ? "Save changes" : "Add item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select item</DialogTitle>
            <DialogDescription>{pickerPlaceholder}</DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-slate-200">
            <Command shouldFilter={false}>
              <CommandInput placeholder="Search items..." value={pickerQuery} onValueChange={setPickerQuery} />
              <CommandList>
                {filteredOptions.length === 0 ? <CommandEmpty>No items found.</CommandEmpty> : null}
                {filteredOptions
                  .filter((option) => option.type === form.entity_type)
                  .map((option) => (
                    <CommandItem
                      key={`${option.type}-${option.id}`}
                      value={`${option.name} ${option.city || ""} ${option.area || ""} ${option.category || ""}`}
                      onSelect={() => {
                        setForm((current) => ({ ...current, entity_id: option.id }));
                        setPickerOpen(false);
                      }}
                      className="flex items-start justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{option.name}</p>
                        <p className="truncate text-xs text-slate-500">
                          {option.type} • {optionMeta(option)}
                        </p>
                      </div>
                      {option.type === "RESTAURANT" ? (
                        <UtensilsCrossed className="h-4 w-4 text-slate-400" />
                      ) : (
                        <Store className="h-4 w-4 text-slate-400" />
                      )}
                    </CommandItem>
                  ))}
              </CommandList>
            </Command>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingItem)} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription>
              We first try permanent delete. If delete endpoint is unavailable, this item will be marked inactive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void deleteItem();
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

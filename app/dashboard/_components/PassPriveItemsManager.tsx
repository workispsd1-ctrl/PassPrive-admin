"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Loader2,
  Pencil,
  Plus,
  Search,
  Store,
  Trash2,
  type LucideIcon,
} from "lucide-react";

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
import { showToast } from "@/hooks/useToast";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

type EntityIdKey = "restaurant_id" | "store_id";
type EntityNestedKey = "restaurant" | "store";
type EntityTable = "restaurants" | "stores";

type EntityOption = {
  id: string;
  name: string;
  city?: string | null;
  area?: string | null;
  category?: string | null;
  subcategory?: string | null;
};

type PassPriveCard = {
  id: string;
  title: string;
  subtitle?: string | null;
  city?: string | null;
  is_active: boolean;
  sort_order: number;
};

type CardItem = {
  id: string;
  restaurant_id?: string;
  store_id?: string;
  custom_title?: string | null;
  custom_venue?: string | null;
  custom_offer?: string | null;
  custom_image_url?: string | null;
  sort_order: number;
  is_active: boolean;
  restaurant?: EntityOption | null;
  store?: EntityOption | null;
};

type ItemFormState = {
  entity_id: string;
  sort_order: string;
  is_active: boolean;
};

const initialItemForm: ItemFormState = {
  entity_id: "",
  sort_order: "100",
  is_active: true,
};

type PassPriveItemsManagerProps = {
  apiPath: string;
  basePath: string;
  pageTitle: string;
  pageDescription: string;
  backLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  entityLabel: string;
  entityPluralLabel: string;
  entityTable: EntityTable;
  entitySelect: string;
  entityIdKey: EntityIdKey;
  entityNestedKey: EntityNestedKey;
  searchPlaceholder: string;
  pickerPlaceholder: string;
  icon: LucideIcon;
};

function normalizeEntityOption(value: unknown): EntityOption | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.name !== "string") return null;

  return {
    id: record.id,
    name: record.name,
    city: typeof record.city === "string" ? record.city : null,
    area: typeof record.area === "string" ? record.area : null,
    category: typeof record.category === "string" ? record.category : null,
    subcategory: typeof record.subcategory === "string" ? record.subcategory : null,
  };
}

function extractCardPayload(payload: unknown) {
  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  if (!record) return { card: null as PassPriveCard | null, items: [] as CardItem[] };

  const card =
    (record.card as PassPriveCard | undefined) ||
    (record.data as PassPriveCard | undefined) ||
    (("id" in record ? record : null) as PassPriveCard | null);

  const items =
    (Array.isArray(record.items) ? (record.items as CardItem[]) : undefined) ||
    (card && Array.isArray((card as unknown as Record<string, unknown>).items)
      ? ((card as unknown as Record<string, unknown>).items as CardItem[])
      : undefined) ||
    [];

  return { card: card || null, items };
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
  return [item.area, item.city, item.category, item.subcategory].filter(Boolean).join(" • ");
}

function getItemEntityId(item: CardItem, key: EntityIdKey) {
  return key === "restaurant_id" ? item.restaurant_id || "" : item.store_id || "";
}

function resolveItemLabel(item: CardItem, optionsMap: Map<string, EntityOption>, nestedKey: EntityNestedKey, idKey: EntityIdKey) {
  const entityId = getItemEntityId(item, idKey);
  const selected = optionsMap.get(entityId);
  const nested = nestedKey === "restaurant" ? item.restaurant : item.store;
  return selected?.name || nested?.name || item.custom_venue || entityId;
}

export default function PassPriveItemsManager({
  apiPath,
  basePath,
  pageTitle,
  pageDescription,
  backLabel,
  emptyTitle,
  emptyDescription,
  entityLabel,
  entityPluralLabel,
  entityTable,
  entitySelect,
  entityIdKey,
  entityNestedKey,
  searchPlaceholder,
  pickerPlaceholder,
  icon: _icon,
}: PassPriveItemsManagerProps) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const cardId = params?.id as string;

  const [card, setCard] = useState<PassPriveCard | null>(null);
  const [items, setItems] = useState<CardItem[]>([]);
  const [options, setOptions] = useState<EntityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reorderSaving, setReorderSaving] = useState(false);
  const [orderDirty, setOrderDirty] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CardItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<CardItem | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<ItemFormState>(initialItemForm);

  const optionsMap = useMemo(() => new Map(options.map((item) => [item.id, item])), [options]);
  const selectedEntity = optionsMap.get(form.entity_id) || null;

  const filteredOptions = useMemo(() => {
    const search = pickerQuery.trim().toLowerCase();
    if (!search) return options;
    return options.filter((option) =>
      [option.name, option.city || "", option.area || "", option.category || "", option.subcategory || ""]
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [options, pickerQuery]);

  const filteredItems = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return items;
    return items.filter((item) =>
      [
        resolveItemLabel(item, optionsMap, entityNestedKey, entityIdKey),
        item[entityNestedKey]?.city || "",
        item[entityNestedKey]?.area || "",
        item[entityNestedKey]?.category || "",
        item[entityNestedKey]?.subcategory || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [entityIdKey, entityNestedKey, items, optionsMap, query]);

  const loadCard = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}${apiPath}/${cardId}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(await getErrorFromResponse(response, "Failed to load card details."));
      }

      const payload = await parseResponse(response);
      const extracted = extractCardPayload(payload);
      setCard(extracted.card);
      setItems([...extracted.items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
      setOrderDirty(false);
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: "Failed to load card details",
        description: error instanceof Error ? error.message : "Unable to fetch card data.",
      });
      router.push(basePath);
    } finally {
      setLoading(false);
    }
  }, [apiPath, basePath, cardId, router]);

  useEffect(() => {
    void loadCard();
  }, [loadCard]);

  const loadOptions = useCallback(async () => {
    const { data, error } = await supabaseBrowser.from(entityTable).select(entitySelect).order("name", { ascending: true });

    if (error) {
      showToast({
        type: "error",
        title: `Failed to load ${entityPluralLabel.toLowerCase()}`,
        description: error.message,
      });
      return;
    }

    const normalized = ((data as unknown[]) || [])
      .map(normalizeEntityOption)
      .filter(Boolean) as EntityOption[];

    setOptions(normalized);
  }, [entityPluralLabel, entitySelect, entityTable]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  function openCreateDialog() {
    setEditingItem(null);
    setForm(initialItemForm);
    setPickerQuery("");
    setDialogOpen(true);
  }

  function openEditDialog(item: CardItem) {
    setEditingItem(item);
    setForm({
      entity_id: getItemEntityId(item, entityIdKey),
      sort_order: String(item.sort_order ?? 100),
      is_active: Boolean(item.is_active),
    });
    setPickerQuery("");
    setDialogOpen(true);
  }

  async function saveItem() {
    if (!form.entity_id) {
      showToast({ type: "error", title: `Please select a ${entityLabel.toLowerCase()}` });
      return;
    }

    const sortOrder = Number(form.sort_order);
    if (!Number.isFinite(sortOrder)) {
      showToast({ type: "error", title: "Sort order must be a valid number" });
      return;
    }

    const payload = {
      [entityIdKey]: form.entity_id,
      custom_title: null,
      custom_venue: null,
      custom_offer: null,
      custom_image_url: null,
      sort_order: sortOrder,
      is_active: form.is_active,
    };

    try {
      setSaving(true);
      const endpoint = editingItem ? `${API_BASE}${apiPath}/${cardId}/items/${editingItem.id}` : `${API_BASE}${apiPath}/${cardId}/items`;

      const response = await fetch(endpoint, {
        method: editingItem ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await getErrorFromResponse(response, "Failed to save item."));
      }

      showToast({ title: editingItem ? "Item updated" : "Item added" });
      setDialogOpen(false);
      setEditingItem(null);
      setForm(initialItemForm);
      await loadCard();
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: "Failed to save item",
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
      const response = await fetch(`${API_BASE}${apiPath}/${cardId}/items/${deletingItem.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await getErrorFromResponse(response, "Failed to delete item."));
      }

      showToast({ title: "Item deleted" });
      setDeletingItem(null);
      await loadCard();
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: "Failed to delete item",
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
      const response = await fetch(`${API_BASE}${apiPath}/${cardId}/items/reorder`, {
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
      await loadCard();
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
                  <div className="mb-3 flex items-center gap-3">
                    <Button asChild variant="outline" size="sm" className="h-9 rounded-xl border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 shadow-sm hover:bg-slate-50">
                      <Link href={basePath}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {backLabel}
                      </Link>
                    </Button>
                  </div>
                  <CardTitle className="text-[18px] leading-6 text-slate-900">{card?.title || pageTitle}</CardTitle>
                  <CardDescription className="mt-1 text-[12px] leading-5 text-slate-500">{card?.subtitle || pageDescription}</CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    className="h-10 rounded-2xl border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    onClick={() => void saveReorder()}
                    disabled={!orderDirty || reorderSaving}
                  >
                    {reorderSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save order
                  </Button>
                  <Button className="h-10 rounded-2xl bg-[#5800AB] px-5 text-sm text-white shadow-[0_10px_20px_rgba(88,0,171,0.25)] hover:bg-[#4a0090]" onClick={openCreateDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add {entityLabel}
                  </Button>
                </div>
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
                Loading {entityPluralLabel.toLowerCase()}...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="rounded-[16px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
                <p className="text-sm font-medium text-slate-900">{emptyTitle}</p>
                <p className="mt-2 text-sm text-slate-500">{emptyDescription}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredItems.map((item) => {
                  const actualIndex = items.findIndex((candidate) => candidate.id === item.id);
                  const entityId = getItemEntityId(item, entityIdKey);
                  const option = optionsMap.get(entityId);
                  const nested = entityNestedKey === "restaurant" ? item.restaurant : item.store;
                  const meta = optionMeta(option || nested || { id: "", name: "" });

                  return (
                    <div
                      key={item.id}
                      className="rounded-[14px] border border-slate-200/80 px-4 py-4 shadow-[0_2px_14px_rgba(15,23,42,0.07)] transition-shadow hover:shadow-[0_6px_20px_rgba(15,23,42,0.09)]"
                      style={{
                        background:
                          "linear-gradient(0deg, #FFFFFF, #FFFFFF), linear-gradient(142.22deg, #ECFEFF 4.91%, #F3E8FF 95.09%)",
                      }}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-[14px] font-semibold leading-5 text-slate-900">
                            {resolveItemLabel(item, optionsMap, entityNestedKey, entityIdKey)}
                            </p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium leading-4 ${
                              item.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                            }`}
                            >
                              {item.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <p className="mt-1 text-[12px] leading-5 text-slate-500">{meta || `${entityLabel} linked to this card.`}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] leading-4 text-slate-400">
                            <span>Sort: {item.sort_order ?? 0}</span>
                            <span>ID: {entityId}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                          <Button
                            variant="outline"
                            className="h-9 rounded-xl border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 shadow-sm hover:bg-slate-50"
                            onClick={() => moveItem(actualIndex, -1)}
                            disabled={actualIndex <= 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            className="h-9 rounded-xl border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 shadow-sm hover:bg-slate-50"
                            onClick={() => moveItem(actualIndex, 1)}
                            disabled={actualIndex === items.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" className="h-9 rounded-xl border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 shadow-sm hover:bg-slate-50" onClick={() => openEditDialog(item)}>
                            <Image src="/restaurentpasspriveedit.png" alt="Edit" width={14} height={14} className="mr-2 h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button variant="outline" className="h-9 rounded-xl border-red-200 bg-white px-3 text-[13px] font-medium text-red-600 shadow-sm hover:bg-red-50 hover:text-red-700" onClick={() => setDeletingItem(item)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? `Edit ${entityLabel.toLowerCase()}` : `Add ${entityLabel.toLowerCase()}`}</DialogTitle>
            <DialogDescription>Select a {entityLabel.toLowerCase()} and choose how it should appear in this card.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>{entityLabel}</Label>
              <Button type="button" variant="outline" className="justify-between bg-white" onClick={() => setPickerOpen(true)}>
                <span className="truncate text-left">
                  {selectedEntity ? `${selectedEntity.name}${selectedEntity.city ? ` • ${selectedEntity.city}` : ""}` : `Select a ${entityLabel.toLowerCase()}`}
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
                  <p className="text-xs text-slate-500">Turn this item off without removing the whole card.</p>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm((current) => ({ ...current, is_active: checked }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void saveItem()} disabled={saving} className="bg-slate-900 text-white hover:bg-slate-800">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingItem ? "Save changes" : `Add ${entityLabel}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select {entityLabel.toLowerCase()}</DialogTitle>
            <DialogDescription>{pickerPlaceholder}</DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-slate-200">
            <Command shouldFilter={false}>
              <CommandInput placeholder={`Search ${entityPluralLabel.toLowerCase()}...`} value={pickerQuery} onValueChange={setPickerQuery} />
              <CommandList>
                {filteredOptions.length === 0 ? <CommandEmpty>No {entityPluralLabel.toLowerCase()} found.</CommandEmpty> : null}
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={`${option.name} ${option.city || ""} ${option.area || ""} ${option.category || ""} ${option.subcategory || ""}`}
                    onSelect={() => {
                      setForm((current) => ({ ...current, entity_id: option.id }));
                      setPickerOpen(false);
                    }}
                    className="flex items-start justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{option.name}</p>
                      <p className="truncate text-xs text-slate-500">{optionMeta(option)}</p>
                    </div>
                    <Store className="h-4 w-4 text-slate-400" />
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
              This will remove the linked {entityLabel.toLowerCase()} from the card.
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

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Check,
  Loader2,
  Pencil,
  Plus,
  Search,
  Store,
  Trash2,
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

type RestaurantOption = {
  id: string;
  name: string;
  city?: string | null;
  area?: string | null;
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
  restaurant_id: string;
  custom_title?: string | null;
  custom_venue?: string | null;
  custom_offer?: string | null;
  custom_image_url?: string | null;
  sort_order: number;
  is_active: boolean;
  restaurant?: {
    id?: string;
    name?: string | null;
    city?: string | null;
    area?: string | null;
  } | null;
};

type ItemFormState = {
  restaurant_id: string;
  sort_order: string;
  is_active: boolean;
};

const initialItemForm: ItemFormState = {
  restaurant_id: "",
  sort_order: "100",
  is_active: true,
};

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

function formatDatelessLabel(item: RestaurantOption) {
  return [item.name, item.area, item.city].filter(Boolean).join(" • ");
}

function resolveRestaurantLabel(item: CardItem, restaurantsMap: Map<string, RestaurantOption>) {
  const selected = restaurantsMap.get(item.restaurant_id);
  const fallback = item.restaurant;
  return (
    selected?.name ||
    fallback?.name ||
    item.custom_venue ||
    item.restaurant_id
  );
}

export default function InYourPassPriveDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const cardId = params?.id as string;

  const [card, setCard] = useState<PassPriveCard | null>(null);
  const [items, setItems] = useState<CardItem[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reorderSaving, setReorderSaving] = useState(false);
  const [orderDirty, setOrderDirty] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CardItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<CardItem | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const [form, setForm] = useState<ItemFormState>(initialItemForm);

  const restaurantsMap = useMemo(
    () => new Map(restaurants.map((restaurant) => [restaurant.id, restaurant])),
    [restaurants]
  );

  const selectedRestaurant = restaurantsMap.get(form.restaurant_id) || null;

  const filteredRestaurants = useMemo(() => {
    const search = pickerQuery.trim().toLowerCase();
    if (!search) return restaurants;
    return restaurants.filter((restaurant) =>
      [restaurant.name, restaurant.city || "", restaurant.area || ""].join(" ").toLowerCase().includes(search)
    );
  }, [pickerQuery, restaurants]);

  const loadCard = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/inyourpassprive/${cardId}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(await getErrorFromResponse(response, "Failed to load card details."));
      }

      const payload = await parseResponse(response);
      const extracted = extractCardPayload(payload);
      setCard(extracted.card);
      setItems(
        [...extracted.items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      );
      setOrderDirty(false);
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: "Failed to load card details",
        description: error instanceof Error ? error.message : "Unable to fetch card data.",
      });
      router.push("/dashboard/in-your-passprive");
    } finally {
      setLoading(false);
    }
  }, [cardId, router]);

  useEffect(() => {
    void loadCard();
  }, [loadCard]);

  useEffect(() => {
    void loadRestaurants();
  }, []);

  async function loadRestaurants() {
    const { data, error } = await supabaseBrowser
      .from("restaurants")
      .select("id,name,city,area")
      .order("name", { ascending: true });

    if (error) {
      showToast({
        type: "error",
        title: "Failed to load restaurants",
        description: error.message,
      });
      return;
    }

    setRestaurants((data as RestaurantOption[]) || []);
  }

  function openCreateDialog() {
    setEditingItem(null);
    setForm(initialItemForm);
    setPickerQuery("");
    setDialogOpen(true);
  }

  function openEditDialog(item: CardItem) {
    setEditingItem(item);
    setForm({
      restaurant_id: item.restaurant_id,
      sort_order: String(item.sort_order ?? 100),
      is_active: Boolean(item.is_active),
    });
    setPickerQuery("");
    setDialogOpen(true);
  }

  async function saveItem() {
    if (!form.restaurant_id) {
      showToast({ type: "error", title: "Please select a restaurant" });
      return;
    }

    const sortOrder = Number(form.sort_order);
    if (!Number.isFinite(sortOrder)) {
      showToast({ type: "error", title: "Sort order must be a valid number" });
      return;
    }

    const payload = {
      restaurant_id: form.restaurant_id,
      custom_title: null,
      custom_venue: null,
      custom_offer: null,
      custom_image_url: null,
      sort_order: sortOrder,
      is_active: form.is_active,
    };

    try {
      setSaving(true);
      const endpoint = editingItem
        ? `${API_BASE}/api/inyourpassprive/${cardId}/items/${editingItem.id}`
        : `${API_BASE}/api/inyourpassprive/${cardId}/items`;

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
      const response = await fetch(`${API_BASE}/api/inyourpassprive/${cardId}/items/${deletingItem.id}`, {
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
    const orderedPayload = items.map((item, index) => ({
      id: item.id,
      sort_order: index + 1,
    }));

    try {
      setReorderSaving(true);
      const response = await fetch(`${API_BASE}/api/inyourpassprive/${cardId}/items/reorder`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: orderedPayload,
          itemIds: orderedPayload.map((item) => item.id),
          item_ids: orderedPayload.map((item) => item.id),
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
    <div className="min-h-full bg-slate-100">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                <Store className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <Button asChild variant="outline" size="sm" className="bg-white">
                    <Link href="/dashboard/in-your-passprive">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Link>
                  </Button>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{card?.title || "Manage Items"}</h1>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {card?.subtitle || "Manage restaurants, overrides, and order for this card."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void loadCard()} disabled={loading} className="bg-white">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Refresh
              </Button>
              <Button className="bg-slate-900 text-white hover:bg-slate-800" onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add restaurant item
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
                <CardTitle className="text-lg">Card items</CardTitle>
                <CardDescription>Each item points to a restaurant with optional custom overrides.</CardDescription>
              </div>
              {orderDirty ? (
                <Button className="bg-slate-900 text-white hover:bg-slate-800" onClick={() => void saveReorder()} disabled={reorderSaving}>
                  {reorderSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Save order
                </Button>
              ) : null}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="flex h-64 items-center justify-center text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading items...
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {items.map((item, index) => (
                  <div key={item.id} className="px-6 py-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-base font-semibold text-slate-900">
                            {item.custom_title || resolveRestaurantLabel(item, restaurantsMap)}
                          </p>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                            {item.is_active ? "Active" : "Inactive"}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                            Sort {item.sort_order}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                          <span>Restaurant: {resolveRestaurantLabel(item, restaurantsMap)}</span>
                          <span>Sort: {item.sort_order}</span>
                          <span>Status: {item.is_active ? "Active" : "Inactive"}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => moveItem(index, -1)} disabled={index === 0}>
                          <ArrowUp className="mr-2 h-4 w-4" />
                          Up
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => moveItem(index, 1)} disabled={index === items.length - 1}>
                          <ArrowDown className="mr-2 h-4 w-4" />
                          Down
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(item)} className="bg-white">
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-200 bg-white text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setDeletingItem(item)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {items.length === 0 ? (
                  <div className="px-6 py-16 text-center text-slate-500">No items added to this card yet.</div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit item" : "Add restaurant item"}</DialogTitle>
            <DialogDescription>Pick a restaurant and optionally override what the card displays.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Restaurant</Label>
              <Button variant="outline" className="w-full justify-between bg-white" onClick={() => setPickerOpen(true)}>
                <span className="truncate">
                  {selectedRestaurant ? formatDatelessLabel(selectedRestaurant) : "Select restaurant"}
                </span>
                <Search className="h-4 w-4 text-slate-400" />
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="item-sort">Sort order</Label>
                <Input
                  id="item-sort"
                  type="number"
                  value={form.sort_order}
                  onChange={(event) => setForm((current) => ({ ...current, sort_order: event.target.value }))}
                />
              </div>

              <div className="flex items-end">
                <div className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Active</p>
                    <p className="text-xs text-slate-500">Show or hide this restaurant item.</p>
                  </div>
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(checked) => setForm((current) => ({ ...current, is_active: checked }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button className="bg-slate-900 text-white hover:bg-slate-800" onClick={() => void saveItem()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingItem ? "Save changes" : "Add item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Select restaurant</DialogTitle>
            <DialogDescription>Search and choose a restaurant for this card item.</DialogDescription>
          </DialogHeader>
          <Command>
            <CommandInput
              placeholder="Search restaurant by name, area, or city..."
              value={pickerQuery}
              onValueChange={setPickerQuery}
            />
            <CommandList>
              <CommandEmpty>No restaurants found.</CommandEmpty>
              {filteredRestaurants.map((restaurant) => (
                <CommandItem
                  key={restaurant.id}
                  value={`${restaurant.name} ${restaurant.city ?? ""} ${restaurant.area ?? ""}`}
                  onSelect={() => {
                    setForm((current) => ({ ...current, restaurant_id: restaurant.id }));
                    setPickerOpen(false);
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-900">{restaurant.name}</span>
                    <span className="text-xs text-slate-500">{formatDatelessLabel(restaurant)}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingItem)} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the linked restaurant item from this card.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" onClick={() => void deleteItem()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

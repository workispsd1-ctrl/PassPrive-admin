"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Plus,
  Search,
  Store,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  API_BASE,
  StoreCampaign,
  StoreCampaignItem,
  StoreOption,
  extractCampaigns,
  extractErrorMessage,
  extractItems,
  formatDate,
  getErrorFromResponse,
  isForbiddenResponse,
  parseResponse,
  resolveStoreField,
} from "../_lib";

type ItemFormState = {
  store_id: string;
  sort_order: string;
  is_active: boolean;
};

const initialItemForm: ItemFormState = {
  store_id: "",
  sort_order: "100",
  is_active: true,
};

function normalizeStoreOption(record: Record<string, unknown>): StoreOption | null {
  const id = typeof record.id === "string" ? record.id : null;
  const name = typeof record.name === "string" ? record.name : null;
  if (!id || !name) return null;

  return {
    id,
    name,
    city: typeof record.city === "string" ? record.city : null,
    category: typeof record.category === "string" ? record.category : null,
    subcategory: typeof record.subcategory === "string" ? record.subcategory : null,
  };
}

export default function StoreCampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const campaignId = params?.id as string;

  const [campaign, setCampaign] = useState<StoreCampaign | null>(null);
  const [items, setItems] = useState<StoreCampaignItem[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchingStores, setSearchingStores] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StoreCampaignItem | null>(null);
  const [removingItem, setRemovingItem] = useState<StoreCampaignItem | null>(null);
  const [form, setForm] = useState<ItemFormState>(initialItemForm);
  const [query, setQuery] = useState("");
  const [storeSearch, setStoreSearch] = useState("");

  const storesMap = useMemo(
    () => new Map(stores.map((store) => [store.id, store])),
    [stores]
  );

  const filteredItems = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return items;

    return items.filter((item) =>
      [
        resolveStoreField(item, "name"),
        resolveStoreField(item, "city"),
        resolveStoreField(item, "category"),
        resolveStoreField(item, "subcategory"),
        item.source_type,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [items, query]);

  const selectedStore =
    storesMap.get(form.store_id) ||
    (editingItem
      ? {
          id: editingItem.store_id,
          name: resolveStoreField(editingItem, "name"),
          city: resolveStoreField(editingItem, "city"),
          category: resolveStoreField(editingItem, "category"),
          subcategory: resolveStoreField(editingItem, "subcategory"),
        }
      : null);

  const loadCampaignContext = useCallback(async () => {
    try {
      setLoading(true);
      setPageError(null);

      const [campaignsResponse, itemsResponse] = await Promise.all([
        fetch(`${API_BASE}/api/stores-home/sections`, {
          method: "GET",
          cache: "no-store",
        }),
        fetch(`${API_BASE}/api/stores-home/sections/${campaignId}/items`, {
          method: "GET",
          cache: "no-store",
        }),
      ]);

      if (!campaignsResponse.ok) {
        if (isForbiddenResponse(campaignsResponse)) {
          setPageError("You do not have permission to view store campaigns.");
          return;
        }
        throw new Error(await getErrorFromResponse(campaignsResponse, "Failed to load campaigns."));
      }

      if (!itemsResponse.ok) {
        if (isForbiddenResponse(itemsResponse)) {
          setPageError("You do not have permission to manage stores in this campaign.");
          return;
        }
        throw new Error(await getErrorFromResponse(itemsResponse, "Failed to load campaign stores."));
      }

      const [campaignsPayload, itemsPayload] = await Promise.all([
        parseResponse(campaignsResponse),
        parseResponse(itemsResponse),
      ]);

      const matchedCampaign = extractCampaigns(campaignsPayload).find((item) => item.id === campaignId) || null;
      const extractedItems = extractItems(itemsPayload).sort(
        (left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0)
      );

      if (!matchedCampaign) {
        setPageError("Campaign not found.");
        return;
      }

      setCampaign(matchedCampaign);
      setItems(extractedItems);
    } catch (error: unknown) {
      setPageError(extractErrorMessage(error, "Unable to load campaign details."));
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void loadCampaignContext();
  }, [loadCampaignContext]);

  useEffect(() => {
    void loadStores("");
  }, []);

  async function loadStores(searchTerm: string) {
    try {
      setSearchingStores(true);

      let queryBuilder = supabaseBrowser
        .from("stores")
        .select("id,name,city,category,subcategory")
        .order("name", { ascending: true })
        .limit(20);

      const trimmed = searchTerm.trim();
      if (trimmed) {
        queryBuilder = queryBuilder.or(
          `name.ilike.%${trimmed}%,city.ilike.%${trimmed}%,category.ilike.%${trimmed}%,subcategory.ilike.%${trimmed}%`
        );
      }

      const { data, error } = await queryBuilder;
      if (error) throw error;

      const nextStores = ((data as Record<string, unknown>[] | null) || [])
        .map(normalizeStoreOption)
        .filter(Boolean) as StoreOption[];

      setStores(nextStores);
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: "Failed to load stores",
        description: extractErrorMessage(error, "Store search is unavailable right now."),
      });
    } finally {
      setSearchingStores(false);
    }
  }

  function resetForm() {
    setForm(initialItemForm);
    setEditingItem(null);
    setStoreSearch("");
  }

  function openCreateDialog() {
    resetForm();
    setDialogOpen(true);
  }

  function openEditDialog(item: StoreCampaignItem) {
    setEditingItem(item);
    setForm({
      store_id: item.store_id,
      sort_order: String(item.sort_order ?? 100),
      is_active: Boolean(item.is_active),
    });
    setStoreSearch("");
    setDialogOpen(true);
  }

  async function saveItem() {
    if (!form.store_id) {
      showToast({ type: "error", title: "Please select a store" });
      return;
    }

    const sortOrder = Number(form.sort_order);
    if (!Number.isFinite(sortOrder)) {
      showToast({ type: "error", title: "Sort order must be a valid number" });
      return;
    }

    try {
      setSaving(true);
      const endpoint = editingItem
        ? `${API_BASE}/api/stores-home/sections/${campaignId}/items/${editingItem.id}`
        : `${API_BASE}/api/stores-home/sections/${campaignId}/items`;

      const response = await fetch(endpoint, {
        method: editingItem ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          store_id: form.store_id,
          sort_order: sortOrder,
          is_active: form.is_active,
        }),
      });

      if (!response.ok) {
        if (isForbiddenResponse(response)) {
          throw new Error("You do not have permission to perform this action.");
        }
        throw new Error(await getErrorFromResponse(response, "Failed to save campaign item."));
      }

      showToast({
        title: editingItem ? "Campaign item updated" : "Store added to campaign",
      });
      setDialogOpen(false);
      resetForm();
      await loadCampaignContext();
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: "Failed to save campaign item",
        description: extractErrorMessage(error, "Save failed."),
      });
    } finally {
      setSaving(false);
    }
  }

  async function removeItem() {
    if (!removingItem) return;

    try {
      setSaving(true);
      const response = await fetch(
        `${API_BASE}/api/stores-home/sections/${campaignId}/items/${removingItem.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        if (isForbiddenResponse(response)) {
          throw new Error("You do not have permission to perform this action.");
        }
        throw new Error(await getErrorFromResponse(response, "Failed to remove store from campaign."));
      }

      showToast({ title: "Store removed from campaign" });
      setRemovingItem(null);
      await loadCampaignContext();
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: "Failed to remove store",
        description: extractErrorMessage(error, "Remove failed."),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline">
          <Link href="/dashboard/store-campaign">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to campaigns
          </Link>
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void loadCampaignContext()} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Refresh
          </Button>
          <Button onClick={openCreateDialog} className="bg-slate-900 text-white hover:bg-slate-800">
            <Plus className="mr-2 h-4 w-4" />
            Add Store
          </Button>
        </div>
      </div>

      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-2xl font-semibold text-slate-900">
            {campaign?.title || "Store Campaign"}
          </CardTitle>
          <CardDescription className="space-y-2 text-sm text-slate-600">
            <span className="block">{campaign?.subtitle || "Manage the stores attached to this campaign."}</span>
            {campaign ? (
              <span className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                <span className="font-mono">/{campaign.slug}</span>
                <span>Max items: {campaign.max_items ?? "—"}</span>
                <span>Updated: {formatDate(campaign.updated_at || campaign.created_at)}</span>
                <span>Status: {campaign.is_active ? "Active" : "Inactive"}</span>
              </span>
            ) : null}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-3 px-6 py-20 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading campaign stores...
            </div>
          ) : pageError ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm font-medium text-slate-900">{pageError}</p>
              <p className="mt-2 text-sm text-slate-500">
                Try again later or check whether the backend is returning this campaign to your account.
              </p>
            </div>
          ) : (
            <>
              <div className="border-b border-slate-100 px-6 py-4">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search store name, city, category, or source type..."
                  className="max-w-md"
                />
              </div>

              {filteredItems.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <p className="text-sm font-medium text-slate-900">No stores attached yet.</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Add a manual store to this campaign or wait for AUTO rows to appear from backend sync.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-base font-semibold text-slate-900">
                            {resolveStoreField(item, "name")}
                          </p>
                          <Badge
                            variant="outline"
                            className={
                              item.source_type === "MANUAL"
                                ? "border-blue-200 bg-blue-50 text-blue-700"
                                : "border-amber-200 bg-amber-50 text-amber-700"
                            }
                          >
                            {item.source_type || "AUTO"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={
                              item.is_active
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-slate-100 text-slate-600"
                            }
                          >
                            {item.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
                          <span>{resolveStoreField(item, "city")}</span>
                          <span>
                            {resolveStoreField(item, "category")}
                            {resolveStoreField(item, "subcategory") !== "—"
                              ? ` • ${resolveStoreField(item, "subcategory")}`
                              : ""}
                          </span>
                          <span>Sort order: {item.sort_order ?? "—"}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => openEditDialog(item)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant={item.is_active ? "destructive" : "outline"}
                          onClick={() => setRemovingItem(item)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {item.is_active ? "Remove" : "Remove Again"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit campaign item" : "Add store to campaign"}</DialogTitle>
            <DialogDescription>
              AUTO and MANUAL rows are both manageable here. Keep sort order and active state tuned for this campaign.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Store</Label>
              <Button
                type="button"
                variant="outline"
                className="justify-between"
                onClick={() => {
                  setPickerOpen(true);
                  void loadStores(storeSearch);
                }}
              >
                <span className="truncate text-left">
                  {selectedStore
                    ? [selectedStore.name, selectedStore.city].filter(Boolean).join(" • ")
                    : "Select a store"}
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

              <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 md:mt-7">
                <div>
                  <p className="text-sm font-medium text-slate-900">Item active</p>
                  <p className="text-xs text-slate-500">Disable this row without losing it from the campaign.</p>
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
              {editingItem ? "Save changes" : "Add store"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select store</DialogTitle>
            <DialogDescription>Search by store name, city, category, or subcategory.</DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-slate-200">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search stores..."
                value={storeSearch}
                onValueChange={(value) => {
                  setStoreSearch(value);
                  void loadStores(value);
                }}
              />
              <CommandList>
                {searchingStores ? (
                  <div className="flex items-center gap-2 px-4 py-6 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading stores...
                  </div>
                ) : null}
                {!searchingStores && stores.length === 0 ? (
                  <CommandEmpty>No stores found.</CommandEmpty>
                ) : null}
                {!searchingStores &&
                  stores.map((store) => (
                    <CommandItem
                      key={store.id}
                      value={`${store.name} ${store.city || ""} ${store.category || ""} ${store.subcategory || ""}`}
                      onSelect={() => {
                        setForm((current) => ({
                          ...current,
                          store_id: store.id,
                        }));
                        setPickerOpen(false);
                      }}
                      className="flex items-start justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{store.name}</p>
                        <p className="truncate text-xs text-slate-500">
                          {[store.city, store.category, store.subcategory].filter(Boolean).join(" • ")}
                        </p>
                      </div>
                      {form.store_id === store.id ? <Store className="h-4 w-4 text-slate-400" /> : null}
                    </CommandItem>
                  ))}
              </CommandList>
            </Command>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(removingItem)} onOpenChange={(open) => !open && setRemovingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove store from campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This will use the backend&apos;s remove flow for this campaign item. You can re-add the store later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void removeItem();
              }}
              disabled={saving}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

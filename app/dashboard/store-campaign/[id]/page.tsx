"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
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
import {
  StoreCampaign,
  StoreCampaignItem,
  StoreOption,
  extractErrorMessage,
  formatDate,
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

      const [{ data: campaignRow, error: campaignError }, { data: itemRows, error: itemsError }] =
        await Promise.all([
          supabaseBrowser
            .from("stores_home_sections")
            .select("id,slug,title,subtitle,is_active,max_items,starts_at,ends_at,thumbnail_url,created_at,updated_at")
            .eq("id", campaignId)
            .maybeSingle(),
          supabaseBrowser
            .from("stores_home_section_items")
            .select("id,section_id,store_id,source_type,sort_order,is_active,created_at,updated_at")
            .eq("section_id", campaignId)
            .order("sort_order", { ascending: true }),
        ]);

      if (campaignError) throw campaignError;
      if (itemsError) throw itemsError;

      if (!campaignRow) {
        setPageError("Campaign not found.");
        return;
      }

      const storeIds = Array.from(
        new Set(
          (((itemRows as StoreCampaignItem[] | null) || []).map((item) => item.store_id).filter(Boolean))
        )
      );

      let storeDetailsMap = new Map<string, StoreOption>();
      if (storeIds.length > 0) {
        const { data: storeRows, error: storesError } = await supabaseBrowser
          .from("stores")
          .select("id,name,city,category,subcategory")
          .in("id", storeIds);

        if (storesError) throw storesError;

        storeDetailsMap = new Map(
          (((storeRows as Record<string, unknown>[] | null) || [])
            .map(normalizeStoreOption)
            .filter(Boolean) as StoreOption[]).map((store) => [store.id, store])
        );
      }

      const extractedItems = (((itemRows as StoreCampaignItem[] | null) || []).map((item) => ({
        ...item,
        store: storeDetailsMap.get(item.store_id) || null,
      })) as StoreCampaignItem[]).sort(
        (left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0)
      );

      setCampaign(campaignRow as StoreCampaign);
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
      const payload = {
        section_id: campaignId,
        store_id: form.store_id,
        source_type: "MANUAL",
        sort_order: sortOrder,
        is_active: form.is_active,
      };

      if (editingItem) {
        const { error } = await supabaseBrowser
          .from("stores_home_section_items")
          .update(payload)
          .eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabaseBrowser.from("stores_home_section_items").insert(payload);
        if (error) throw error;
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
      const { error } = await supabaseBrowser
        .from("stores_home_section_items")
        .delete()
        .eq("id", removingItem.id);
      if (error) throw error;

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
                      <Link href="/dashboard/store-campaign">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to campaigns
                      </Link>
                    </Button>
                  </div>

                  <CardTitle className="text-[18px] leading-6 text-slate-900">{campaign?.title || "Store Campaign"}</CardTitle>
                  <CardDescription className="mt-1 text-[12px] leading-5 text-slate-500">
                    {campaign?.subtitle || "Manage the stores attached to this campaign."}
                  </CardDescription>
                  {campaign ? (
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] leading-4 text-slate-400">
                      <span className="font-mono">/{campaign.slug}</span>
                      <span>Max items: {campaign.max_items ?? "—"}</span>
                      <span>Updated: {formatDate(campaign.updated_at || campaign.created_at)}</span>
                      <span>Status: {campaign.is_active ? "Active" : "Inactive"}</span>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" className="h-10 rounded-2xl border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50" onClick={() => void loadCampaignContext()} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Refresh
                  </Button>
                  <Button onClick={openCreateDialog} className="h-10 rounded-2xl bg-[#5800AB] px-5 text-sm text-white shadow-[0_10px_20px_rgba(88,0,171,0.25)] hover:bg-[#4a0090]">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Store
                  </Button>
                </div>
              </div>

              <div className="relative w-full lg:max-w-[1120px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search store name, city, category, or source type..."
                  className="h-10 rounded-xl border-slate-200 bg-white pl-10 text-sm shadow-[0_1px_0_rgba(15,23,42,0.02)] placeholder:text-slate-400"
                />
              </div>
            </CardHeader>

            <CardContent className="px-4 py-4 sm:px-5">
          {loading ? (
            <div className="flex items-center justify-center gap-3 rounded-[16px] border border-dashed border-slate-200 bg-white px-6 py-20 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading campaign stores...
            </div>
          ) : pageError ? (
            <div className="rounded-[16px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
              <p className="text-sm font-medium text-slate-900">{pageError}</p>
              <p className="mt-2 text-sm text-slate-500">
                Try again later or check whether the backend is returning this campaign to your account.
              </p>
            </div>
          ) : (
            <>
              {filteredItems.length === 0 ? (
                <div className="rounded-[16px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
                  <p className="text-sm font-medium text-slate-900">No stores attached yet.</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Add a manual store to this campaign or wait for AUTO rows to appear from backend sync.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {filteredItems.map((item) => (
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
                            <p className="truncate text-[14px] font-semibold leading-5 text-slate-900">{resolveStoreField(item, "name")}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium leading-4 ${item.source_type === "MANUAL" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>
                              {item.source_type || "AUTO"}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium leading-4 ${item.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                              {item.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] leading-5 text-slate-500">
                            <span>{resolveStoreField(item, "city")}</span>
                            <span>
                              {resolveStoreField(item, "category")}
                              {resolveStoreField(item, "subcategory") !== "—"
                                ? ` • ${resolveStoreField(item, "subcategory")}`
                                : ""}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] leading-4 text-slate-400">
                            <span>Sort order: {item.sort_order ?? "—"}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                          <Button variant="outline" className="h-9 rounded-xl border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 shadow-sm hover:bg-slate-50" onClick={() => openEditDialog(item)}>
                            <Image src="/restaurentpasspriveedit.png" alt="Edit" width={14} height={14} className="mr-2 h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button variant="outline" className="h-9 rounded-xl border-red-200 bg-white px-3 text-[13px] font-medium text-red-600 shadow-sm hover:bg-red-50 hover:text-red-700" onClick={() => setRemovingItem(item)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            {item.is_active ? "Remove" : "Remove Again"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
            </CardContent>
          </Card>
        </div>
      </div>

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

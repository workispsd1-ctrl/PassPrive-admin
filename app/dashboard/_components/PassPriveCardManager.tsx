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
import { supabaseBrowser } from "@/lib/supabaseBrowser";

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

type PassPriveCard = {
  id: string;
  title: string;
  subtitle?: string | null;
  city?: string | null;
  is_active: boolean;
  sort_order: number;
  updated_at?: string;
  item_count?: number | null;
  items?: unknown[];
};

type CardFormState = {
  title: string;
  subtitle: string;
  is_active: boolean;
  sort_order: string;
};

const initialForm: CardFormState = {
  title: "",
  subtitle: "",
  is_active: true,
  sort_order: "100",
};

const CARD_CACHE_TTL_MS = 30_000;
const cardCache = new Map<string, { data: PassPriveCard[]; expiresAt: number }>();

type PassPriveCardManagerProps = {
  apiPath: string;
  basePath: string;
  pageTitle: string;
  description: string;
  searchPlaceholder: string;
  emptyTitle: string;
  emptyDescription: string;
  detailLabel: string;
  icon: LucideIcon;
  editIconSrc?: string;
  manageIconSrc?: string;
  supabaseTable?: string;
  supabaseItemsTable?: string;
};

function extractCards(payload: unknown): PassPriveCard[] {
  if (Array.isArray(payload)) return payload as PassPriveCard[];

  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  if (!record) return [];

  for (const key of ["cards", "data", "items", "results"]) {
    if (Array.isArray(record[key])) return record[key] as PassPriveCard[];
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

function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function itemCount(card: PassPriveCard) {
  if (typeof card.item_count === "number") return card.item_count;
  if (Array.isArray(card.items)) return card.items.length;
  return 0;
}

export default function PassPriveCardManager({
  apiPath,
  basePath,
  pageTitle,
  searchPlaceholder,
  emptyTitle,
  emptyDescription,
  detailLabel,
  editIconSrc,
  manageIconSrc,
  supabaseTable,
  supabaseItemsTable,
}: PassPriveCardManagerProps) {
  const [cards, setCards] = useState<PassPriveCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<PassPriveCard | null>(null);
  const [deletingCard, setDeletingCard] = useState<PassPriveCard | null>(null);
  const [form, setForm] = useState<CardFormState>(initialForm);
  const [query, setQuery] = useState("");

  const filteredCards = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return cards;
    return cards.filter((card) => [card.title, card.subtitle || "", card.city || ""].join(" ").toLowerCase().includes(search));
  }, [cards, query]);

  const loadCards = useCallback(async () => {
    try {
      setLoading(true);
      const cacheKey = supabaseTable ? `sb:${supabaseTable}:${supabaseItemsTable || ""}` : `api:${apiPath}`;
      const cached = cardCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        setCards(cached.data);
        setLoading(false);
        return;
      }

      if (supabaseTable) {
        const { data, error } = await supabaseBrowser
          .from(supabaseTable)
          .select("id,title,subtitle,city,is_active,sort_order,updated_at")
          .order("sort_order", { ascending: true });

        if (error) throw error;

        let countsByCardId = new Map<string, number>();
        if (supabaseItemsTable) {
          const cardIds = (data || []).map((card) => String(card.id));
          if (cardIds.length > 0) {
            const { data: itemRows, error: itemsError } = await supabaseBrowser
              .from(supabaseItemsTable)
              .select("card_id")
              .in("card_id", cardIds);

            if (itemsError) throw itemsError;

            countsByCardId = (itemRows || []).reduce((accumulator, row) => {
              const cardId = typeof row.card_id === "string" ? row.card_id : null;
              if (!cardId) return accumulator;
              accumulator.set(cardId, (accumulator.get(cardId) || 0) + 1);
              return accumulator;
            }, new Map<string, number>());
          }
        }

        const nextCards = ((data as PassPriveCard[] | null) || []).map((card) => ({
            ...card,
            item_count: countsByCardId.get(card.id) || 0,
          }));

        setCards(nextCards);
        cardCache.set(cacheKey, { data: nextCards, expiresAt: Date.now() + CARD_CACHE_TTL_MS });
        return;
      }

      const response = await fetch(`${API_BASE}${apiPath}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(await getErrorFromResponse(response, "Failed to load cards."));
      }

      const payload = await parseResponse(response);
      const nextCards = extractCards(payload);
      setCards(nextCards);
      cardCache.set(cacheKey, { data: nextCards, expiresAt: Date.now() + CARD_CACHE_TTL_MS });
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: `Failed to load ${pageTitle}`,
        description: error instanceof Error ? error.message : "Unable to fetch cards.",
      });
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [apiPath, pageTitle, supabaseItemsTable, supabaseTable]);

  useEffect(() => {
    void loadCards();
  }, [loadCards]);

  function openCreateDialog() {
    setEditingCard(null);
    setForm(initialForm);
    setDialogOpen(true);
  }

  function openEditDialog(card: PassPriveCard) {
    setEditingCard(card);
    setForm({
      title: card.title || "",
      subtitle: card.subtitle || "",
      is_active: Boolean(card.is_active),
      sort_order: String(card.sort_order ?? 100),
    });
    setDialogOpen(true);
  }

  async function saveCard() {
    if (!form.title.trim()) {
      showToast({ type: "error", title: "Title is required" });
      return;
    }

    if (!form.subtitle.trim()) {
      showToast({ type: "error", title: "Subtitle is required" });
      return;
    }

    const sortOrder = Number(form.sort_order);
    if (!Number.isFinite(sortOrder)) {
      showToast({ type: "error", title: "Sort order must be a valid number" });
      return;
    }

    const payload = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      city: null,
      is_active: form.is_active,
      sort_order: sortOrder,
    };

    try {
      setSaving(true);
      if (supabaseTable) {
        const query = editingCard
          ? supabaseBrowser.from(supabaseTable).update(payload).eq("id", editingCard.id)
          : supabaseBrowser.from(supabaseTable).insert(payload);

        const { error } = await query;
        if (error) throw error;
      } else {
        const endpoint = editingCard ? `${API_BASE}${apiPath}/${editingCard.id}` : `${API_BASE}${apiPath}`;

        const response = await fetch(endpoint, {
          method: editingCard ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(await getErrorFromResponse(response, "Failed to save card."));
        }
      }

      showToast({ title: editingCard ? "Card updated" : "Card created" });
      const cacheKey = supabaseTable ? `sb:${supabaseTable}:${supabaseItemsTable || ""}` : `api:${apiPath}`;
      cardCache.delete(cacheKey);
      setDialogOpen(false);
      setEditingCard(null);
      setForm(initialForm);
      await loadCards();
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: "Failed to save card",
        description: error instanceof Error ? error.message : "Save failed.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function deleteCard() {
    if (!deletingCard) return;

    try {
      setSaving(true);
      if (supabaseTable) {
        if (supabaseItemsTable) {
          const { error: itemsError } = await supabaseBrowser.from(supabaseItemsTable).delete().eq("card_id", deletingCard.id);
          if (itemsError) throw itemsError;
        }

        const { error } = await supabaseBrowser.from(supabaseTable).delete().eq("id", deletingCard.id);
        if (error) throw error;
      } else {
        const response = await fetch(`${API_BASE}${apiPath}/${deletingCard.id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error(await getErrorFromResponse(response, "Failed to delete card."));
        }
      }

      showToast({ title: "Card deleted" });
      const cacheKey = supabaseTable ? `sb:${supabaseTable}:${supabaseItemsTable || ""}` : `api:${apiPath}`;
      cardCache.delete(cacheKey);
      setDeletingCard(null);
      await loadCards();
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: "Failed to delete card",
        description: error instanceof Error ? error.message : "Delete failed.",
      });
    } finally {
      setSaving(false);
    }
  }

  function openDeleteFromDialog() {
    if (!editingCard) return;
    setDeletingCard(editingCard);
    setDialogOpen(false);
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: "#FFFFFF4D",
      }}
    >
      <div
        className="mx-auto flex min-h-screen w-full max-w-[1360px] flex-col"
        style={{
          background: "#FFFFFF4D",
        }}
      >
        <div className="flex-1 px-4 pb-8 pt-6 sm:px-5 lg:px-6 lg:pt-7">
          <Card
            className="overflow-hidden rounded-[18px] border border-slate-200/70 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-sm"
            style={{
              background:
                "linear-gradient(310.35deg, rgba(255, 255, 255, 0.4) 4.07%, rgba(255, 255, 255, 0.3) 48.73%, rgba(255, 255, 255, 0.2) 100%)",
            }}
          >
            <CardHeader className="space-y-5 border-b border-slate-100/90 bg-white/70 px-5 py-5 sm:px-6 sm:py-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="text-[19px] leading-7 tracking-tight text-slate-900">Cards</CardTitle>
                  <CardDescription className="mt-1 max-w-2xl text-[13px] leading-6 text-slate-500">Create cards, adjust order, and open item management for each card.</CardDescription>
                </div>
                <Button className="h-11 rounded-2xl bg-[#5800AB] px-6 text-sm text-white shadow-[0_10px_20px_rgba(88,0,171,0.25)] hover:bg-[#4a0090]" onClick={openCreateDialog}>
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
                  className="h-11 rounded-2xl border-slate-200 bg-white pl-10 text-sm shadow-[0_1px_0_rgba(15,23,42,0.02)] placeholder:text-slate-400"
                />
              </div>
            </CardHeader>

            <CardContent className="px-5 py-6 sm:px-6 sm:py-6">
              {loading ? (
                <div className="flex items-center justify-center gap-3 rounded-[16px] border border-dashed border-slate-200 bg-white px-6 py-20 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading cards...
                </div>
              ) : filteredCards.length === 0 ? (
                <div className="rounded-[16px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
                  <p className="text-sm font-medium text-slate-900">{emptyTitle}</p>
                  <p className="mt-2 text-sm text-slate-500">{emptyDescription}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {filteredCards.map((card) => (
                    <div
                      key={card.id}
                      className="rounded-2xl border border-slate-200/80 px-5 py-5 shadow-[0_2px_14px_rgba(15,23,42,0.07)] transition-shadow hover:shadow-[0_6px_20px_rgba(15,23,42,0.09)]"
                      style={{
                        background:
                          "linear-gradient(0deg, #FFFFFF, #FFFFFF), linear-gradient(142.22deg, #ECFEFF 4.91%, #F3E8FF 95.09%)",
                      }}
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <p className="truncate text-[15px] font-semibold leading-6 text-slate-900">{card.title}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium leading-4 ${card.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                              {card.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <p className="mt-1.5 text-[13px] leading-6 text-slate-500">{card.subtitle || "No subtitle added yet."}</p>
                          <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] leading-4 text-slate-400">
                            <span>Sort: {card.sort_order ?? 0}</span>
                            <span>Items: {itemCount(card)}</span>
                            <span>Updated: {formatDate(card.updated_at)}</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
                          <Button variant="outline" className="h-10 rounded-xl border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-600 shadow-sm hover:bg-slate-50" onClick={() => openEditDialog(card)}>
                            {editIconSrc ? <Image src={editIconSrc} alt="Edit" width={14} height={14} className="mr-2 h-3.5 w-3.5" /> : null}
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            className="h-10 rounded-xl bg-red-600 px-4 text-[13px] font-medium text-white hover:bg-red-700"
                            onClick={() => setDeletingCard(card)}
                            disabled={saving}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Delete
                          </Button>
                          <Button asChild variant="outline" className="h-10 rounded-xl border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-600 shadow-sm hover:bg-slate-50">
                            <Link href={`${basePath}/${card.id}`}>
                              {manageIconSrc ? <Image src={manageIconSrc} alt="Manage" width={14} height={14} className="mr-2 h-3.5 w-3.5" /> : null}
                              {detailLabel}
                            </Link>
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
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingCard ? "Edit card" : "Create card"}</DialogTitle>
            <DialogDescription>Keep the setup simple and manage linked items from the next screen.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="card-title">Title</Label>
              <Input
                id="card-title"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Fresh picks around you"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="card-subtitle">Subtitle</Label>
              <Input
                id="card-subtitle"
                value={form.subtitle}
                onChange={(event) => setForm((current) => ({ ...current, subtitle: event.target.value }))}
                placeholder="Handpicked stores or venues for this section"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="sort-order">Sort order</Label>
                <Input
                  id="sort-order"
                  type="number"
                  value={form.sort_order}
                  onChange={(event) => setForm((current) => ({ ...current, sort_order: event.target.value }))}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 md:mt-7">
                <div>
                  <p className="text-sm font-medium text-slate-900">Card active</p>
                  <p className="text-xs text-slate-500">Turn off visibility without deleting the card.</p>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm((current) => ({ ...current, is_active: checked }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            {editingCard ? (
              <Button variant="destructive" onClick={openDeleteFromDialog} disabled={saving} className="mr-auto">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete card
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void saveCard()} disabled={saving} className="bg-[#5800AB] text-white hover:bg-[#4a0090]">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingCard ? "Save changes" : "Create card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingCard)} onOpenChange={(open) => !open && setDeletingCard(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this card?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the card and its item links from this section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void deleteCard();
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

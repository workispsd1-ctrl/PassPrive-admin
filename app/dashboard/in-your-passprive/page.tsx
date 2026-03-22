"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  PanelsTopLeft,
  Pencil,
  Plus,
  RefreshCw,
  Settings2,
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
import { showToast } from "@/hooks/useToast";

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

function extractCards(payload: unknown): PassPriveCard[] {
  if (Array.isArray(payload)) return payload as PassPriveCard[];

  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  if (!record) return [];

  const possibleKeys = ["cards", "data", "items", "results"];
  for (const key of possibleKeys) {
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

export default function InYourPassPrivePage() {
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
    return cards.filter((card) =>
      [card.title, card.subtitle || "", card.city || ""].join(" ").toLowerCase().includes(search)
    );
  }, [cards, query]);

  useEffect(() => {
    void loadCards();
  }, []);

  async function loadCards() {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/inyourpassprive`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(await getErrorFromResponse(response, "Failed to load cards."));
      }

      const payload = await parseResponse(response);
      setCards(extractCards(payload));
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: "Failed to load In Your PassPrive cards",
        description: error instanceof Error ? error.message : "Unable to fetch cards.",
      });
      setCards([]);
    } finally {
      setLoading(false);
    }
  }

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
      const endpoint = editingCard
        ? `${API_BASE}/api/inyourpassprive/${editingCard.id}`
        : `${API_BASE}/api/inyourpassprive`;

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

      showToast({ title: editingCard ? "Card updated" : "Card created" });
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
      const response = await fetch(`${API_BASE}/api/inyourpassprive/${deletingCard.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await getErrorFromResponse(response, "Failed to delete card."));
      }

      showToast({ title: "Card deleted" });
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

  return (
    <div className="min-h-full bg-slate-100">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                <PanelsTopLeft className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950">In Your PassPrive</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Manage the restaurant-only Dine In home section cards and their linked venues.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void loadCards()} disabled={loading} className="bg-white">
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button className="bg-slate-900 text-white hover:bg-slate-800" onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add new card
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
                <CardTitle className="text-lg">Cards</CardTitle>
                <CardDescription>Create cards, adjust order, and open item management for each card.</CardDescription>
              </div>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by title, subtitle, or city"
                className="h-11 w-full border-slate-300 bg-white lg:max-w-sm"
              />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="flex h-64 items-center justify-center text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading cards...
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredCards.map((card) => (
                  <div key={card.id} className="px-6 py-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-base font-semibold text-slate-900">{card.title}</p>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                            {card.is_active ? "Active" : "Inactive"}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                            Sort {card.sort_order}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                          <span>Items: {itemCount(card)}</span>
                          <span>Updated: {formatDate(card.updated_at)}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(card)} className="bg-white">
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button asChild variant="outline" size="sm" className="bg-white">
                          <Link href={`/dashboard/in-your-passprive/${card.id}`}>
                            <Settings2 className="mr-2 h-4 w-4" />
                            Manage items
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-200 bg-white text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setDeletingCard(card)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredCards.length === 0 ? (
                  <div className="px-6 py-16 text-center text-slate-500">No cards found.</div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingCard ? "Edit card" : "Create card"}</DialogTitle>
            <DialogDescription>Configure the content card shown inside the Dine In home section.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="card-title">Title</Label>
              <Input
                id="card-title"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="In Your PassPrive"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="card-subtitle">Subtitle</Label>
              <Input
                id="card-subtitle"
                value={form.subtitle}
                onChange={(event) => setForm((current) => ({ ...current, subtitle: event.target.value }))}
                placeholder="Top picks for your city"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="card-sort">Sort order</Label>
              <Input
                id="card-sort"
                type="number"
                value={form.sort_order}
                onChange={(event) => setForm((current) => ({ ...current, sort_order: event.target.value }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Active</p>
                <p className="text-xs text-slate-500">Hide or show this card in the section feed.</p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm((current) => ({ ...current, is_active: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button className="bg-slate-900 text-white hover:bg-slate-800" onClick={() => void saveCard()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingCard ? "Save changes" : "Create card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingCard)} onOpenChange={(open) => !open && setDeletingCard(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete card?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the card and its linked configuration from the superadmin section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => void deleteCard()}
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

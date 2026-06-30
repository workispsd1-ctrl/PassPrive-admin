"use client";

// Superadmin CRUD for the "Offers for you" home section cards.
// Each card has a `type` that decides what happens when a user taps it:
//   detail — opens an in-app detail view rendered from this CMS content
//            (image + detail title/body + hero); no app code per card
//   screen — navigates to an existing app screen/entity (restaurant/store/offer/route)
//   link   — opens an external URL
// App rendering is wired separately; this page only manages the content.

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast as _showToast } from "@/hooks/useToast";

// Positional wrapper over the object-based showToast for terse call sites.
const showToast = (title: string, type: "success" | "error" = "success") =>
  _showToast({ title, type });

const CARD_TYPES = ["detail", "screen", "link"] as const;
type CardType = (typeof CARD_TYPES)[number];
const TARGET_KINDS = ["restaurant", "store", "offer", "route"] as const;

type Card = {
  id?: string;
  sort_order: number;
  enabled: boolean;
  image_url: string | null;
  title: string;
  subtitle: string | null;
  type: CardType;
  detail_title: string | null;
  detail_body: string | null;
  hero_url: string | null;
  target_kind: string | null;
  target_id: string | null;
  target_route: string | null;
  target_params: Record<string, unknown> | null;
  link_url: string | null;
};

const BUCKET = "offer-cards";

function emptyCard(sortOrder: number): Card {
  return {
    sort_order: sortOrder,
    enabled: true,
    image_url: null,
    title: "",
    subtitle: null,
    type: "detail",
    detail_title: null,
    detail_body: null,
    hero_url: null,
    target_kind: null,
    target_id: null,
    target_route: null,
    target_params: null,
    link_url: null,
  };
}

async function uploadImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabaseBrowser.storage.from(BUCKET).upload(path, file, { upsert: true });
  if (error) throw error;
  return supabaseBrowser.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export default function OffersForYouPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Card | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabaseBrowser
      .from("offers_for_you_cards")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) showToast?.(`Failed to load: ${error.message}`, "error");
    setCards((data as Card[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const nextOrder = useMemo(
    () => (cards.length ? Math.max(...cards.map((c) => c.sort_order)) + 1 : 0),
    [cards],
  );

  async function handleDelete(card: Card) {
    if (!card.id || !confirm(`Delete "${card.title || "card"}"?`)) return;
    const { error } = await supabaseBrowser.from("offers_for_you_cards").delete().eq("id", card.id);
    if (error) return showToast?.(`Delete failed: ${error.message}`, "error");
    showToast?.("Card deleted", "success");
    load();
  }

  async function toggleEnabled(card: Card) {
    const { error } = await supabaseBrowser
      .from("offers_for_you_cards")
      .update({ enabled: !card.enabled })
      .eq("id", card.id);
    if (error) return showToast?.(`Update failed: ${error.message}`, "error");
    load();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Offers for you</h1>
          <p className="text-sm text-slate-500">Cards shown in the home “Offers for you” section.</p>
        </div>
        <Button onClick={() => setEditing(emptyCard(nextOrder))}>
          <Plus className="mr-2 h-4 w-4" /> Add card
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-500">
          No cards yet. Click “Add card” to create one.
        </div>
      ) : (
        <ul className="space-y-3">
          {cards.map((card) => (
            <li
              key={card.id}
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={card.image_url || ""}
                alt=""
                className="h-16 w-24 shrink-0 rounded-lg bg-slate-100 object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-slate-900">{card.title || "(untitled)"}</div>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                    {card.type}
                  </span>
                  {!card.enabled && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">
                      disabled
                    </span>
                  )}
                  <span className="text-slate-400">#{card.sort_order}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => toggleEnabled(card)}>
                {card.enabled ? "Disable" : "Enable"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditing(card)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDelete(card)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <CardDialog
          card={editing}
          saving={saving}
          onClose={() => setEditing(null)}
          onSave={async (next) => {
            setSaving(true);
            const { id, ...payload } = next;
            const res = id
              ? await supabaseBrowser.from("offers_for_you_cards").update(payload).eq("id", id)
              : await supabaseBrowser.from("offers_for_you_cards").insert(payload);
            setSaving(false);
            if (res.error) return showToast?.(`Save failed: ${res.error.message}`, "error");
            showToast?.("Card saved", "success");
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function CardDialog({
  card,
  saving,
  onClose,
  onSave,
}: {
  card: Card;
  saving: boolean;
  onClose: () => void;
  onSave: (c: Card) => void;
}) {
  const [form, setForm] = useState<Card>(card);
  const [uploadingCard, setUploadingCard] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const cardInput = useRef<HTMLInputElement>(null);
  const heroInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Card>(k: K, v: Card[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function pickImage(e: ChangeEvent<HTMLInputElement>, field: "image_url" | "hero_url") {
    const file = e.target.files?.[0];
    if (!file) return;
    const setUploading = field === "image_url" ? setUploadingCard : setUploadingHero;
    setUploading(true);
    try {
      set(field, await uploadImage(file));
    } catch (err) {
      showToast?.(`Upload failed: ${(err as Error).message}`, "error");
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    if (!form.title.trim()) return showToast?.("Title is required", "error");
    if (form.type === "link" && !form.link_url?.trim()) return showToast?.("Link URL is required", "error");
    if (form.type === "detail" && !form.detail_body?.trim())
      return showToast?.("Detail text is required", "error");
    onSave(form);
  }

  const label = "mb-1 block text-xs font-medium text-slate-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{card.id ? "Edit card" : "Add card"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Card face image */}
          <div>
            <span className={label}>Card image</span>
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.image_url || ""} alt="" className="h-16 w-24 rounded-lg bg-slate-100 object-cover" />
              <input ref={cardInput} type="file" accept="image/*" hidden onChange={(e) => pickImage(e, "image_url")} />
              <Button variant="outline" size="sm" onClick={() => cardInput.current?.click()} disabled={uploadingCard}>
                {uploadingCard ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <span className="ml-2">Upload</span>
              </Button>
            </div>
          </div>

          <div>
            <span className={label}>Title</span>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Card title" />
          </div>
          <div>
            <span className={label}>Subtitle (optional)</span>
            <Input value={form.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value || null)} />
          </div>

          {/* Type */}
          <div>
            <span className={label}>Type</span>
            <div className="flex gap-2">
              {CARD_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => set("type", t)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm capitalize ${
                    form.type === t
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {form.type === "detail" && "Opens an in-app detail view built from the content below."}
              {form.type === "screen" && "Opens an existing app screen for the chosen entity."}
              {form.type === "link" && "Opens an external URL."}
            </p>
          </div>

          {/* Type-specific fields */}
          {form.type === "detail" && (
            <>
              <div>
                <span className={label}>Detail title</span>
                <Input value={form.detail_title ?? ""} onChange={(e) => set("detail_title", e.target.value || null)} />
              </div>
              <div>
                <span className={label}>Detail text (shown when the card is tapped)</span>
                <Textarea
                  rows={5}
                  value={form.detail_body ?? ""}
                  onChange={(e) => set("detail_body", e.target.value || null)}
                />
              </div>
              <div>
                <span className={label}>Hero image (optional)</span>
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.hero_url || ""} alt="" className="h-16 w-24 rounded-lg bg-slate-100 object-cover" />
                  <input ref={heroInput} type="file" accept="image/*" hidden onChange={(e) => pickImage(e, "hero_url")} />
                  <Button variant="outline" size="sm" onClick={() => heroInput.current?.click()} disabled={uploadingHero}>
                    {uploadingHero ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    <span className="ml-2">Upload</span>
                  </Button>
                </div>
              </div>
            </>
          )}

          {form.type === "screen" && (
            <>
              <div>
                <span className={label}>Target</span>
                <div className="flex gap-2">
                  {TARGET_KINDS.map((k) => (
                    <button
                      key={k}
                      onClick={() => set("target_kind", k)}
                      className={`flex-1 rounded-xl border px-3 py-2 text-sm capitalize ${
                        form.target_kind === k
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 text-slate-600"
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
              {form.target_kind === "route" ? (
                <div>
                  <span className={label}>Route name</span>
                  <Input value={form.target_route ?? ""} onChange={(e) => set("target_route", e.target.value || null)} />
                </div>
              ) : (
                <div>
                  <span className={label}>{form.target_kind ? `${form.target_kind} id` : "Entity id"}</span>
                  <Input value={form.target_id ?? ""} onChange={(e) => set("target_id", e.target.value || null)} />
                </div>
              )}
            </>
          )}

          {form.type === "link" && (
            <div>
              <span className={label}>External URL</span>
              <Input
                value={form.link_url ?? ""}
                onChange={(e) => set("link_url", e.target.value || null)}
                placeholder="https://..."
              />
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="w-28">
              <span className={label}>Sort order</span>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => set("sort_order", Number(e.target.value) || 0)}
              />
            </div>
            <label className="mt-5 flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} />
              Enabled
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

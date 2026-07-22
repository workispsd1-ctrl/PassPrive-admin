"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

// Native sections the mobile app ships, per screen. The section_key is the
// stable app↔CMS contract (must match the screen's registry in the app);
// the label is only the displayed name. Keep in sync with the app — see
// SECTION_CMS.md.
type ScreenCatalog = { keys: string[]; labels: Record<string, string> };
const SCREEN_SECTIONS: Record<string, ScreenCatalog> = {
  "Home Screen": {
    keys: [
      "foodie-frontrow",
      "offers-for-you",
      "foodie-frontrow-classic",
      "more-with-passprive",
      "shop-this-weekend",
      "family-feast",
      "new-kick-in-stores",
      "plan-your-salon-visit",
      "now-trending",
      "whats-hot",
    ],
    labels: {
      "foodie-frontrow": "In the Limelight",
      "offers-for-you": "Offers for you",
      "foodie-frontrow-classic": "Foodie Frontrow",
    },
  },
  DineinHome: {
    keys: [
      "promotional-cards",
      "now-trending",
      "in-your-passprive",
      "popular-chains",
      "bank-offers",
      "recommendations",
    ],
    labels: {
      "promotional-cards": "Promotional Cards",
      "now-trending": "Now Trending",
      "in-your-passprive": "In Your PassPrivé",
      "popular-chains": "Popular Chains",
      "bank-offers": "Bank Offers",
      recommendations: "Recommendations",
    },
  },
  ShoppingHome: {
    keys: [
      "trending-now",
      "bank-offers",
      "in-your-district",
      "discover-top-brands",
      "on-the-shelves",
      "store-promo",
    ],
    labels: {
      "trending-now": "Trending Now",
      "bank-offers": "Bank Offers",
      "in-your-district": "In Your District",
      "discover-top-brands": "Discover Top Brands",
      "on-the-shelves": "On The Shelves",
      "store-promo": "Store Promotional Cards",
    },
  },
  Wellness: { keys: [], labels: {} },
};
const DEFAULT_SCREEN = "Home Screen";
const TEMPLATES = ["restaurant_rail"];

// Promo sections can be bound to ONE promotional collection via params.collection_id
// so multiple can be placed independently on a screen.
const PROMO_SECTION_KEYS = new Set(["store-promo", "promotional-cards"]);
const SCREEN_TO_COLLECTION_KEY: Record<string, string> = {
  "Home Screen": "home",
  DineinHome: "dinein",
  ShoppingHome: "shopping",
  Wellness: "wellness",
};

type PromoCollection = { id: string; title: string };

export type TitleRow = {
  id?: string;
  title: string;
  sort_order: number;
  section_key?: string | null;
  template?: string | null;
  data_source?: string | null;
  params?: Record<string, unknown> | null;
  style_variant?: string | null;
  title_color?: string | null;
  background?: string | null;
  enabled?: boolean;
};

export type TitlePayload = {
  title: string;
  sort_order: number;
  section_key: string | null;
  template: string | null;
  data_source: string | null;
  params: Record<string, unknown>;
  style_variant: string | null;
  title_color: string | null;
  background: string | null;
  enabled: boolean;
};

interface AddTitleDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (payload: TitlePayload) => void;
  editing?: TitleRow | null;
  screenName?: string | null;
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100";

export default function AddTitleDialog({ open, onClose, onSave, editing, screenName }: AddTitleDialogProps) {
  const isEditing = !!editing?.id;
  const catalog = SCREEN_SECTIONS[screenName ?? ""] ?? SCREEN_SECTIONS[DEFAULT_SCREEN];
  const nativeKeys = catalog.keys;
  const nativeLabels = catalog.labels;
  const hasNative = nativeKeys.length > 0;
  const [type, setType] = useState<"native" | "template">(hasNative ? "native" : "template");
  const [title, setTitle] = useState("");
  const [sortOrder, setSortOrder] = useState<number | "">("");
  const [sectionKey, setSectionKey] = useState<string>(nativeKeys[0] ?? "");
  const [template, setTemplate] = useState<string>(TEMPLATES[0]);
  const [dataSource, setDataSource] = useState("restaurants");
  const [paramsText, setParamsText] = useState('{\n  "limit": 12\n}');
  const [styleVariant, setStyleVariant] = useState("");
  const [titleColor, setTitleColor] = useState("");
  const [background, setBackground] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [collectionId, setCollectionId] = useState<string>("");
  const [collections, setCollections] = useState<PromoCollection[]>([]);

  const isPromoSection = type === "native" && PROMO_SECTION_KEYS.has(sectionKey);

  // Re-seed fields whenever the dialog opens / the edited row changes.
  useEffect(() => {
    if (!open) return;
    setType(editing?.template ? "template" : hasNative ? "native" : "template");
    setTitle(editing?.title ?? "");
    setSortOrder(editing?.sort_order ?? "");
    setSectionKey(editing?.section_key ?? nativeKeys[0] ?? "");
    setTemplate(editing?.template ?? TEMPLATES[0]);
    setDataSource(editing?.data_source ?? "restaurants");
    setParamsText(editing?.params ? JSON.stringify(editing.params, null, 2) : '{\n  "limit": 12\n}');
    setStyleVariant(editing?.style_variant ?? "");
    setTitleColor(editing?.title_color ?? "");
    setBackground(editing?.background ?? "");
    setEnabled(editing?.enabled ?? true);
    const editedCollection = (editing?.params as { collection_id?: string } | null)?.collection_id;
    setCollectionId(typeof editedCollection === "string" ? editedCollection : "");
  }, [open, editing]);

  // Load this screen's promotional collections for the picker.
  useEffect(() => {
    if (!open) return;
    const screenKey = SCREEN_TO_COLLECTION_KEY[screenName ?? ""];
    if (!screenKey) { setCollections([]); return; }
    let alive = true;
    supabaseBrowser
      .from("promotional_collections")
      .select("id,title")
      .eq("is_active", true)
      .contains("screens", [screenKey])
      .order("sort_order", { ascending: true })
      .then(({ data }) => { if (alive) setCollections((data as PromoCollection[]) ?? []); });
    return () => { alive = false; };
  }, [open, screenName]);

  const parsedParams = useMemo(() => {
    if (type !== "template") return {};
    try {
      const v = JSON.parse(paramsText || "{}");
      return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }, [paramsText, type]);

  if (!open) return null;

  const paramsInvalid = type === "template" && parsedParams === null;

  const handleSave = () => {
    if (!title.trim() || sortOrder === "" || paramsInvalid) return;
    onSave({
      title: title.trim(),
      sort_order: Number(sortOrder),
      section_key: type === "native" ? sectionKey : null,
      template: type === "template" ? template : null,
      data_source: type === "template" ? dataSource.trim() || null : null,
      params:
        type === "template"
          ? (parsedParams as Record<string, unknown>)
          : PROMO_SECTION_KEYS.has(sectionKey) && collectionId
            ? { collection_id: collectionId }
            : {},
      style_variant: styleVariant.trim() || null,
      title_color: titleColor.trim() || null,
      background: background.trim() || null,
      enabled,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{isEditing ? "Edit Section" : "Add Section"}</h2>
          <button
            type="button"
            title="Close"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-6 py-5">
          {/* Type toggle */}
          <div className="flex gap-2">
            {(["native", "template"] as const).filter((t) => t !== "native" || hasNative).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`h-9 rounded-xl px-4 text-sm font-medium ${
                  type === t ? "bg-[#5800AB] text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t === "native" ? "Native section" : "Template section"}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">
              Title (heading shown in the app) <span className="text-red-500">*</span>
            </label>
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. FOODIE FRONTROW" className={inputClass} />
            {type === "native" && (
              <p className="text-[11px] text-slate-400">Leave blank to use the section&apos;s built-in heading.</p>
            )}
          </div>

          {type === "native" ? (
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">Section</label>
              <select value={sectionKey} onChange={(e) => setSectionKey(e.target.value)} className={inputClass}>
                {nativeKeys.map((k) => (
                  <option key={k} value={k}>
                    {nativeLabels[k] ?? k}
                  </option>
                ))}
              </select>

              {isPromoSection && (
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-medium text-gray-600">Promotional collection</label>
                  <select
                    value={collectionId}
                    onChange={(e) => setCollectionId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">All collections (stacked)</option>
                    {collections.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Pick one collection to place it as its own section, or leave &quot;All&quot; to stack every collection here.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600">Template</label>
                  <select value={template} onChange={(e) => setTemplate(e.target.value)} className={inputClass}>
                    {TEMPLATES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600">Data source</label>
                  <input value={dataSource} onChange={(e) => setDataSource(e.target.value)} placeholder="restaurants" className={inputClass} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600">Params (JSON)</label>
                <textarea
                  value={paramsText}
                  onChange={(e) => setParamsText(e.target.value)}
                  rows={4}
                  className={`${inputClass} font-mono text-xs ${paramsInvalid ? "border-red-300" : ""}`}
                />
                <p className={`text-[11px] ${paramsInvalid ? "text-red-500" : "text-slate-400"}`}>
                  {paramsInvalid ? "Invalid JSON object." : 'e.g. { "limit": 12, "city": "Mumbai", "cuisine": "Italian" }'}
                </p>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">
                Sort Order <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 1"
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">Style variant (optional)</label>
              <input value={styleVariant} onChange={(e) => setStyleVariant(e.target.value)} placeholder="light / dark / accent" className={inputClass} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">Title colour (optional)</label>
              <input value={titleColor} onChange={(e) => setTitleColor(e.target.value)} placeholder="#383838" className={inputClass} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">Background (optional)</label>
              <input value={background} onChange={(e) => setBackground(e.target.value)} placeholder="#FFFFFF" className={inputClass} />
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            <span className="text-sm text-gray-700">Visible on Home</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!title.trim() || sortOrder === "" || paramsInvalid}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#5800AB] px-5 text-sm font-medium text-white shadow-[0_10px_20px_rgba(88,0,171,0.25)] hover:bg-[#4a0090] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isEditing ? "Save changes" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

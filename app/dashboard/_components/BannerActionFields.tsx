"use client";

import { useEffect, useState } from "react";

import { supabaseBrowser } from "@/lib/supabaseBrowser";

export type BannerAction = { type: string; params: Record<string, unknown> } | null;

type Option = { value: string; label: string };

const ACTION_TYPES: Option[] = [
  { value: "NONE", label: "No action" },
  { value: "RESTAURANT_LIST", label: "Restaurant list (discount % or category)" },
  { value: "STORE_LIST", label: "Store list (discount % or category)" },
  { value: "TOURIST_PLACE_LIST", label: "Tourist places list (by category)" },
  { value: "COLLECTION", label: "Curated collection" },
  { value: "MERCHANT", label: "Single restaurant / store" },
  { value: "URL", label: "Open a URL" },
  { value: "PERSONALIZED", label: "Personalized (ask the user's priorities)" },
];

const selectClass = "w-full rounded border border-gray-300 p-3 text-sm";
const inputClass = "w-full rounded border border-gray-300 p-3 text-sm";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";

export default function BannerActionFields({
  value,
  onChange,
}: {
  value: BannerAction;
  onChange: (action: BannerAction) => void;
}) {
  const type = value?.type || "NONE";
  const params = (value?.params || {}) as Record<string, string>;

  const [collections, setCollections] = useState<Option[]>([]);
  const [restaurantMoods, setRestaurantMoods] = useState<Option[]>([]);
  const [storeMoods, setStoreMoods] = useState<Option[]>([]);
  const [merchants, setMerchants] = useState<Option[]>([]);

  const setType = (next: string) => onChange({ type: next, params: {} });
  const setParam = (key: string, val: string) =>
    onChange({ type, params: { ...params, [key]: val } });

  useEffect(() => {
    void (async () => {
      const [{ data: cols }, { data: rMoods }, { data: sMoods }] = await Promise.all([
        supabaseBrowser.from("editorial_collections").select("slug,title").eq("is_active", true).order("title"),
        supabaseBrowser.from("restaurant_mood_categories").select("slug,title").eq("is_active", true).order("sort_order"),
        supabaseBrowser.from("store_mood_categories").select("slug,title").eq("is_active", true).order("sort_order"),
      ]);
      setCollections(((cols as Array<{ slug: string; title: string }>) || []).map(c => ({ value: c.slug, label: c.title })));
      setRestaurantMoods(((rMoods as Array<{ slug: string; title: string }>) || []).map(c => ({ value: c.slug, label: c.title })));
      setStoreMoods(((sMoods as Array<{ slug: string; title: string }>) || []).map(c => ({ value: c.slug, label: c.title })));
    })();
  }, []);

  const merchantType = String(params.merchantType || "RESTAURANT").toUpperCase();
  useEffect(() => {
    if (type !== "MERCHANT") return;
    void (async () => {
      const table = merchantType === "STORE" ? "stores" : "restaurants";
      const { data } = await supabaseBrowser.from(table).select("id,name").order("name");
      setMerchants(((data as Array<{ id: string; name: string }>) || []).map(m => ({ value: String(m.id), label: m.name })));
    })();
  }, [type, merchantType]);

  const entityType = String(params.entityType || "RESTAURANT").toUpperCase();

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div>
        <label className={labelClass}>On tap action</label>
        <select className={selectClass} value={type} onChange={e => setType(e.target.value)}>
          {ACTION_TYPES.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {(type === "RESTAURANT_LIST" || type === "STORE_LIST") && (
        <>
          <div>
            <label className={labelClass}>Minimum discount % (optional)</label>
            <input
              type="number"
              placeholder="e.g. 20"
              className={inputClass}
              value={params.discountPercent || ""}
              onChange={e => setParam("discountPercent", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Category (optional)</label>
            <select className={selectClass} value={params.categorySlug || ""} onChange={e => setParam("categorySlug", e.target.value)}>
              <option value="">Any category</option>
              {(type === "STORE_LIST" ? storeMoods : restaurantMoods).map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {type === "TOURIST_PLACE_LIST" && (
        <div>
          <label className={labelClass}>Category (place type or tag)</label>
          <input
            type="text"
            placeholder="e.g. beach, waterfall, museum"
            className={inputClass}
            value={params.categorySlug || ""}
            onChange={e => setParam("categorySlug", e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">
            Saved now; the tourist-places screen isn&apos;t in the app yet, so this banner won&apos;t navigate until it ships.
          </p>
        </div>
      )}

      {type === "COLLECTION" && (
        <>
          <div>
            <label className={labelClass}>Entity</label>
            <select className={selectClass} value={entityType} onChange={e => setParam("entityType", e.target.value)}>
              <option value="RESTAURANT">Restaurants</option>
              <option value="STORE">Stores</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Collection</label>
            <select className={selectClass} value={params.collectionSlug || ""} onChange={e => setParam("collectionSlug", e.target.value)}>
              <option value="">Select a collection…</option>
              {collections.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {type === "MERCHANT" && (
        <>
          <div>
            <label className={labelClass}>Type</label>
            <select className={selectClass} value={merchantType} onChange={e => onChange({ type, params: { merchantType: e.target.value } })}>
              <option value="RESTAURANT">Restaurant</option>
              <option value="STORE">Store</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>{merchantType === "STORE" ? "Store" : "Restaurant"}</label>
            <select className={selectClass} value={params.merchantId || ""} onChange={e => setParam("merchantId", e.target.value)}>
              <option value="">Select…</option>
              {merchants.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {type === "URL" && (
        <div>
          <label className={labelClass}>URL</label>
          <input
            type="url"
            placeholder="https://…"
            className={inputClass}
            value={params.url || ""}
            onChange={e => setParam("url", e.target.value)}
          />
        </div>
      )}

      {type === "PERSONALIZED" && (
        <div>
          <label className={labelClass}>Ask priorities for</label>
          <select className={selectClass} value={entityType} onChange={e => setParam("entityType", e.target.value)}>
            <option value="RESTAURANT">Dining (restaurant moods)</option>
            <option value="STORE">Stores (store moods)</option>
          </select>
          <p className="mt-1 text-xs text-slate-500">
            On first tap the app asks the user to pick from these categories, saves it, and filters accordingly. The options are managed in Mood Categories.
          </p>
        </div>
      )}
    </div>
  );
}

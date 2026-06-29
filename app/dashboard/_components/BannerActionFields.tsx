"use client";

import { useEffect, useState } from "react";

import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { TOURIST_TAGS } from "./touristTags";

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
  const params = (value?.params || {}) as Record<string, string> & { options?: string[] };

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
      const table = merchantType === "STORE" ? "stores" : merchantType === "TOURIST" ? "tourist_places" : "restaurants";
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
          <label className={labelClass}>Category</label>
          <select className={selectClass} value={params.categorySlug || ""} onChange={e => setParam("categorySlug", e.target.value)}>
            <option value="">Any category</option>
            {TOURIST_TAGS.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
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
              <option value="TOURIST">Tourist places</option>
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
              <option value="TOURIST">Tourist place</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>{merchantType === "STORE" ? "Store" : merchantType === "TOURIST" ? "Tourist place" : "Restaurant"}</label>
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
            <option value="TOURIST">Tourist places</option>
          </select>

          <div className="mt-3">
            <label className={labelClass}>Question shown to the user</label>
            <input
              type="text"
              placeholder="e.g. What kind of experiences are you looking for?"
              className={inputClass}
              value={params.question || ""}
              onChange={e => setParam("question", e.target.value)}
            />
          </div>

          {entityType === "TOURIST" ? (
            <div className="mt-3">
              <label className={labelClass}>Answer options (tourist categories)</label>
              <div className="flex flex-wrap gap-2">
                {TOURIST_TAGS.map(tag => {
                  const selected = Array.isArray(params.options) && params.options.includes(tag);
                  return (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => {
                        const cur = Array.isArray(params.options) ? params.options : [];
                        const next = selected ? cur.filter(t => t !== tag) : [...cur, tag];
                        onChange({ type, params: { ...params, options: next } });
                      }}
                      className={`rounded-full border px-3 py-1.5 text-sm transition ${
                        selected
                          ? "border-[#5800AB] bg-[#F2E9FB] text-[#5800AB]"
                          : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                On first tap the app shows the user these categories to pick from, saves their picks, and shows tourist places matching them. (Tourist screens aren&apos;t in the app yet, so this is saved for when they ship.)
              </p>
            </div>
          ) : (
            <p className="mt-1 text-xs text-slate-500">
              On first tap the app asks the user to pick from the {entityType === "STORE" ? "store" : "restaurant"} mood categories (managed in Mood Categories), saves it, and filters accordingly.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

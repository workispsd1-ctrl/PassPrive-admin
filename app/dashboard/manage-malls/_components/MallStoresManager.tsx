"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Search, Plus, Trash2, Store, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { showToast } from "@/hooks/useToast";
import {
  fetchMallStores,
  searchStoresForMall,
  addStoreToMall,
  removeStoreFromMall,
  updateMallStoreLink,
  type MallStoreInfo,
  type MallStoreLink,
} from "@/lib/mallAdmin";

export default function MallStoresManager({ mallId }: { mallId: string }) {
  const [links, setLinks] = useState<MallStoreLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<MallStoreInfo[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setLinks(await fetchMallStores(mallId));
    } catch (err) {
      showToast({ type: "error", title: "Failed to load stores", description: (err as Error)?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mallId]);

  const linkedIds = useMemo(() => new Set(links.map((l) => l.store_id)), [links]);

  const runSearch = (q: string) => {
    setTerm(q);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await searchStoresForMall(q));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const add = async (store: MallStoreInfo) => {
    setBusyId(store.id);
    try {
      await addStoreToMall(mallId, store.id);
      showToast({ type: "success", title: `Added ${store.name}` });
      await load();
    } catch (err) {
      showToast({ type: "error", title: "Add failed", description: (err as Error)?.message });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (link: MallStoreLink) => {
    setBusyId(link.store_id);
    try {
      await removeStoreFromMall(mallId, link.store_id);
      setLinks((prev) => prev.filter((l) => l.id !== link.id));
    } catch (err) {
      showToast({ type: "error", title: "Remove failed", description: (err as Error)?.message });
    } finally {
      setBusyId(null);
    }
  };

  const saveField = async (link: MallStoreLink, patch: { floor?: string | null; unit_number?: string | null }) => {
    try {
      await updateMallStoreLink(link.id, patch);
      setLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, ...patch } : l)));
    } catch (err) {
      showToast({ type: "error", title: "Update failed", description: (err as Error)?.message });
    }
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 md:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Store className="h-4 w-4 text-gray-700" />
        <h2 className="text-sm font-semibold text-gray-800">Stores in this mall</h2>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{links.length}</span>
      </div>

      {/* Search / add */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input className="pl-9" placeholder="Search stores to add…" value={term} onChange={(e) => runSearch(e.target.value)} />
      </div>
      {(term.trim() || searching) && (
        <div className="mb-4 max-h-64 overflow-auto rounded-lg border border-gray-100">
          {searching ? (
            <div className="flex items-center gap-2 p-3 text-xs text-gray-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
            </div>
          ) : results.length === 0 ? (
            <div className="p-3 text-xs text-gray-500">No stores found.</div>
          ) : (
            results.map((s) => {
              const already = linkedIds.has(s.id);
              return (
                <div key={s.id} className="flex items-center gap-3 border-b border-gray-50 p-2.5 last:border-0">
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-gray-100">
                    {(s.logo_url || s.cover_image) && (
                      <Image src={(s.logo_url || s.cover_image) as string} alt={s.name} fill className="object-cover" sizes="32px" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-gray-800">{s.name}</p>
                    <p className="truncate text-xs text-gray-500">{[s.category, s.city].filter(Boolean).join(" · ") || "—"}</p>
                  </div>
                  <Button size="sm" variant={already ? "outline" : "default"} disabled={already || busyId === s.id} className="gap-1" onClick={() => add(s)}>
                    {busyId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    {already ? "Added" : "Add"}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Current stores */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : links.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">No stores added to this mall yet.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {links.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                {(l.store?.logo_url || l.store?.cover_image) && (
                  <Image src={(l.store?.logo_url || l.store?.cover_image) as string} alt={l.store?.name || ""} fill className="object-cover" sizes="40px" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-gray-900">{l.store?.name || "Unknown store"}</p>
                <p className="truncate text-xs text-gray-500">
                  {l.store?.category ? (
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700">{l.store.category}</span>
                  ) : (
                    "No category"
                  )}
                  {l.store?.city ? <span className="ml-2">{l.store.city}</span> : null}
                </p>
              </div>
              <Input
                className="h-8 w-20"
                placeholder="Floor"
                defaultValue={l.floor ?? ""}
                onBlur={(e) => saveField(l, { floor: e.target.value.trim() || null })}
              />
              <Input
                className="h-8 w-24"
                placeholder="Unit"
                defaultValue={l.unit_number ?? ""}
                onBlur={(e) => saveField(l, { unit_number: e.target.value.trim() || null })}
              />
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                disabled={busyId === l.store_id}
                onClick={() => remove(l)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, Pencil, Trash2, Building2, Store } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { showToast } from "@/hooks/useToast";
import { fetchMalls, fetchMallStoreCounts, deleteMall, type MallRecord } from "@/lib/mallAdmin";

export default function MallList() {
  const router = useRouter();
  const [malls, setMalls] = useState<MallRecord[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await fetchMalls();
      setMalls(rows);
      setCounts(await fetchMallStoreCounts(rows.map((m) => m.id)));
    } catch (err) {
      showToast({ type: "error", title: "Failed to load malls", description: (err as Error)?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return malls;
    return malls.filter(
      (m) =>
        m.name?.toLowerCase().includes(t) ||
        m.city?.toLowerCase().includes(t) ||
        m.location_name?.toLowerCase().includes(t)
    );
  }, [malls, search]);

  const onDelete = async (m: MallRecord) => {
    if (!confirm(`Delete "${m.name}"? This also removes its store links.`)) return;
    setDeletingId(m.id);
    try {
      await deleteMall(m.id);
      showToast({ type: "success", title: "Mall deleted" });
      setMalls((prev) => prev.filter((x) => x.id !== m.id));
    } catch (err) {
      showToast({ type: "error", title: "Delete failed", description: (err as Error)?.message });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input className="pl-9" placeholder="Search malls by name, city, area…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center text-sm text-gray-500">
          No malls yet. Use the <span className="font-medium">+</span> button and choose <span className="font-medium">Mall</span>.
        </div>
      ) : (
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white">
          {filtered.map((m) => (
            <div key={m.id} className="flex items-center gap-4 p-4">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                {m.logo_url ? (
                  <Image src={m.logo_url} alt={m.name} fill className="object-cover" sizes="48px" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Building2 className="h-5 w-5 text-gray-400" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-gray-900">{m.name}</p>
                  {!m.is_active && <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-600">Inactive</span>}
                  {m.is_featured && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">Featured</span>}
                </div>
                <p className="truncate text-xs text-gray-500">{[m.location_name, m.city].filter(Boolean).join(", ") || "—"}</p>
              </div>

              <div className="hidden items-center gap-1 text-sm text-gray-600 sm:flex">
                <Store className="h-4 w-4" />
                {counts[m.id] || 0} stores
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1" onClick={() => router.push(`/dashboard/manage-malls/${m.id}`)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  disabled={deletingId === m.id}
                  onClick={() => onDelete(m)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

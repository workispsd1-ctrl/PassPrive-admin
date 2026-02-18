"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchAndFilter } from "@/components/userComponents/SearchAndFilter";
import ComingSoon from "@/components/ui/coming-soon";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";
import { Plus } from "lucide-react";
import { StoreTable } from "@/components/storesComponents/StoreTable";

const ITEMS_PER_PAGE = 10;

function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);

  return v;
}

function escapePostgrestOrValue(value) {
  return String(value || "")
    .trim()
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

/* -------------------------- SKELETON (LOADING ONLY) -------------------------- */

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200/70 ${className}`} />;
}

function StoresTableSkeleton() {
  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-5 w-44" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3 border-b border-gray-100 pb-3">
        <Skeleton className="col-span-3 h-4 w-24" />
        <Skeleton className="col-span-2 h-4 w-20" />
        <Skeleton className="col-span-2 h-4 w-20" />
        <Skeleton className="col-span-2 h-4 w-24" />
        <Skeleton className="col-span-3 h-4 w-24" />
      </div>

      <div className="mt-3 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-12 items-center gap-3 rounded-xl border border-gray-100 bg-white p-3"
          >
            <div className="col-span-3 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>

            <div className="col-span-2">
              <Skeleton className="h-4 w-24" />
            </div>

            <div className="col-span-2">
              <Skeleton className="h-4 w-24" />
            </div>

            <div className="col-span-2">
              <Skeleton className="h-4 w-28" />
            </div>

            <div className="col-span-3 flex justify-end gap-2">
              <Skeleton className="h-9 w-20 rounded-xl" />
              <Skeleton className="h-9 w-20 rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function StoresPage() {
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState("");
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(ITEMS_PER_PAGE);
  const [refresh, setRefresh] = useState(0);

  const debouncedSearch = useDebounced(searchTerm);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  useEffect(() => {
    const fetchStores = async () => {
      setLoading(true);

      let query = supabaseBrowser
        .from("stores")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (debouncedSearch && debouncedSearch.trim()) {
        const safeSearch = escapePostgrestOrValue(debouncedSearch);
        query = query.or(
          `name.ilike.*${safeSearch}*,city.ilike.*${safeSearch}*,location_name.ilike.*${safeSearch}*,category.ilike.*${safeSearch}*`
        );
      }

      const { data, error, count } = await query;

      if (error) {
        showToast({
          type: "error",
          title: "Failed to load stores",
          description: error.message,
        });
        setStores([]);
        setTotal(0);
      } else {
        setStores(data || []);
        setTotal(count || 0);
      }

      setLoading(false);
    };

    fetchStores();
  }, [page, limit, debouncedSearch, refresh]);

  return (
    <>
      <div className="space-y-4">
        <SearchAndFilter
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          variant="search-only"
          placeholder="Search stores by name, category, city, or location..."
        />

        <Card className="w-full overflow-x-auto border border-gray-200 shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <StoresTableSkeleton />
            ) : stores.length === 0 ? (
              <div className="p-6">
                <ComingSoon />
              </div>
            ) : (
              <StoreTable
                stores={stores}
                page={page}
                setPage={setPage}
                totalPages={totalPages}
                totalRecord={total}
                limit={limit}
                setLimit={setLimit}
                setRefresh={setRefresh}
                onRowClick={(id) => router.push(`/dashboard/manage-stores/${id}`)}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700"
        onClick={() => router.push("/dashboard/manage-stores/add")}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </>
  );
}

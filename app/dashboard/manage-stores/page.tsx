"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/userComponents/LoadingSkeleton";
import { SearchAndFilter } from "@/components/userComponents/SearchAndFilter";
import ComingSoon from "@/components/ui/coming-soon";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";
import { Plus } from "lucide-react";
import { StoreTable } from "@/components/storesComponents/StoreTable";

const ITEMS_PER_PAGE = 10;

function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function StoresPage() {
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState("");
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(ITEMS_PER_PAGE);
  const [refresh, setRefresh] = useState<any>(null);

  const debouncedSearch = useDebounced(searchTerm);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit]
  );

  useEffect(() => {
    const fetchStores = async () => {
      setLoading(true);

      let query = supabaseBrowser
        .from("stores")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (debouncedSearch) {
        query = query.or(
          `name.ilike.%${debouncedSearch}%,city.ilike.%${debouncedSearch}%,location_name.ilike.%${debouncedSearch}%,category.ilike.%${debouncedSearch}%`
        );
      }

      const { data, error, count } = await query;

      if (error) {
        showToast({
          type: "error",
          title: "Failed to load stores",
          description: error.message,
        });
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

        <Card className="border border-gray-200 shadow-sm w-full overflow-x-auto">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4">
                <LoadingSkeleton />
              </div>
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
                onRowClick={(id: string) =>
                  router.push(`/dashboard/manage-stores/${id}`)
                }
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Floating Add Button */}
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
        onClick={() => router.push("/dashboard/manage-stores/add")}
      >
        <Plus className="w-6 h-6" />
      </Button>
    </>
  );
}

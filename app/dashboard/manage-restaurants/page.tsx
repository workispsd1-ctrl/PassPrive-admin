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
import { RestaurantTable } from "@/components/restaurantComponents/RestaurantTable";

const ITEMS_PER_PAGE = 10;

function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function getOfferDisplay(offer: any) {
  if (offer == null) return "—";
  if (typeof offer === "string" || typeof offer === "number") return String(offer);

  if (Array.isArray(offer)) {
    if (offer.length === 0) return "—";
    const first = offer[0];
    if (first && typeof first === "object") {
      if (first.title) return String(first.title);
      if (first.promoCode) return String(first.promoCode);
    }
    return `${offer.length} offer${offer.length > 1 ? "s" : ""}`;
  }

  if (typeof offer === "object") {
    if (offer.title) return String(offer.title);
    if (offer.promoCode) return String(offer.promoCode);
    return "Offer";
  }

  return "—";
}

/* -------------------------- SKELETON (LOADING ONLY) -------------------------- */

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200/70 ${className}`} />;
}

function RestaurantsTableSkeleton() {
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
        <Skeleton className="col-span-2 h-4 w-16" />
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
              <Skeleton className="h-4 w-16" />
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

export default function RestaurantsPage() {
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState("");
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(ITEMS_PER_PAGE);
  const [refresh, setRefresh] = useState<any>(null);

  const debouncedSearch = useDebounced(searchTerm);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  useEffect(() => {
    const fetchRestaurants = async () => {
      setLoading(true);

      let query = supabaseBrowser
        .from("restaurants")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (debouncedSearch) {
        query = query.or(
          `name.ilike.%${debouncedSearch}%,city.ilike.%${debouncedSearch}%,area.ilike.%${debouncedSearch}%`
        );
      }

      const { data, error, count } = await query;

      if (error) {
        showToast({
          type: "error",
          title: "Failed to load restaurants",
          description: error.message,
        });
        setRestaurants([]);
        setTotal(0);
      } else {
        const normalized = (data || []).map((r: any) => ({
          ...r,
          offer_raw: r.offer,
          offer: getOfferDisplay(r.offer),
        }));
        setRestaurants(normalized);
        setTotal(count || 0);
      }

      setLoading(false);
    };

    fetchRestaurants();
  }, [page, limit, debouncedSearch, refresh]);

  return (
    <>
      <div className="space-y-4">
        <SearchAndFilter
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          variant="search-only"
          placeholder="Search restaurants by name, city, or area..."
        />

        <Card className="w-full overflow-x-auto border border-gray-200 shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <RestaurantsTableSkeleton />
            ) : restaurants.length === 0 ? (
              <div className="p-6">
                <ComingSoon />
              </div>
            ) : (
              <RestaurantTable
                restaurants={restaurants}
                page={page}
                setPage={setPage}
                totalPages={totalPages}
                totalRecord={total}
                limit={limit}
                setLimit={setLimit}
                setRefresh={setRefresh}
                onRowClick={(id: string) => router.push(`/dashboard/manage-restaurants/${id}`)}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700"
        onClick={() => router.push("/dashboard/manage-restaurants/add")}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </>
  );
}

"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { SearchAndFilter } from "@/components/userComponents/SearchAndFilter";
import ComingSoon from "@/components/ui/coming-soon";
import { showToast } from "@/hooks/useToast";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { RestaurantTable } from "@/components/restaurantComponents/RestaurantTable";
import { fetchRestaurantsPage, type RestaurantFlatRecord } from "@/lib/restaurantAdmin";

const ITEMS_PER_PAGE = 10;

function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
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

function RestaurantsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState("");
  const [restaurants, setRestaurants] = useState<RestaurantFlatRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const pageVal = searchParams.get("page");
  const page = pageVal ? parseInt(pageVal, 10) || 1 : 1;

  const [limit, setLimit] = useState(ITEMS_PER_PAGE);
  const [refresh, setRefresh] = useState<number | null>(null);

  const debouncedSearch = useDebounced(searchTerm);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const setPage = (val: number | ((prev: number) => number)) => {
    const nextVal = typeof val === "function" ? val(page) : val;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", nextVal.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  useEffect(() => {
    const fetchRestaurants = async () => {
      setLoading(true);
      try {
        const { data, count } = await fetchRestaurantsPage({
          page,
          limit,
          searchTerm: debouncedSearch,
        });

        setRestaurants(data);
        setTotal(count);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        showToast({
          type: "error",
          title: "Failed to load restaurants",
          description: message,
        });
        setRestaurants([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, [page, limit, debouncedSearch, refresh]);

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleToggleSidebar = () => {
    window.dispatchEvent(new Event("dashboard-toggle-sidebar"));
    setSidebarOpen((prev) => !prev);
  };

  return (
    <>
      <div className="min-h-full w-full space-y-4">
        <div className="min-h-full space-y-6 p-6">
          <SearchAndFilter
            searchTerm={searchTerm}
            onSearchChange={(val) => {
              setSearchTerm(val);
              setPage(1);
            }}
            variant="search-only"
            placeholder="Search restaurants by name, city, or area..."
          />
          <div className="w-full overflow-x-auto bg-[#FFFFFF] rounded-[16px] p-[16px] shadow-[0px_8px_32px_0px_rgba(31,38,135,0.15)]">
            {loading ? (
              <div className="p-6">
                <RestaurantsTableSkeleton />
              </div>
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
          </div>
        </div>
      </div>

      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-[#5800AB] text-white shadow-lg hover:bg-[#4a0090]"
        onClick={() => router.push("/dashboard/manage-restaurants/add")}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </>
  );
}

export default function RestaurantsPage() {
  return (
    <Suspense fallback={<div className="p-6"><RestaurantsTableSkeleton /></div>}>
      <RestaurantsPageContent />
    </Suspense>
  );
}

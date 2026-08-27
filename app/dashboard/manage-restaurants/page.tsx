"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SearchAndFilter } from "@/components/userComponents/SearchAndFilter";
import ComingSoon from "@/components/ui/coming-soon";
import { showToast } from "@/hooks/useToast";
import { Plus, Search } from "lucide-react";
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
    <div className="overflow-hidden rounded-[12px] border border-[#EDEFF3]">
      <div className="flex h-[44px] items-center gap-4 border-b border-[#EDEFF3] bg-[#FAFAFB] px-4">
        <Skeleton className="h-3 w-[22%]" />
        <Skeleton className="h-3 w-[20%]" />
        <Skeleton className="h-3 w-[8%]" />
        <Skeleton className="h-3 w-[12%]" />
        <Skeleton className="h-3 w-[8%]" />
      </div>

      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex h-[56px] items-center gap-4 border-b border-[#F1F2F5] px-4 last:border-b-0"
        >
          <Skeleton className="h-3.5 w-[24%]" />
          <Skeleton className="h-3.5 w-[20%]" />
          <Skeleton className="h-3.5 w-[6%]" />
          <Skeleton className="h-3.5 w-[10%]" />
          <Skeleton className="h-6 w-[9%] rounded-full" />
          <div className="ml-auto flex gap-1">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ searchTerm }: { searchTerm: string }) {
  if (!searchTerm) return <ComingSoon />;

  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF2EC]">
        <Search className="h-5 w-5 text-[#FF4800]" />
      </div>
      <p className="text-[15px] font-semibold text-[#111827]">No restaurants found</p>
      <p className="max-w-[320px] text-[13px] leading-[18px] text-[#8A92A6]">
        Nothing matched &ldquo;{searchTerm}&rdquo;. Try a different name, city, or area.
      </p>
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
        <div className="min-h-full space-y-4 pb-6 pt-2">
          <SearchAndFilter
            searchTerm={searchTerm}
            onSearchChange={(val) => {
              setSearchTerm(val);
              setPage(1);
            }}
            variant="search-only"
            placeholder="Search restaurants by name, city, or area..."
          />
          <div className="w-full rounded-[16px] bg-[#FFFFFF] px-[10px] py-[18px] shadow-[0px_8px_32px_0px_rgba(31,38,135,0.15)]">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-[16px] font-semibold leading-[22px] text-[#111827]">
                Restaurants
              </h2>
              {!loading && total > 0 && (
                <span className="whitespace-nowrap rounded-full bg-[#F4F5F7] px-3 py-1 text-[12px] font-medium text-[#6B7280]">
                  {total} total
                </span>
              )}
            </div>

            <div className="w-full overflow-x-auto">
              {loading ? (
                <RestaurantsTableSkeleton />
              ) : restaurants.length === 0 ? (
                <EmptyState searchTerm={debouncedSearch} />
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
      </div>

      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-[#FF4800] text-white shadow-lg hover:bg-[#D43B00]"
        onClick={() => router.push("/dashboard/manage-restaurants/add")}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </>
  );
}

export default function RestaurantsPage() {
  return (
    <Suspense
      fallback={
        <div className="pb-6 pt-2">
          <div className="w-full rounded-[16px] bg-[#FFFFFF] px-[10px] py-[18px] shadow-[0px_8px_32px_0px_rgba(31,38,135,0.15)]">
            <RestaurantsTableSkeleton />
          </div>
        </div>
      }
    >
      <RestaurantsPageContent />
    </Suspense>
  );
}

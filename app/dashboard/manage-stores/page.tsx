"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchAndFilter } from "@/components/userComponents/SearchAndFilter";
import ComingSoon from "@/components/ui/coming-soon";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";
import { Plus, ChevronLeft, ChevronRight, Store, Building2 } from "lucide-react";
import { StoreTable } from "@/components/storesComponents/StoreTable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import MallList from "@/app/dashboard/manage-malls/_components/MallList";

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

function StoresTableSkeleton() {
  return (
    <div className="p-4">
      {/* header-ish row */}
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-5 w-44" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>

      {/* table header */}
      <div className="grid grid-cols-12 gap-3 border-b border-gray-100 pb-3">
        <Skeleton className="col-span-3 h-4 w-24" />
        <Skeleton className="col-span-2 h-4 w-20" />
        <Skeleton className="col-span-2 h-4 w-20" />
        <Skeleton className="col-span-2 h-4 w-24" />
        <Skeleton className="col-span-3 h-4 w-24" />
      </div>

      {/* rows */}
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

      {/* pagination-ish */}
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

  const [view, setView] = useState<"stores" | "malls">("stores");
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

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleToggleSidebar = () => {
    window.dispatchEvent(new Event("dashboard-toggle-sidebar"));
    setSidebarOpen((prev) => !prev);
  };

  return (
    <>
      <div className="min-h-full w-full space-y-4">
        <div className="min-h-full space-y-4 pb-6 pt-2">
          {/* Stores / Malls toggle */}
          <div className="inline-flex rounded-full border border-gray-200 bg-white p-1">
            <button
              onClick={() => setView("stores")}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                view === "stores" ? "bg-[#FF4800] text-white" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Store className="h-4 w-4" /> Stores
            </button>
            <button
              onClick={() => setView("malls")}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                view === "malls" ? "bg-[#FF4800] text-white" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Building2 className="h-4 w-4" /> Malls
            </button>
          </div>

          {view === "malls" ? (
            <MallList />
          ) : (
            <>
              <SearchAndFilter
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                variant="search-only"
                placeholder="Search stores by name, category, city, or location..."
              />

              <div className="w-full rounded-[16px] bg-[#FFFFFF] px-[10px] py-[18px] shadow-[0px_8px_32px_0px_rgba(31,38,135,0.15)]">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h2 className="text-[16px] font-semibold leading-[22px] text-[#111827]">
                    Stores
                  </h2>
                  {!loading && total > 0 && (
                    <span className="whitespace-nowrap rounded-full bg-[#F4F5F7] px-3 py-1 text-[12px] font-medium text-[#6B7280]">
                      {total} total
                    </span>
                  )}
                </div>

                <div className="w-full overflow-x-auto">
                  {loading ? (
                    <StoresTableSkeleton />
                  ) : stores.length === 0 ? (
                    <ComingSoon />
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
                </div>
              </div>
            </>
          )}
        </div>
      </div>


      {/* Floating Add Button — asks Store or Mall */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-[#FF4800] text-white shadow-lg hover:bg-[#D43B00]">
            <Plus className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-44">
          <DropdownMenuItem className="gap-2" onClick={() => router.push("/dashboard/manage-stores/add")}>
            <Store className="h-4 w-4" /> Add Store
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2" onClick={() => router.push("/dashboard/manage-malls/add")}>
            <Building2 className="h-4 w-4" /> Add Mall
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

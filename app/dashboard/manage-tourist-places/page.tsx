"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { SearchAndFilter } from "@/components/userComponents/SearchAndFilter";
import ComingSoon from "@/components/ui/coming-soon";
import { showToast } from "@/hooks/useToast";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import Modal from "@/app/dashboard/_components/Modal";
import PaginationBar from "@/app/dashboard/_components/Pagination";

const ITEMS_PER_PAGE = 10;

function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function TableSkeleton() {
  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="animate-pulse h-5 w-44 rounded bg-gray-200" />
        <div className="flex items-center gap-2">
          <div className="animate-pulse h-9 w-28 rounded-xl bg-gray-200" />
          <div className="animate-pulse h-9 w-24 rounded-xl bg-gray-200" />
        </div>
      </div>
      <div className="grid grid-cols-12 gap-3 border-b border-gray-100 pb-3">
        <div className="animate-pulse col-span-3 h-4 w-24 rounded bg-gray-200" />
        <div className="animate-pulse col-span-3 h-4 w-20 rounded bg-gray-200" />
        <div className="animate-pulse col-span-2 h-4 w-20 rounded bg-gray-200" />
        <div className="animate-pulse col-span-2 h-4 w-16 rounded bg-gray-200" />
        <div className="animate-pulse col-span-2 h-4 w-24 rounded bg-gray-200" />
      </div>
      <div className="mt-3 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="grid grid-cols-12 items-center gap-3 rounded-xl border border-gray-100 bg-white p-3">
            <div className="col-span-3 space-y-2">
              <div className="animate-pulse h-4 w-40 rounded bg-gray-200" />
              <div className="animate-pulse h-3 w-28 rounded bg-gray-200" />
            </div>
            <div className="col-span-3"><div className="animate-pulse h-4 w-24 rounded bg-gray-200" /></div>
            <div className="col-span-2"><div className="animate-pulse h-4 w-24 rounded bg-gray-200" /></div>
            <div className="col-span-2"><div className="animate-pulse h-4 w-16 rounded bg-gray-200" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

type TouristPlaceRecord = {
  id: string;
  place_name: string;
  location_name: string;
  city: string;
  area: string;
  payment_option: string;
  price: number;
  rating: number;
  picture_id: string | null;
  is_active: boolean;
  reviews_count: number;
};

function TouristPlacesPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState("");
  const [places, setPlaces] = useState<TouristPlaceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const pageVal = searchParams.get("page");
  const page = pageVal ? parseInt(pageVal, 10) || 1 : 1;
  const [limit, setLimit] = useState(ITEMS_PER_PAGE);
  const [refresh, setRefresh] = useState<number | null>(null);

  const debouncedSearch = useDebounced(searchTerm);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const [selectedPlace, setSelectedPlace] = useState<TouristPlaceRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TouristPlaceRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const setPage = (val: number | ((prev: number) => number)) => {
    const nextVal = typeof val === "function" ? val(page) : val;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", nextVal.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  useEffect(() => {
    const fetchPlaces = async () => {
      setLoading(true);
      try {
        let query = supabaseBrowser
          .from("tourist_places")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        if (debouncedSearch) {
          query = query.or(
            `place_name.ilike.%${debouncedSearch}%,city.ilike.%${debouncedSearch}%,area.ilike.%${debouncedSearch}%,location_name.ilike.%${debouncedSearch}%`
          );
        }

        const { data, error, count } = await query;
        if (error) throw error;

        setPlaces((data as TouristPlaceRecord[]) || []);
        setTotal(count || 0);
      } catch (error: any) {
        showToast({
          type: "error",
          title: "Failed to load tourist places",
          description: error.message || "Unknown error occurred.",
        });
        setPlaces([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaces();
  }, [page, limit, debouncedSearch, refresh]);

  const handleToggleActive = async (place: TouristPlaceRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const nextActive = !place.is_active;
      const { error } = await supabaseBrowser
        .from("tourist_places")
        .update({ is_active: nextActive })
        .eq("id", place.id);

      if (error) throw error;

      setPlaces(current =>
        current.map(p => (p.id === place.id ? { ...p, is_active: nextActive } : p))
      );
      showToast({
        type: "success",
        title: nextActive ? "Tourist place activated" : "Tourist place deactivated",
      });
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Update failed",
        description: error.message || "Failed to update active state.",
      });
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      // 1. Delete from storage if cover image path exists
      if (confirmDelete.picture_id) {
        await supabaseBrowser.storage
          .from("tourist-images")
          .remove([confirmDelete.picture_id])
          .catch(err => console.error("Cover image delete error:", err));
      }

      // 2. Delete main place record (foreign keys will CASCADE delete reviews, hours, assets)
      const { error } = await supabaseBrowser
        .from("tourist_places")
        .delete()
        .eq("id", confirmDelete.id);

      if (error) throw error;

      showToast({
        type: "success",
        title: "Tourist place deleted successfully",
      });
      setRefresh(Date.now());
      setConfirmDelete(null);
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Failed to delete tourist place",
        description: error.message || "Delete operation failed.",
      });
    } finally {
      setDeleting(false);
    }
  };

  const getPublicImageUrl = (pictureId: string | null) => {
    if (!pictureId) return null;
    if (pictureId.startsWith("http")) return pictureId;
    const { data } = supabaseBrowser.storage.from("tourist-images").getPublicUrl(pictureId);
    return data?.publicUrl || null;
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
            placeholder="Search tourist places by name, city, area, or location..."
          />

          <div className="w-full overflow-x-auto bg-[#FFFFFF] rounded-[16px] p-[16px] shadow-[0px_8px_32px_0px_rgba(31,38,135,0.15)]">
            {loading ? (
              <TableSkeleton />
            ) : places.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="text-4xl mb-4">📍</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">No Tourist Places Found</h3>
                <p className="text-sm text-gray-500 mb-6 max-w-sm">
                  You haven't added any tourist places yet. Click the button below to add your first destination.
                </p>
                <Button
                  className="bg-[#5800AB] text-white hover:bg-[#4a0090] cursor-pointer rounded-xl px-6"
                  onClick={() => router.push("/dashboard/manage-tourist-places/add")}
                >
                  Add Tourist Place
                </Button>
              </div>
            ) : (
              <>
                <table className="min-w-full border-collapse bg-white">
                  <thead>
                    <tr className="border-b border-gray-200 h-[40px]">
                      <th className="px-6 py-2 text-left text-[16px] font-semibold leading-[20px] tracking-[0.5px] text-[#000000]">PLACE</th>
                      <th className="px-6 py-2 text-left text-[16px] font-semibold leading-[20px] tracking-[0.5px] text-[#000000]">LOCATION</th>
                      <th className="px-6 py-2 text-left text-[16px] font-semibold leading-[20px] tracking-[0.5px] text-[#000000]">PAYMENT</th>
                      <th className="px-6 py-2 text-left text-[16px] font-semibold leading-[20px] tracking-[0.5px] text-[#000000]">PRICE</th>
                      <th className="px-6 py-2 text-center text-[16px] font-semibold leading-[20px] tracking-[0.5px] text-[#000000]">STATUS</th>
                      <th className="px-6 py-2 text-left text-[16px] font-semibold leading-[20px] tracking-[0.5px] text-[#000000]">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="bg-[#FFFFFF]">
                    {places.map((place, idx) => {
                      const imgUrl = getPublicImageUrl(place.picture_id);

                      return (
                        <tr
                          key={place.id}
                          className={`border-b border-gray-200 hover:bg-white/20 transition cursor-pointer text-sm ${
                            idx !== places.length - 1 ? "border-b" : ""
                          }`}
                          onClick={() => router.push(`/dashboard/manage-tourist-places/${place.id}`)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {imgUrl ? (
                                <Image
                                  src={imgUrl}
                                  alt={place.place_name}
                                  width={40}
                                  height={40}
                                  className="h-10 w-10 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-[#8A92A6]">
                                  📍
                                </div>
                              )}
                              <div>
                                <div className="text-[16px] font-medium leading-[20px] tracking-[0.5px] text-[#000000]">{place.place_name}</div>
                                <div className="text-[12px] text-[#8A92A6]">Rating: {Number(place.rating || 5.0).toFixed(1)} ★ ({place.reviews_count || 0})</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-[16px] font-normal leading-[20px] tracking-[0.5px] text-[#8A92A6]">
                            {place.city ? `${place.area ? `${place.area}, ` : ""}${place.city}` : place.location_name || "—"}
                          </td>
                          <td className="px-6 py-4 text-[16px] font-normal leading-[20px] tracking-[0.5px] text-[#8A92A6]">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                              place.payment_option === "free"
                                ? "bg-green-100 text-green-700"
                                : place.payment_option === "ips"
                                ? "bg-purple-100 text-purple-700"
                                : place.payment_option === "card"
                                ? "bg-blue-100 text-blue-700"
                                : place.payment_option === "mopay"
                                ? "bg-amber-100 text-amber-700"
                                : place.payment_option === "mopay_place"
                                ? "bg-teal-100 text-teal-700"
                                : "bg-gray-100 text-gray-700"
                            }`}>
                              {place.payment_option === "free"
                                ? "Free Entry"
                                : place.payment_option === "ips"
                                ? "IPS"
                                : place.payment_option === "card"
                                ? "Credit/Debit Card"
                                : place.payment_option === "mopay"
                                ? "Mopay"
                                : place.payment_option === "mopay_place"
                                ? "Mopay Place"
                                : place.payment_option.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-[16px] font-normal leading-[20px] tracking-[0.5px] text-[#8A92A6]">
                            {Number(place.price) > 0 ? `$${Number(place.price).toFixed(2)}` : "Free"}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={(e) => handleToggleActive(place, e)}
                              className={`px-3 py-1 rounded-full text-[14px] font-semibold tracking-[0.5px] ${
                                place.is_active
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {place.is_active ? "Active" : "Inactive"}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {/* VIEW DETAILS */}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="cursor-pointer p-0 h-auto"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPlace(place);
                                }}
                              >
                                <Image src="/view.png" alt="View" width={16} height={16} className="w-4 h-4" />
                              </Button>

                              {/* EDIT */}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="cursor-pointer p-0 h-auto"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/dashboard/manage-tourist-places/${place.id}`);
                                }}
                              >
                                <Image src="/edit.png" alt="Edit" width={16} height={16} className="w-4 h-4" />
                              </Button>

                              {/* DELETE */}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="cursor-pointer p-0 h-auto"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDelete(place);
                                }}
                              >
                                <Image src="/delete.png" alt="Delete" width={16} height={16} className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="mt-4 flex items-center justify-between">
                  <PaginationBar
                    totalRecord={total}
                    totalPage={totalPages}
                    page={page}
                    limit={limit}
                    setLimit={setLimit}
                    setPage={setPage}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Floating Add Button */}
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-[#5800AB] text-white shadow-lg hover:bg-[#4a0090] cursor-pointer flex items-center justify-center"
        onClick={() => router.push("/dashboard/manage-tourist-places/add")}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* VIEW DIALOG */}
      {selectedPlace && (
        <Modal
          isOpen={!!selectedPlace}
          onClose={() => setSelectedPlace(null)}
        >
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#000000]">Tourist Place Details</h3>
            {selectedPlace.picture_id && (
              <div className="relative h-48 w-full rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={getPublicImageUrl(selectedPlace.picture_id) || ""}
                  alt={selectedPlace.place_name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold text-gray-500 block">Name</span>
                <span className="text-[#000000]">{selectedPlace.place_name}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-500 block">Location Name</span>
                <span className="text-[#000000]">{selectedPlace.location_name || "—"}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-500 block">City / Area</span>
                <span className="text-[#000000]">{selectedPlace.city} {selectedPlace.area ? `(${selectedPlace.area})` : ""}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-500 block">Payment / Price</span>
                <span className="text-[#000000] capitalize">
                  {selectedPlace.payment_option.replace(/_/g, " ")} ({Number(selectedPlace.price) > 0 ? `$${Number(selectedPlace.price).toFixed(2)}` : "Free"})
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-500 block">Rating</span>
                <span className="text-[#000000]">{Number(selectedPlace.rating || 5.0).toFixed(1)} ★ ({selectedPlace.reviews_count || 0} reviews)</span>
              </div>
              <div>
                <span className="font-semibold text-gray-500 block">Status</span>
                <span className="text-[#000000]">{selectedPlace.is_active ? "Active" : "Inactive"}</span>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setSelectedPlace(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* DELETE DIALOG */}
      {confirmDelete && (
        <Modal
          isOpen={!!confirmDelete}
          onClose={() => setConfirmDelete(null)}
        >
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#000000]">Confirm Delete</h3>
            <p className="text-sm text-gray-600">
              Are you sure you want to delete <strong>{confirmDelete.place_name}</strong>? This action is permanent and will cascade delete all associated reviews, media assets, and opening hours.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export default function TouristPlacesPage() {
  return (
    <Suspense fallback={<div className="p-6"><TableSkeleton /></div>}>
      <TouristPlacesPageContent />
    </Suspense>
  );
}

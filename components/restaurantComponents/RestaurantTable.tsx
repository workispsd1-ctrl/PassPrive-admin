"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Modal from "@/app/dashboard/_components/Modal";
import PaginationBar from "@/app/dashboard/_components/Pagination";
import { showToast } from "@/hooks/useToast";
import {
  deleteRestaurantImages,
  fetchRestaurantDetail,
  type RestaurantFlatRecord,
} from "@/lib/restaurantAdmin";
import { getTokenClient } from "@/lib/getTokenClient";

interface Props {
  restaurants: Pick<RestaurantFlatRecord, "id" | "name" | "city" | "area" | "rating" | "cost_for_two" | "offer">[];
  page: number;
  totalPages: number;
  totalRecord: number;
  limit: number;
  setPage: Dispatch<SetStateAction<number>>;
  setLimit: Dispatch<SetStateAction<number>>;
  setRefresh: (value: number) => void;
  onRowClick?: (id: string) => void;
}

export const RestaurantTable = ({
  restaurants,
  page,
  totalPages,
  totalRecord,
  limit,
  setPage,
  setLimit,
  setRefresh,
  onRowClick,
}: Props) => {
  const router = useRouter();

  const [selected, setSelected] = useState<Props["restaurants"][number] | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Props["restaurants"][number] | null>(null);
  const [loading, setLoading] = useState(false);

  /* -----------------------------------------
     DELETE
  ----------------------------------------- */
  const handleDelete = async () => {
    if (!confirmDelete?.id) {
      showToast({
        type: "error",
        title: "Invalid restaurant selected",
      });
      return;
    }

    setLoading(true);
    try {
      const existingRestaurant = await fetchRestaurantDetail(confirmDelete.id).catch(() => null);
      const urlsToDelete = Array.from(
        new Set(
          [
            existingRestaurant?.cover_image,
            ...(existingRestaurant?.food_images || []),
            ...(existingRestaurant?.ambience_images || []),
            ...(existingRestaurant?.menu || []),
          ].filter((value): value is string => Boolean(value))
        )
      );

      const token = await getTokenClient();
      if (!token) throw new Error("Not logged in. Please login as admin/superadmin.");

      const res = await fetch(`/api/restaurants/${confirmDelete.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to delete restaurant");
      }

      if (urlsToDelete.length > 0) {
        await deleteRestaurantImages(urlsToDelete).catch((cleanupError) => {
          console.error("[RestaurantTable] storage cleanup failed", cleanupError);
        });
      }

      showToast({ type: "success", title: "Restaurant deleted" });
      setRefresh(Date.now());
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete restaurant";
      showToast({
        type: "error",
        title: "Delete failed",
        description: message,
      });
    } finally {
      setLoading(false);
      setConfirmDelete(null);
    }
  };

  return (
    <>
      <div className="overflow-x-auto overflow-y-hidden rounded-[12px] border border-[#EDEFF3]">
        <table className="w-full min-w-[960px] table-fixed border-collapse">
          <colgroup>
            <col className="w-[27%]" />
            <col className="w-[22%]" />
            <col className="w-[9%]" />
            <col className="w-[14%]" />
            <col className="w-[13%]" />
            <col className="w-[15%]" />
          </colgroup>

          <thead>
            <tr className="h-[44px] border-b border-[#EDEFF3] bg-[#FAFAFB]">
              <th className="px-4 py-3 text-[12px] font-semibold uppercase leading-[16px] tracking-[0.6px] text-[#6B7280] text-left sticky left-0 bg-[#FAFAFB] z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Name</th>
              <th className="px-4 py-3 text-[12px] font-semibold uppercase leading-[16px] tracking-[0.6px] text-[#6B7280] text-left">Location</th>
              <th className="px-4 py-3 text-[12px] font-semibold uppercase leading-[16px] tracking-[0.6px] text-[#6B7280] text-left">Rating</th>
              <th className="px-4 py-3 text-[12px] font-semibold uppercase leading-[16px] tracking-[0.6px] text-[#6B7280] text-left">Cost for two</th>
              <th className="px-4 py-3 text-[12px] font-semibold uppercase leading-[16px] tracking-[0.6px] text-[#6B7280] text-center">Offer</th>
              <th className="px-4 py-3 text-[12px] font-semibold uppercase leading-[16px] tracking-[0.6px] text-[#6B7280] text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {restaurants.map((r) => {
              if (!r.id) return null;

              return (
                <tr
                  key={r.id}
                  className="group h-[104px] cursor-pointer border-b border-[#F1F2F5] transition-colors last:border-b-0 hover:bg-[#FFF7F4]"
                  onClick={() => onRowClick?.(r.id)}
                >
                  <td className="px-4 py-4 align-middle text-[13px] leading-[18px] tracking-[0.5px] font-medium text-[#111827] sticky left-0 bg-white group-hover:bg-[#FFF7F4] z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    <span className="line-clamp-4 break-words" title={r.name ?? undefined}>
                      {r.name || "—"}
                    </span>
                  </td>

                  <td className="px-4 py-4 align-middle text-[13px] leading-[18px] tracking-[0.5px] font-normal text-[#8A92A6]">
                    <span
                      className="line-clamp-4 break-words"
                      title={[r.area, r.city].filter(Boolean).join(", ")}
                    >
                      {[r.area, r.city].filter(Boolean).join(", ") || "—"}
                    </span>
                  </td>

                  <td className="px-4 py-4 align-middle text-[13px] leading-[18px] tracking-[0.5px]">
                    {r.rating ? (
                      <span className="inline-flex items-center gap-1 font-medium text-[#111827]">
                        <Star className="h-[13px] w-[13px] shrink-0 fill-[#F5A623] text-[#F5A623]" />
                        {Number(r.rating).toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-[#C3C8D4]">—</span>
                    )}
                  </td>

                  <td className="px-4 py-4 align-middle text-[13px] leading-[18px] tracking-[0.5px] whitespace-nowrap font-normal text-[#8A92A6]">
                    {r.cost_for_two ? (
                      <>
                        <span className="text-[#111827]">
                          MUR {Number(r.cost_for_two).toLocaleString("en-IN")}
                        </span>
                        <span className="ml-1 text-[11px] text-[#A8AEBD]">for 2</span>
                      </>
                    ) : (
                      <span className="text-[#C3C8D4]">—</span>
                    )}
                  </td>

                  <td className="px-4 py-4 align-middle text-[13px] leading-[18px] tracking-[0.5px] text-center">
                    {r.offer ? (
                      <span className="inline-flex h-[24px] items-center whitespace-nowrap rounded-full bg-[#FFF2EC] px-3 text-[11px] font-semibold tracking-[0.5px] text-[#FF4800]">
                        Offer
                      </span>
                    ) : (
                      <span className="text-[#C3C8D4]">—</span>
                    )}
                  </td>

                  <td className="px-4 py-4 align-middle text-[13px] leading-[18px] tracking-[0.5px]">
                    <div className="flex items-center justify-end gap-1">
                      {/* VIEW */}
                      <Button
                        size="sm"
                        variant="ghost"
                        title="View details"
                        aria-label={`View ${r.name ?? "restaurant"}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(r);
                        }}
                        className="h-8 w-8 cursor-pointer rounded-md p-0 opacity-70 transition hover:bg-[#FFE9E0] hover:opacity-100 group-hover:opacity-100"
                      >
                        <Image src="/view.png" alt="" width={16} height={16} className="h-4 w-4" />
                      </Button>

                      {/* EDIT -> go to /dashboard/manage-restaurants/[id] */}
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Edit restaurant"
                        aria-label={`Edit ${r.name ?? "restaurant"}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/manage-restaurants/${r.id}`);
                        }}
                        className="h-8 w-8 cursor-pointer rounded-md p-0 opacity-70 transition hover:bg-[#FFE9E0] hover:opacity-100 group-hover:opacity-100"
                      >
                        <Image src="/edit.png" alt="" width={16} height={16} className="h-4 w-4" />
                      </Button>

                      {/* DELETE */}
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Delete restaurant"
                        aria-label={`Delete ${r.name ?? "restaurant"}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDelete(r);
                        }}
                        className="h-8 w-8 cursor-pointer rounded-md p-0 opacity-70 transition hover:bg-[#FFE4E4] hover:opacity-100 group-hover:opacity-100"
                      >
                        <Image src="/delete.png" alt="" width={16} height={16} className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3">
        <PaginationBar
          page={page}
          setPage={setPage}
          totalPage={totalPages}
          totalRecord={totalRecord}
          limit={limit}
          setLimit={setLimit}
        />
      </div>

      {/* DETAILS MODAL */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)}>
        <div className="space-y-4 p-6">
          <div className="space-y-1">
            <h2 className="text-[18px] font-semibold leading-[24px] text-[#111827]">
              {selected?.name}
            </h2>
            <p className="text-[13px] leading-[18px] text-[#8A92A6]">
              {[selected?.area, selected?.city].filter(Boolean).join(", ") || "—"}
            </p>
          </div>

          <dl className="divide-y divide-[#F1F2F5] border-y border-[#F1F2F5]">
            {[
              {
                label: "Rating",
                value: selected?.rating ? Number(selected.rating).toFixed(1) : "—",
              },
              {
                label: "Cost for two",
                value: selected?.cost_for_two
                  ? `MUR ${Number(selected.cost_for_two).toLocaleString("en-IN")}`
                  : "—",
              },
              { label: "Offer", value: selected?.offer ? "Available" : "—" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-3">
                <dt className="text-[13px] text-[#8A92A6]">{row.label}</dt>
                <dd className="text-[13px] font-medium text-[#111827]">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Modal>

      {/* DELETE CONFIRM */}
      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <h2 className="mb-2 text-[18px] font-semibold leading-[24px] text-[#111827]">
          Delete restaurant?
        </h2>
        <p className="mb-5 text-[13px] leading-[18px] text-[#8A92A6]">
          <span className="font-medium text-[#111827]">{confirmDelete?.name}</span> and its images
          will be permanently removed. This can&apos;t be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)} className="cursor-pointer border border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#F9FAFB]">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-700 hover:bg-red-600 text-white cursor-pointer"
          >
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </Modal>
    </>
  );
};

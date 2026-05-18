"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
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
      <table className="min-w-full border-collapse bg-white">
        <thead className="bg-white">
          <tr className="border-b border-gray-200 h-[40px]">
            <th className="px-6 py-2 text-left text-[16px] font-semibold leading-[20px] tracking-[0.5px] text-[#000000]">NAME</th>
            <th className="px-6 py-2 text-left text-[16px] font-semibold leading-[20px] tracking-[0.5px] text-[#000000]">LOCATION</th>
            <th className="px-6 py-2 text-left text-[16px] font-semibold leading-[20px] tracking-[0.5px] text-[#000000]">RATING</th>
            <th className="px-6 py-2 text-left text-[16px] font-semibold leading-[20px] tracking-[0.5px] text-[#000000]">COST FOR TWO</th>
            <th className="px-6 py-2 text-center text-[16px] font-semibold leading-[20px] tracking-[0.5px] text-[#000000]">OFFER</th>
            <th className="px-6 py-2 text-left text-[16px] font-semibold leading-[20px] tracking-[0.5px] text-[#000000]">ACTIONS</th>
          </tr>
        </thead>

        <tbody className="bg-[#FFFFFF]">
          {restaurants.map((r, idx) => {
            if (!r.id) return null;

            return (
              <tr
                key={r.id}
                className={`border-b border-gray-200 hover:bg-white/20 transition cursor-pointer text-sm ${
                  idx !== restaurants.length - 1 ? "border-b" : ""
                }`}
                onClick={() => onRowClick?.(r.id)}
              >
                <td className="px-6 py-4 text-[16px] font-medium leading-[20px] tracking-[0.5px] text-[#000000]">{r.name}</td>
                <td className="px-6 py-4 text-[16px] font-normal leading-[20px] tracking-[0.5px] text-[#8A92A6]">
                  {r.area}, {r.city}
                </td>
                <td className="px-6 py-4 text-[16px] font-normal leading-[20px] tracking-[0.5px] text-[#8A92A6]">{r.rating ?? "-"}</td>
                <td className="px-6 py-4 text-[16px] font-normal leading-[20px] tracking-[0.5px] text-[#8A92A6]">
                  {r.cost_for_two ? `Rs ${r.cost_for_two}` : "-"}
                </td>
                <td className="px-6 py-4 text-center">
                  {r.offer ? (
                    <span className="bg-[#EAE3FA] text-[#5800AB] px-4 py-1.5 rounded-full text-[14px] font-semibold tracking-[0.5px] whitespace-nowrap inline-block">
                      Offer
                    </span>
                  ) : (
                    <span className="text-[#8A92A6]">—</span>
                  )}
                </td>

                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    {/* VIEW */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(r);
                      }}
                       className="cursor-pointer p-0 h-auto"
                    >
                      <Image
                        src="/view.png"
                        alt="View"
                        width={16}
                        height={16}
                        className="w-4 h-4"
                      />
                    </Button>

                    {/* EDIT -> go to /dashboard/manage-restaurants/[id] */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/manage-restaurants/${r.id}`);
                      }}
                      className="cursor-pointer p-0 h-auto"
                    >
                      <Image
                        src="/edit.png"
                        alt="Edit"
                        width={16}
                        height={16}
                        className="w-4 h-4"
                      />
                    </Button>

                    {/* DELETE */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(r);
                      }}
                       className="cursor-pointer p-0 h-auto"
                    >
                      <Image
                        src="/delete.png"
                        alt="Delete"
                        width={16}
                        height={16}
                        className="w-4 h-4"
                      />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <PaginationBar
        page={page}
        setPage={setPage}
        totalPage={totalPages}
        totalRecord={totalRecord}
        limit={limit}
        setLimit={setLimit}
      />

      {/* DETAILS MODAL */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)}>
        <div className="p-6 space-y-2">
          <h2 className="text-xl font-semibold">{selected?.name}</h2>
          <p>
            <b>Location:</b> {selected?.area}, {selected?.city}
          </p>
          <p>
            <b>Cost for two:</b>{" "}
            {selected?.cost_for_two ? `₹${selected.cost_for_two}` : "-"}
          </p>
          <p>
            <b>Rating:</b> {selected?.rating ?? "-"}
          </p>
        </div>
      </Modal>

      {/* DELETE CONFIRM */}
      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <h2 className="text-lg font-semibold mb-4">Delete restaurant?</h2>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)} className="bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer">
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

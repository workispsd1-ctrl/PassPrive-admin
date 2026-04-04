"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Modal from "@/app/dashboard/_components/Modal";
import PaginationBar from "@/app/dashboard/_components/Pagination";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

async function getAccessToken() {
  const { data, error } = await supabaseBrowser.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error("Not logged in. Please login as admin/superadmin.");
  return token;
}

interface Restaurant {
  id: string;
  name: string;
  city: string;
  area: string;
  rating: number | null;
  cost_for_two: number | null;
  created_at: string;
}

interface Props {
  restaurants: Restaurant[];
  page: number;
  totalPages: number;
  totalRecord: number;
  limit: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  setLimit: React.Dispatch<React.SetStateAction<number>>;
  setRefresh: (v: any) => void;
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

  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Restaurant | null>(null);
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
      const token = await getAccessToken();
      const res = await fetch(`${API_BASE}/api/restaurants/${confirmDelete.id}?hard=true`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to delete restaurant");
      }

      showToast({ type: "success", title: "Restaurant deleted" });
      setRefresh(Date.now());
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Delete failed",
        description: error?.message || "Failed to delete restaurant",
      });
    } finally {
      setLoading(false);
      setConfirmDelete(null);
    }
  };

  return (
    <>
      <table className="w-full border-collapse">
        <thead className="bg-white">
          <tr className="border-b border-gray-200">
            <th className="px-6 py-3 text-left text-[12px] font-semibold text-[#1D293D]">NAME</th>
            <th className="px-6 py-3 text-left text-[12px] font-semibold text-[#1D293D]">LOCATION</th>
            <th className="px-6 py-3 text-left text-[12px] font-semibold text-[#1D293D]">RATING</th>
            <th className="px-6 py-3 text-left text-[12px] font-semibold text-[#1D293D]">COST FOR TWO</th>
            <th className="px-6 py-3 text-left text-[12px] font-semibold text-[#1D293D]">ACTIONS</th>
          </tr>
        </thead>

        <tbody className="bg-[linear-gradient(135deg,_#ECFEFF_0%,_#F3E8FF_100%)]">
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
                <td className="px-6 py-3 font-medium text-[#1D293D]">{r.name}</td>
                <td className="px-6 py-3 text-[#5b6473]">
                  {r.area}, {r.city}
                </td>
                <td className="px-6 py-3 text-[#5b6473]">{r.rating ?? "-"}</td>
                <td className="px-6 py-3 text-[#5b6473]">
                  {r.cost_for_two ? `₹${r.cost_for_two}` : "-"}
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

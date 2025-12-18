"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, Info, Pencil } from "lucide-react";
import Modal from "@/app/dashboard/_components/Modal";
import PaginationBar from "@/app/dashboard/_components/Pagination";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";

interface Restaurant {
  id: string;
  name: string;
  city: string;
  area: string;
  rating: number | null;
  cost_for_two: number | null;
  offer?: string | null;
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

    const { error } = await supabaseBrowser
      .from("restaurants")
      .delete()
      .eq("id", confirmDelete.id);

    if (error) {
      showToast({
        type: "error",
        title: "Delete failed",
        description: error.message,
      });
    } else {
      showToast({ type: "success", title: "Restaurant deleted" });
      setRefresh(Date.now());
    }

    setLoading(false);
    setConfirmDelete(null);
  };

  return (
    <>
      <table className="w-full border-spacing-0">
        <thead className="bg-indigo-100">
          <tr>
            <th className="px-4 py-3 text-left text-[12px] font-semibold text-gray-600">NAME</th>
            <th className="px-4 py-3 text-left text-[12px] font-semibold text-gray-600">LOCATION</th>
            <th className="px-4 py-3 text-left text-[12px] font-semibold text-gray-600">RATING</th>
            <th className="px-4 py-3 text-left text-[12px] font-semibold text-gray-600">COST FOR TWO</th>
            <th className="px-4 py-3 text-left text-[12px] font-semibold text-gray-600">OFFER</th>
            <th className="px-4 py-3 text-left text-[12px] font-semibold text-gray-600">ACTIONS</th>
          </tr>
        </thead>

        <tbody>
          {restaurants.map((r) => {
            if (!r.id) return null;

            return (
              <tr
                key={r.id}
                className="border-b border-gray-300 hover:bg-gray-50 transition cursor-pointer text-gray-600 text-sm"
                onClick={() => onRowClick?.(r.id)}
              >
                <td className="px-4 py-4 font-medium">{r.name}</td>
                <td className="px-4 py-4">
                  {r.area}, {r.city}
                </td>
                <td className="px-4 py-4">{r.rating ?? "-"}</td>
                <td className="px-4 py-4">
                  {r.cost_for_two ? `₹${r.cost_for_two}` : "-"}
                </td>
                <td className="px-4 py-4">{r.offer || "-"}</td>

                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    {/* INFO */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(r);
                      }}
                       className=" cursor-pointer"
                    >
                      <Info className="w-4 h-4" />
                    </Button>

                    {/* EDIT -> go to /dashboard/manage-restaurants/[id] */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/manage-restaurants/${r.id}`);
                      }}
                      className=" cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>

                    {/* DELETE */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(r);
                      }}
                       className=" cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
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
          <p>
            <b>Offer:</b> {selected?.offer || "-"}
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

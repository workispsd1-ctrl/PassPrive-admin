"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, Info, Pencil } from "lucide-react";
import Modal from "@/app/dashboard/_components/Modal";
import PaginationBar from "@/app/dashboard/_components/Pagination";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";

interface Store {
  id: string;
  name: string;
  category?: string | null;
  subcategory?: string | null;

  city?: string | null;
  region?: string | null;
  location_name?: string | null;

  phone?: string | null;
  whatsapp?: string | null;

  is_active?: boolean | null;
  is_featured?: boolean | null;

  created_at: string;
}

interface Props {
  stores: Store[];
  page: number;
  totalPages: number;
  totalRecord: number;
  limit: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  setLimit: React.Dispatch<React.SetStateAction<number>>;
  setRefresh: (v: any) => void;
  onRowClick?: (id: string) => void;
}

export const StoreTable = ({
  stores,
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

  const [selected, setSelected] = useState<Store | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Store | null>(null);
  const [loading, setLoading] = useState(false);

  /* -----------------------------------------
     DELETE
  ----------------------------------------- */
  const handleDelete = async () => {
    if (!confirmDelete?.id) {
      showToast({
        type: "error",
        title: "Invalid store selected",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabaseBrowser
      .from("stores")
      .delete()
      .eq("id", confirmDelete.id);

    if (error) {
      showToast({
        type: "error",
        title: "Delete failed",
        description: error.message,
      });
    } else {
      showToast({ type: "success", title: "Store deleted" });
      setRefresh(Date.now());
    }

    setLoading(false);
    setConfirmDelete(null);
  };

  const formatLocation = (s: Store) => {
    const parts = [s.location_name, s.city, s.region].filter(Boolean);
    return parts.length ? parts.join(", ") : "-";
  };

  return (
    <>
      <table className="w-full border-spacing-0">
        <thead className="bg-indigo-100">
          <tr>
            <th className="px-4 py-3 text-left text-[12px] font-semibold text-gray-600">
              NAME
            </th>
            <th className="px-4 py-3 text-left text-[12px] font-semibold text-gray-600">
              LOCATION
            </th>
            <th className="px-4 py-3 text-left text-[12px] font-semibold text-gray-600">
              CATEGORY
            </th>
            <th className="px-4 py-3 text-left text-[12px] font-semibold text-gray-600">
              STATUS
            </th>
            <th className="px-4 py-3 text-left text-[12px] font-semibold text-gray-600">
              FEATURED
            </th>
            <th className="px-4 py-3 text-left text-[12px] font-semibold text-gray-600">
              ACTIONS
            </th>
          </tr>
        </thead>

        <tbody>
          {stores.map((s) => {
            if (!s.id) return null;

            return (
              <tr
                key={s.id}
                className="border-b border-gray-300 hover:bg-gray-50 transition cursor-pointer text-gray-600 text-sm"
                onClick={() => onRowClick?.(s.id)}
              >
                <td className="px-4 py-4 font-medium">{s.name}</td>

                <td className="px-4 py-4">{formatLocation(s)}</td>

                <td className="px-4 py-4">
                  {s.category || "-"}
                  {s.subcategory ? (
                    <span className="text-xs text-gray-500"> • {s.subcategory}</span>
                  ) : null}
                </td>

                <td className="px-4 py-4">
                  {s.is_active === false ? (
                    <span className="text-xs font-semibold text-red-600">Disabled</span>
                  ) : (
                    <span className="text-xs font-semibold text-green-700">Active</span>
                  )}
                </td>

                <td className="px-4 py-4">
                  {s.is_featured ? (
                    <span className="text-xs font-semibold text-indigo-700">Yes</span>
                  ) : (
                    <span className="text-xs text-gray-500">No</span>
                  )}
                </td>

                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    {/* INFO */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(s);
                      }}
                      className="cursor-pointer"
                    >
                      <Info className="w-4 h-4" />
                    </Button>

                    {/* EDIT -> go to /dashboard/manage-stores/[id] */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/manage-stores/${s.id}`);
                      }}
                      className="cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>

                    {/* DELETE */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(s);
                      }}
                      className="cursor-pointer"
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
            <b>Category:</b> {selected?.category || "-"}
            {selected?.subcategory ? ` • ${selected.subcategory}` : ""}
          </p>

          <p>
            <b>Location:</b>{" "}
            {selected ? formatLocation(selected) : "-"}
          </p>

          <p>
            <b>Phone:</b> {selected?.phone || "-"}
          </p>

          <p>
            <b>WhatsApp:</b> {selected?.whatsapp || "-"}
          </p>

          <p>
            <b>Status:</b> {selected?.is_active === false ? "Disabled" : "Active"}
          </p>

          <p>
            <b>Featured:</b> {selected?.is_featured ? "Yes" : "No"}
          </p>
        </div>
      </Modal>

      {/* DELETE CONFIRM */}
      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <h2 className="text-lg font-semibold mb-4">Delete store?</h2>
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => setConfirmDelete(null)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
          >
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

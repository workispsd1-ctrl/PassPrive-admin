"use client";

import React, { useState } from "react";
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
  setRefresh: (v: number) => void;
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
    try {
      const token = await getAccessToken();
      const response = await fetch(`${API_BASE}/api/stores/${confirmDelete.id}?hard=true`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || "Failed to delete store");
      }

      showToast({ type: "success", title: "Store deleted" });
      setRefresh(Date.now());
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete store",
      });
    } finally {
      setLoading(false);
      setConfirmDelete(null);
    }
  };

  const formatLocation = (s: Store) => {
    const parts = [s.location_name, s.city, s.region].filter(Boolean);
    return parts.length ? parts.join(", ") : "-";
  };

  return (
    <>
      <table className="w-full border-collapse">
        <thead className="bg-white">
          <tr className="border-b border-gray-200">
            <th className="px-6 py-3 text-left text-[12px] font-semibold text-[#1D293D]">
              NAME
            </th>
            <th className="px-6 py-3 text-left text-[12px] font-semibold text-[#1D293D]">
              LOCATION
            </th>
            <th className="px-6 py-3 text-left text-[12px] font-semibold text-[#1D293D]">
              CATEGORY
            </th>
            <th className="px-6 py-3 text-left text-[12px] font-semibold text-[#1D293D]">
              STATUS
            </th>
            <th className="px-6 py-3 text-left text-[12px] font-semibold text-[#1D293D]">
              FEATURED
            </th>
            <th className="px-6 py-3 text-left text-[12px] font-semibold text-[#1D293D]">
              ACTIONS
            </th>
          </tr>
        </thead>

        <tbody className="bg-[linear-gradient(135deg,_#ECFEFF_0%,_#F3E8FF_100%)]">
          {stores.map((s, idx) => {
            if (!s.id) return null;

            return (
              <tr
                key={s.id}
                className={`border-b border-gray-200 hover:bg-white/20 transition cursor-pointer text-sm ${
                  idx !== stores.length - 1 ? "border-b" : ""
                }`}
                onClick={() => onRowClick?.(s.id)}
              >
                <td className="px-6 py-3 font-medium text-[#1D293D]">{s.name}</td>

                <td className="px-6 py-3 text-[#5b6473]">{formatLocation(s)}</td>

                <td className="px-6 py-3 text-[#5b6473]">
                  {s.category || "-"}
                  {s.subcategory ? (
                    <span className="text-xs text-[#929292]"> • {s.subcategory}</span>
                  ) : null}
                </td>

                <td className="px-6 py-3">
                  {s.is_active === false ? (
                    <span className="text-xs font-semibold text-red-600">Disabled</span>
                  ) : (
                    <span className="text-xs font-semibold text-green-700">Active</span>
                  )}
                </td>

                <td className="px-6 py-3">
                  {s.is_featured ? (
                    <span className="text-xs font-semibold text-[#5800AB]">Yes</span>
                  ) : (
                    <span className="text-xs text-[#5b6473]">No</span>
                  )}
                </td>

                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {/* VIEW */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(s);
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

                    {/* EDIT -> go to /dashboard/manage-stores/[id] */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/manage-stores/${s.id}`);
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
                        setConfirmDelete(s);
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

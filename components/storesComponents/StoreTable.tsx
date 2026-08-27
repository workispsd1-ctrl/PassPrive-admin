"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Modal from "@/app/dashboard/_components/Modal";
import PaginationBar from "@/app/dashboard/_components/Pagination";
import { showToast } from "@/hooks/useToast";
import { deleteStoreImages, fetchStoreDetail } from "@/lib/storeAdmin";
import { getTokenClient } from "@/lib/getTokenClient";

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
      const existingStore = await fetchStoreDetail(confirmDelete.id).catch(() => null);
      const urlsToDelete = Array.from(
        new Set(
          [
            existingStore?.logo_url,
            existingStore?.cover_image_url,
            existingStore?.cover_media_type === "video" ? existingStore.cover_media_url : null,
            ...(existingStore?.gallery_urls || []),
          ].filter((value): value is string => Boolean(value))
        )
      );

      const token = await getTokenClient();
      if (!token) throw new Error("Not logged in. Please login as admin/superadmin.");

      const response = await fetch(`/api/stores/${confirmDelete.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to delete store");
      }

      if (urlsToDelete.length > 0) {
        await deleteStoreImages(urlsToDelete).catch((cleanupError) => {
          console.error("[StoreTable] storage cleanup failed", cleanupError);
        });
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
      <div className="overflow-hidden rounded-[12px] border border-[#EDEFF3]">
        <table className="w-full min-w-[960px] table-fixed border-collapse">
          <colgroup>
            <col className="w-[27%]" />
            <col className="w-[22%]" />
            <col className="w-[18%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[13%]" />
          </colgroup>

          <thead>
            <tr className="h-[44px] border-b border-[#EDEFF3] bg-[#FAFAFB]">
              <th className="px-4 py-3 text-[12px] font-semibold uppercase leading-[16px] tracking-[0.6px] text-[#6B7280] text-left">Name</th>
              <th className="px-4 py-3 text-[12px] font-semibold uppercase leading-[16px] tracking-[0.6px] text-[#6B7280] text-left">Location</th>
              <th className="px-4 py-3 text-[12px] font-semibold uppercase leading-[16px] tracking-[0.6px] text-[#6B7280] text-left">Category</th>
              <th className="px-4 py-3 text-[12px] font-semibold uppercase leading-[16px] tracking-[0.6px] text-[#6B7280] text-left">Status</th>
              <th className="px-4 py-3 text-[12px] font-semibold uppercase leading-[16px] tracking-[0.6px] text-[#6B7280] text-left">Featured</th>
              <th className="px-4 py-3 text-[12px] font-semibold uppercase leading-[16px] tracking-[0.6px] text-[#6B7280] text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="bg-[#FFFFFF]">
            {stores.map((s) => {
              if (!s.id) return null;

              return (
                <tr
                  key={s.id}
                  className="group h-[104px] cursor-pointer border-b border-[#F1F2F5] transition-colors last:border-b-0 hover:bg-[#FFF7F4]"
                  onClick={() => onRowClick?.(s.id)}
                >
                  <td className="px-4 py-4 align-middle text-[13px] leading-[18px] tracking-[0.5px] font-medium text-[#111827]">
                    <span className="line-clamp-4 break-words" title={s.name ?? undefined}>
                      {s.name || "—"}
                    </span>
                  </td>

                  <td className="px-4 py-4 align-middle text-[13px] leading-[18px] tracking-[0.5px] font-normal text-[#8A92A6]">
                    <span className="line-clamp-4 break-words" title={formatLocation(s)}>
                      {formatLocation(s)}
                    </span>
                  </td>

                  <td className="px-4 py-4 align-middle text-[13px] leading-[18px] tracking-[0.5px] font-normal text-[#8A92A6]">
                    <span className="line-clamp-4 break-words" title={s.category || ""}>
                      {s.category || "—"}
                      {s.subcategory ? (
                        <span className="text-[11px] text-[#A8AEBD]"> • {s.subcategory}</span>
                      ) : null}
                    </span>
                  </td>

                  <td className="px-4 py-4 align-middle text-[13px] leading-[18px] tracking-[0.5px]">
                    {s.is_active === false ? (
                      <span className="inline-flex h-[24px] items-center whitespace-nowrap rounded-full bg-red-50 px-3 text-[11px] font-semibold tracking-[0.5px] text-red-600">
                        Disabled
                      </span>
                    ) : (
                      <span className="inline-flex h-[24px] items-center whitespace-nowrap rounded-full bg-green-50 px-3 text-[11px] font-semibold tracking-[0.5px] text-green-700">
                        Active
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-4 align-middle text-[13px] leading-[18px] tracking-[0.5px]">
                    {s.is_featured ? (
                      <span className="inline-flex h-[24px] items-center whitespace-nowrap rounded-full bg-[#FFF2EC] px-3 text-[11px] font-semibold tracking-[0.5px] text-[#FF4800]">
                        Yes
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(s);
                        }}
                        className="h-8 w-8 cursor-pointer rounded-md p-0 opacity-70 transition hover:bg-[#FFE9E0] hover:opacity-100 group-hover:opacity-100"
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
                        className="h-8 w-8 cursor-pointer rounded-md p-0 opacity-70 transition hover:bg-[#FFE9E0] hover:opacity-100 group-hover:opacity-100"
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
                        className="h-8 w-8 cursor-pointer rounded-md p-0 opacity-70 transition hover:bg-[#FFE9E0] hover:opacity-100 group-hover:opacity-100"
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
      </div>

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

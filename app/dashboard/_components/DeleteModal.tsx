"use client";

import { showToast } from "@/hooks/useToast";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { useEffect, useState } from "react";

interface DeleteModalProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  rowData: any;
  setRowData: React.Dispatch<React.SetStateAction<any>>;
  name: string;
  handleRefresh: () => void;
}

export default function DeleteModal({
  isOpen,
  setIsOpen,
  rowData,
  setRowData,
  name,
  handleRefresh,
}: DeleteModalProps) {
  const [loading, setLoading] = useState(false);

  
  const confirmDelete = async () => {
    setLoading(true);
    try {
      await supabaseBrowser.from("recycle_bin").insert([{ name, data: rowData }]);

      if (name === "users") {
        const res = await fetch("/api/delete-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: rowData?.id,
            admin_key: process.env.NEXT_PUBLIC_ADMIN_KEY, 
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to delete user");

      } else {
        // Delete from normal table
        const { error } = await supabaseBrowser
          .from(name)
          .delete()
          .eq("id", rowData?.id);
        if (error) throw new Error(error.message);
      }

      setIsOpen(false);
      setRowData(null);
      handleRefresh();

      showToast({
        title: "Success",
        description: `${name === "users" ? "User" : name} deleted successfully`,
      });
    } catch (error: any) {
      showToast({
        title: "Error",
        description: error.message || "Something went wrong.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg p-6 shadow-lg w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-2">Are you sure?</h2>
        <p className="text-sm text-gray-600 mb-4">
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button
            disabled={loading}
            onClick={() => {
              setIsOpen(false);
              setRowData(null);
            }}
            className="px-4 py-2 text-sm rounded bg-gray-200 hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            disabled={loading}
            onClick={confirmDelete}
            className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700"
          >
            {loading ? "Loading ..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

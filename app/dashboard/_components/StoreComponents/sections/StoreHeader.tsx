"use client";

import React from "react";
import { ChevronLeft } from "lucide-react";
import { Switch } from "../ui";

export default function StoreHeader({
  onBack,
  isActive,
  setIsActive,
  isFeatured,
  setIsFeatured,
  preserveScroll,
}: {
  onBack: () => void;
  isActive: boolean;
  setIsActive: (v: boolean) => void;
  isFeatured: boolean;
  setIsFeatured: (v: boolean) => void;
  preserveScroll: (fn: () => void) => void;
}) {
  return (
    <div className="flex flex-col gap-2 mb-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center text-sm font-semibold text-indigo-700 border-indigo-200 hover:bg-indigo-50"
          aria-label="Back to Manage Stores"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="text-2xl font-extrabold text-gray-900">Add Store</div>
      </div>

      <div className="text-sm text-gray-600">
        Store details + offers/discounts + settlements.
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <Switch
          checked={!!isActive}
          onChange={setIsActive}
          label="Status"
          hint={isActive ? "Active (visible in app)" : "Inactive (hidden from app)"}
          preserveScroll={preserveScroll}
        />

        <Switch
          checked={!!isFeatured}
          onChange={setIsFeatured}
          label="Featured"
          hint="Prioritize this store in modules like ‘near you’ and ‘featured’."
          preserveScroll={preserveScroll}
        />
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

interface AddScreenDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (screenName: string) => void;
}

export default function AddScreenDialog({ open, onClose, onSave }: AddScreenDialogProps) {
  const [screenName, setScreenName] = useState("");

  if (!open) return null;

  const handleSave = () => {
    if (!screenName.trim()) return;
    onSave(screenName.trim());
    setScreenName("");
    onClose();
  };

  const handleClose = () => {
    setScreenName("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Add Screen</h2>
          <button
            type="button"
            title="Close"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-2">
          <label className="text-xs font-medium text-gray-600">
            Screen Name <span className="text-red-500">*</span>
          </label>
          <input
            autoFocus
            value={screenName}
            onChange={(e) => setScreenName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="e.g. Home Screen"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!screenName.trim()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#5800AB] px-5 text-sm font-medium text-white shadow-[0_10px_20px_rgba(88,0,171,0.25)] hover:bg-[#4a0090] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

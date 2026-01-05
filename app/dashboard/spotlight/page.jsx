"use client";

import { useState } from "react";
import { Plus, Sparkles, ArrowLeft } from "lucide-react";
import SpotlightList from "./SpotlightList";
import SpotlightForm from "./SpotlightForm";

export default function SpotlightAdminPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const isEditing = !!editingItem;

  return (
    <div className="min-h-screen bg-white">
      {/* Top header */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Title */}
            <div className="flex items-start gap-3">
             

              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {showForm ? (isEditing ? "Edit Spotlight" : "Create Spotlight") : "Spotlight Manager"}
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  {showForm
                    ? "Add title, media and target module. Save to publish."
                    : "Manage spotlight banners shown across modules."}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {!showForm ? (
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setShowForm(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-200"
                >
                  <Plus className="h-4 w-4" />
                  Add Spotlight
                </button>
              ) : (
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingItem(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to list
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-7xl px-4  py-6 sm:px-6">
        {!showForm ? (
          <div className="space-y-4">
            {/* List container */}
            <div className="rounded-2xl p-4 sm:p-6">
              <SpotlightList
                onEdit={(item) => {
                  setEditingItem(item);
                  setShowForm(true);
                }}
              />
            </div>
            {/* Mobile floating add */}
            <button
              onClick={() => {
                setEditingItem(null);
                setShowForm(true);
              }}
              className="fixed bottom-5 right-5 inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-200 sm:hidden"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <SpotlightForm
              editingItem={editingItem}
              onCancel={() => {
                setShowForm(false);
                setEditingItem(null);
              }}
              onDone={() => {
                setShowForm(false);
                setEditingItem(null);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Plus, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import SpotlightList from "./SpotlightList";
import SpotlightForm from "./SpotlightForm";

export default function SpotlightAdminPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const isEditing = !!editingItem;

  return (
    <div className="min-h-screen" style={{ background: "#FFFFFF4D" }}>
      <div className="mx-auto flex min-h-screen w-full max-w-[1360px] flex-col" style={{ background: "#FFFFFF4D" }}>
        <div className="flex-1 px-4 pb-6 pt-4 sm:px-5 lg:px-6">
          <Card
            className="overflow-hidden rounded-[18px] border border-slate-200/70 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-sm"
            style={{
              background:
                "linear-gradient(310.35deg, rgba(255, 255, 255, 0.4) 4.07%, rgba(255, 255, 255, 0.3) 48.73%, rgba(255, 255, 255, 0.2) 100%)",
            }}
          >
            <CardHeader className="space-y-4 border-b border-slate-100/90 bg-white/70 px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="text-[18px] leading-6 text-slate-900">Cards</CardTitle>
                  <CardDescription className="mt-1 text-[12px] leading-5 text-slate-500">
                    {showForm
                      ? "Add title, media and target module. Save to publish."
                      : "Manage spotlight banners shown across modules."}
                  </CardDescription>
                </div>

                {!showForm ? (
                  <button
                    onClick={() => {
                      setEditingItem(null);
                      setShowForm(true);
                    }}
                    className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#5800AB] px-5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(88,0,171,0.25)] hover:bg-[#4a0090]"
                  >
                    <Plus className="h-4 w-4" />
                    Add new card
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setEditingItem(null);
                    }}
                    className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to list
                  </button>
                )}
              </div>
            </CardHeader>

            <CardContent className="px-4 py-4 sm:px-5">
              {!showForm ? (
                <SpotlightList
                  onEdit={(item) => {
                    setEditingItem(item);
                    setShowForm(true);
                  }}
                />
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

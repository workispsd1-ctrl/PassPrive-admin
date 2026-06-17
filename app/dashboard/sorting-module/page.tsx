"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Monitor, Plus, Trash2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";
import AddScreenDialog from "./_components/AddScreenDialog";

type SortingScreen = {
  id: string;
  name: string;
  created_at: string;
  session_sorting_titles?: { id: string }[];
};

export default function SortingModulePage() {
  const router = useRouter();
  const [screens, setScreens] = useState<SortingScreen[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadScreens = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabaseBrowser
      .from("session_sorting")
      .select("id, name, created_at, session_sorting_titles(id)")
      .order("created_at", { ascending: false });

    if (error) {
      showToast({ type: "error", title: "Failed to load screens", description: error.message });
      setScreens([]);
    } else {
      setScreens((data as SortingScreen[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadScreens();
  }, [loadScreens]);

  const handleAddScreen = async (name: string) => {
    const { error } = await supabaseBrowser
      .from("session_sorting")
      .insert({ name });

    if (error) {
      showToast({ type: "error", title: "Failed to create screen", description: error.message });
    } else {
      showToast({ type: "success", title: "Screen created" });
      await loadScreens();
    }
  };

  const handleDelete = async (e: React.MouseEvent, screen: SortingScreen) => {
    e.stopPropagation();
    if (!confirm(`Delete "${screen.name}"? All titles inside will also be deleted.`)) return;
    setDeletingId(screen.id);
    try {
      const { error } = await supabaseBrowser
        .from("session_sorting")
        .delete()
        .eq("id", screen.id);
      if (error) throw error;
      showToast({ type: "success", title: "Screen deleted" });
      await loadScreens();
    } catch (err) {
      showToast({ type: "error", title: "Failed to delete", description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F4EEFF] ring-1 ring-[#E7DDF8]">
          <Monitor className="h-5 w-5 text-[#5800AB]" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Session Sorting</h1>
          <p className="text-sm text-gray-600">Manage screens and their sorting titles</p>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between">
                <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100" />
              </div>
              <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : screens.length === 0 ? (
        <div className="overflow-hidden rounded-[14px] border border-slate-200/80 bg-white shadow-[0_2px_14px_rgba(15,23,42,0.07)]">
          <div className="flex flex-col items-center text-center py-20">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4EEFF] ring-1 ring-[#E7DDF8]">
              <Monitor className="h-5 w-5 text-[#5800AB]" />
            </div>
            <p className="text-base font-semibold text-gray-900">No screens yet</p>
            <p className="mt-1 text-sm text-gray-500">Tap the + button to create your first screen.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {screens.map((screen) => {
            const titleCount = screen.session_sorting_titles?.length ?? 0;
            return (
              <div
                key={screen.id}
                onClick={() => router.push(`/dashboard/sorting-module/${screen.id}`)}
                className="relative bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_2px_14px_rgba(15,23,42,0.07)] hover:shadow-md hover:border-[#5800AB]/30 transition-all duration-150 group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4EEFF] ring-1 ring-[#E7DDF8] group-hover:bg-[#EAD5FF] transition">
                    <Monitor className="h-5 w-5 text-[#5800AB]" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-[#F4EEFF] px-2 py-0.5 text-[11px] font-medium text-[#5800AB] ring-1 ring-[#E7DDF8]">
                      {titleCount} {titleCount === 1 ? "title" : "titles"}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, screen)}
                      disabled={deletingId === screen.id}
                      title="Delete screen"
                      className="text-slate-300 hover:text-red-500 transition p-0.5 rounded disabled:opacity-50"
                    >
                      {deletingId === screen.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-[#5800AB] transition">
                  {screen.name}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Click to manage titles</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating + button */}
      <button
        type="button"
        onClick={() => setAddOpen(true)}
        aria-label="Add screen"
        className="fixed bottom-8 right-8 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-[#5800AB] text-white shadow-[0_12px_28px_rgba(88,0,171,0.4)] transition-transform hover:scale-105 hover:bg-[#4a0090]"
      >
        <Plus className="h-6 w-6" />
      </button>

      <AddScreenDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleAddScreen}
      />
    </div>
  );
}

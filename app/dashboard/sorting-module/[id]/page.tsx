"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Monitor, Pencil, Plus, Trash2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";
import AddTitleDialog, { TitlePayload, TitleRow } from "./_components/AddTitleDialog";

type SortingScreen = {
  id: string;
  name: string;
};

type SortingTitle = {
  id: string;
  screen_id: string;
  title: string;
  sort_order: number;
  section_key: string | null;
  template: string | null;
  data_source: string | null;
  params: Record<string, unknown> | null;
  style_variant: string | null;
  title_color: string | null;
  background: string | null;
  enabled: boolean;
  created_at: string;
};

export default function ScreenDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [screen, setScreen] = useState<SortingScreen | null>(null);
  const [titles, setTitles] = useState<SortingTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<TitleRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);

    const [screenRes, titlesRes] = await Promise.all([
      supabaseBrowser.from("session_sorting").select("id, name").eq("id", id).single(),
      supabaseBrowser
        .from("session_sorting_titles")
        .select("*")
        .eq("screen_id", id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

    if (screenRes.error) {
      showToast({ type: "error", title: "Screen not found", description: screenRes.error.message });
      setScreen(null);
    } else {
      setScreen(screenRes.data as SortingScreen);
    }

    if (!titlesRes.error) {
      setTitles((titlesRes.data as SortingTitle[]) ?? []);
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveTitle = async (payload: TitlePayload) => {
    const { error } = editing?.id
      ? await supabaseBrowser.from("session_sorting_titles").update(payload).eq("id", editing.id)
      : await supabaseBrowser.from("session_sorting_titles").insert({ screen_id: id, ...payload });

    if (error) {
      showToast({ type: "error", title: editing?.id ? "Failed to update" : "Failed to add title", description: error.message });
    } else {
      showToast({ type: "success", title: editing?.id ? "Title updated" : "Title added" });
      setEditing(null);
      await loadData();
    }
  };

  const handleDelete = async (titleId: string) => {
    setDeletingId(titleId);
    try {
      const { error } = await supabaseBrowser.from("session_sorting_titles").delete().eq("id", titleId);
      if (error) throw error;
      showToast({ type: "success", title: "Title deleted" });
      await loadData();
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
        <button
          type="button"
          title="Go back"
          onClick={() => router.push("/dashboard/sorting-module")}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 transition"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F4EEFF] ring-1 ring-[#E7DDF8]">
          <Monitor className="h-5 w-5 text-[#5800AB]" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {loading ? "Loading…" : (screen?.name ?? "Screen not found")}
          </h1>
          <p className="text-sm text-gray-600">
            {titles.length} {titles.length === 1 ? "title" : "titles"}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[14px] border border-slate-200/80 bg-white shadow-[0_2px_14px_rgba(15,23,42,0.07)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium w-12">#</th>
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Section</th>
                <th className="px-5 py-3 font-medium">Sort Order</th>
                <th className="px-5 py-3 font-medium">Visible</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4">
                      <div className="h-3 w-6 animate-pulse rounded bg-slate-100" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-3.5 w-44 animate-pulse rounded bg-slate-100" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-5 w-20 animate-pulse rounded-full bg-slate-100" />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="ml-auto h-8 w-20 animate-pulse rounded-lg bg-slate-100" />
                    </td>
                  </tr>
                ))}

              {!loading && titles.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16">
                    <div className="flex flex-col items-center text-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4EEFF] ring-1 ring-[#E7DDF8]">
                        <Plus className="h-5 w-5 text-[#5800AB]" />
                      </div>
                      <p className="text-base font-semibold text-gray-900">No titles yet</p>
                      <p className="mt-1 text-sm text-gray-500">
                        Tap the + button to add your first title.
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                titles.map((item, idx) => (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-5 py-4 text-xs text-slate-400">{idx + 1}</td>
                    <td className="px-5 py-4 font-medium text-gray-900">{item.title}</td>
                    <td className="px-5 py-4">
                      {item.template ? (
                        <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 ring-1 ring-purple-200">
                          {item.template}
                        </span>
                      ) : item.section_key ? (
                        <span className="text-xs text-slate-600">{item.section_key}</span>
                      ) : (
                        <span className="text-xs font-medium text-amber-600">not mapped</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-full bg-[#F4EEFF] px-2.5 py-1 text-xs font-semibold text-[#5800AB] ring-1 ring-[#E7DDF8]">
                        {item.sort_order}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          item.enabled
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                        }`}
                      >
                        {item.enabled ? "Visible" : "Hidden"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          title="Edit title"
                          onClick={() => {
                            setEditing(item);
                            setAddOpen(true);
                          }}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 shadow-sm hover:bg-slate-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          title="Delete title"
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-[13px] font-medium text-red-600 shadow-sm hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId === item.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating + button */}
      <button
        type="button"
        onClick={() => {
          setEditing(null);
          setAddOpen(true);
        }}
        aria-label="Add title"
        className="fixed bottom-8 right-8 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-[#5800AB] text-white shadow-[0_12px_28px_rgba(88,0,171,0.4)] transition-transform hover:scale-105 hover:bg-[#4a0090]"
      >
        <Plus className="h-6 w-6" />
      </button>

      <AddTitleDialog
        open={addOpen}
        editing={editing}
        onClose={() => {
          setAddOpen(false);
          setEditing(null);
        }}
        onSave={handleSaveTitle}
      />
    </div>
  );
}

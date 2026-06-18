"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Layers, Pencil, Trash2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";

export default function HomeSectionsList({ refreshKey, screen, onScreenChange, onEdit }) {
  const [screens, setScreens] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);

  // Load the list of screens once; default the selection to "Home Screen".
  useEffect(() => {
    (async () => {
      const { data, error } = await supabaseBrowser
        .from("session_sorting")
        .select("id, name")
        .order("id", { ascending: true });
      if (error) {
        showToast({ type: "error", title: "Failed to load screens", description: error.message });
        return;
      }
      const list = data || [];
      setScreens(list);
      if (!screen && list.length) {
        onScreenChange(list.find((s) => s.name === "Home Screen") || list[0]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchItems = async () => {
    if (!screen?.id) return;
    setLoading(true);
    const { data, error } = await supabaseBrowser
      .from("session_sorting_titles")
      .select("*")
      .eq("screen_id", screen.id)
      .order("sort_order", { ascending: true });
    setLoading(false);
    if (error) {
      showToast({ type: "error", title: "Failed to load sections", description: error.message });
      setItems([]);
      return;
    }
    setItems(data || []);
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen?.id, refreshKey]);

  // Swap a row's sort_order with its neighbour (UI thread reorder is two writes).
  const move = async (row, dir) => {
    const idx = items.findIndex((i) => i.id === row.id);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    const a = items[idx];
    const b = items[swapIdx];
    setBusyId(row.id);
    const r1 = await supabaseBrowser.from("session_sorting_titles").update({ sort_order: b.sort_order }).eq("id", a.id);
    const r2 = await supabaseBrowser.from("session_sorting_titles").update({ sort_order: a.sort_order }).eq("id", b.id);
    setBusyId(null);
    if (r1.error || r2.error) {
      showToast({ type: "error", title: "Reorder failed", description: (r1.error || r2.error).message });
      return;
    }
    fetchItems();
  };

  const toggleEnabled = async (row) => {
    setBusyId(row.id);
    const { error } = await supabaseBrowser
      .from("session_sorting_titles")
      .update({ enabled: !row.enabled })
      .eq("id", row.id);
    setBusyId(null);
    if (error) {
      showToast({ type: "error", title: "Update failed", description: error.message });
      return;
    }
    fetchItems();
  };

  const handleDelete = async (row) => {
    if (!confirm(`Delete section "${row.title || row.section_key}"? This cannot be undone.`)) return;
    const { error } = await supabaseBrowser.from("session_sorting_titles").delete().eq("id", row.id);
    if (error) {
      showToast({ type: "error", title: "Delete failed", description: error.message });
      return;
    }
    showToast({ type: "success", title: "Section deleted" });
    fetchItems();
  };

  return (
    <div className="mt-1">
      {/* Screen selector */}
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm font-medium text-slate-600">Screen</label>
        <select
          value={screen?.id ?? ""}
          onChange={(e) => onScreenChange(screens.find((s) => String(s.id) === e.target.value) || null)}
          className="h-10 w-64 appearance-none rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
        >
          {screens.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name || `Screen ${s.id}`}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-[14px] border border-slate-200/80 bg-gray-100" />
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="rounded-[16px] border border-dashed border-slate-200 bg-white p-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 ring-1 ring-gray-200">
            <Layers className="h-5 w-5 text-gray-700" />
          </div>
          <p className="text-base font-semibold text-gray-900">No sections yet</p>
          <p className="mt-1 text-sm text-gray-600">Add the first section for this screen.</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item, idx) => {
            const isTemplate = !!item.template;
            return (
              <div
                key={item.id}
                className={`group flex flex-col gap-3 rounded-[14px] border border-slate-200/80 p-4 shadow-[0_2px_14px_rgba(15,23,42,0.07)] sm:flex-row sm:items-center ${
                  item.enabled ? "bg-white" : "bg-slate-50 opacity-70"
                }`}
              >
                {/* Order controls */}
                <div className="flex items-center gap-1">
                  <span className="w-7 text-center text-sm font-semibold text-slate-400">{item.sort_order}</span>
                  <div className="flex flex-col">
                    <button
                      onClick={() => move(item, "up")}
                      disabled={idx === 0 || busyId === item.id}
                      className="rounded-md p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => move(item, "down")}
                      disabled={idx === items.length - 1 || busyId === item.id}
                      className="rounded-md p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-gray-900">{item.title || "(no title)"}</h3>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        isTemplate
                          ? "bg-purple-50 text-purple-700 ring-1 ring-purple-200"
                          : "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                      }`}
                    >
                      {isTemplate ? `TEMPLATE · ${item.template}` : "NATIVE"}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-gray-500">
                    {isTemplate
                      ? `source: ${item.data_source || "—"}`
                      : `key: ${item.section_key || "—"}`}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 sm:ml-auto">
                  <button
                    onClick={() => toggleEnabled(item)}
                    disabled={busyId === item.id}
                    className={`inline-flex h-9 items-center rounded-xl border px-3 text-[13px] font-medium shadow-sm ${
                      item.enabled
                        ? "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {item.enabled ? "Visible" : "Hidden"}
                  </button>
                  <button
                    onClick={() => onEdit(item)}
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 shadow-sm hover:bg-slate-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 bg-white px-3 text-[13px] font-medium text-red-600 shadow-sm hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

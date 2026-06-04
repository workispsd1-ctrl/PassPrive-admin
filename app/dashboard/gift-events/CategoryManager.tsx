"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImageIcon, Loader2, Plus, Trash2, Upload, X } from "lucide-react";

import { supabaseBrowser } from "@/lib/supabaseBrowser";

const STORAGE_BUCKET = "gift-events";

type Category = {
  id: string;
  name: string;
  icon_url: string | null;
  icon_path: string | null;
  sort_order: number;
  is_active: boolean;
};

type Props = {
  onClose: () => void;
  // Called after any change so the parent can refresh its category list.
  onChanged: () => void;
};

function uid() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function fileExt(file: File) {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type.split("/").pop() || "png";
}

export default function CategoryManager({ onClose, onChanged }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const iconRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabaseBrowser
      .from("gift_event_categories")
      .select("id, name, icon_url, icon_path, sort_order, is_active")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) {
      console.error("Failed to load categories:", error);
      setError(error.message || "Failed to load categories.");
      setCategories([]);
    } else {
      setCategories((data as Category[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (iconPreview.startsWith("blob:")) URL.revokeObjectURL(iconPreview);
    };
  }, [iconPreview]);

  function pickIcon(f: File | undefined) {
    if (!f) return;
    setIconFile(f);
    if (iconPreview.startsWith("blob:")) URL.revokeObjectURL(iconPreview);
    setIconPreview(URL.createObjectURL(f));
  }

  async function handleAdd() {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      let icon_url: string | null = null;
      let icon_path: string | null = null;

      if (iconFile) {
        const path = `categories/${uid()}.${fileExt(iconFile)}`;
        const { error: uploadError } = await supabaseBrowser.storage
          .from(STORAGE_BUCKET)
          .upload(path, iconFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabaseBrowser.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(path);
        icon_url = data.publicUrl;
        icon_path = path;
      }

      const { error: insertError } = await supabaseBrowser
        .from("gift_event_categories")
        .insert({
          name: name.trim(),
          icon_url,
          icon_path,
          sort_order: categories.length,
        });
      if (insertError) throw insertError;

      setName("");
      setIconFile(null);
      if (iconPreview.startsWith("blob:")) URL.revokeObjectURL(iconPreview);
      setIconPreview("");
      if (iconRef.current) iconRef.current.value = "";

      await load();
      onChanged();
    } catch (err) {
      console.error("Failed to add category:", err);
      setError(err instanceof Error ? err.message : "Failed to add category.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cat: Category) {
    if (
      !confirm(
        `Delete "${cat.name}"? Events in this category will become uncategorised.`
      )
    )
      return;
    setDeletingId(cat.id);
    try {
      const { error: deleteError } = await supabaseBrowser
        .from("gift_event_categories")
        .delete()
        .eq("id", cat.id);
      if (deleteError) throw deleteError;

      if (cat.icon_path) {
        await supabaseBrowser.storage
          .from(STORAGE_BUCKET)
          .remove([cat.icon_path])
          .catch(() => undefined);
      }
      await load();
      onChanged();
    } catch (err) {
      console.error("Failed to delete category:", err);
      alert(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Event Categories</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Add new */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-xs font-semibold text-gray-700">Add category</p>
            <div className="flex items-center gap-3">
              {/* Icon picker */}
              <button
                type="button"
                onClick={() => iconRef.current?.click()}
                className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white text-slate-400 hover:border-[#5800AB] hover:text-[#5800AB]"
                title="Upload icon"
              >
                {iconPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={iconPreview} alt="Icon" className="h-full w-full object-cover" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
              </button>
              <input
                ref={iconRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => pickIcon(e.target.files?.[0])}
              />

              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="e.g., Personal Events"
                className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
              />

              <button
                onClick={handleAdd}
                disabled={!name.trim() || saving}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#5800AB] px-3 text-sm font-medium text-white hover:bg-[#4a0090] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add
              </button>
            </div>
            <p className="mt-2 text-[11px] text-gray-400">
              Icon is optional — represents the category across the app.
            </p>
          </div>

          {/* List */}
          <div className="space-y-2">
            {loading && (
              <div className="flex items-center justify-center py-6 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}

            {!loading && categories.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-500">
                No categories yet. Add your first one above.
              </p>
            )}

            {!loading &&
              categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    {cat.icon_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cat.icon_url} alt={cat.name} className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-slate-300" />
                    )}
                  </div>
                  <p className="flex-1 truncate text-sm font-medium text-gray-900">
                    {cat.name}
                  </p>
                  <button
                    onClick={() => handleDelete(cat)}
                    disabled={deletingId === cat.id}
                    className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === cat.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

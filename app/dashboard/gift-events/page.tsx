"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Gift,
  Loader2,
  Pencil,
  Plus,
  Search,
  Tags,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { supabaseBrowser } from "@/lib/supabaseBrowser";

import CategoryManager from "./CategoryManager";

const STORAGE_BUCKET = "gift-events";

type GiftEvent = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  image_path: string | null;
  start_date: string | null;
  end_date: string | null;
  is_always_available: boolean;
  is_active: boolean;
  category_id: string | null;
  created_at: string;
  updated_at: string;
  gift_event_categories?: { id: string; name: string } | null;
};

type GiftEventCategory = {
  id: string;
  name: string;
};

type EventForm = {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  is_always_available: boolean;
  is_active: boolean;
  category_id: string;
};

const emptyForm: EventForm = {
  title: "",
  description: "",
  start_date: "",
  end_date: "",
  is_always_available: false,
  is_active: true,
  category_id: "",
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
  return file.type.split("/").pop() || "jpg";
}

// "2026-06-04T10:30:00Z" -> "2026-06-04T10:30" for <input type="datetime-local">
function toLocalInput(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Extract the storage object path from a public URL so we can delete it later.
function storagePathFromUrl(url: string | null) {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
  const idx = url.indexOf(marker);
  return idx === -1 ? null : url.slice(idx + marker.length);
}

export default function GiftEventsPage() {
  const [events, setEvents] = useState<GiftEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GiftEvent | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Categories
  const [categories, setCategories] = useState<GiftEventCategory[]>([]);
  const [catModalOpen, setCatModalOpen] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error } = await supabaseBrowser
      .from("gift_events")
      .select("*, gift_event_categories(id, name)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load gift events:", error);
      setError(error.message || "Failed to load gift events.");
      setEvents([]);
    } else {
      setEvents((data as GiftEvent[]) ?? []);
    }
    setLoading(false);
  }, []);

  const loadCategories = useCallback(async () => {
    const { data, error } = await supabaseBrowser
      .from("gift_event_categories")
      .select("id, name")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) {
      console.error("Failed to load categories:", error);
      return;
    }
    setCategories((data as GiftEventCategory[]) ?? []);
  }, []);

  useEffect(() => {
    loadEvents();
    loadCategories();
  }, [loadEvents, loadCategories]);

  useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.description || "").toLowerCase().includes(q)
    );
  }, [events, query]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFile(null);
    setPreview("");
    if (fileRef.current) fileRef.current.value = "";
    setModalOpen(true);
  }

  function openEdit(ev: GiftEvent) {
    setEditing(ev);
    setForm({
      title: ev.title,
      description: ev.description || "",
      start_date: toLocalInput(ev.start_date),
      end_date: toLocalInput(ev.end_date),
      is_always_available: ev.is_always_available,
      is_active: ev.is_active,
      category_id: ev.category_id || "",
    });
    setFile(null);
    setPreview(ev.image_url || "");
    if (fileRef.current) fileRef.current.value = "";
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setFile(null);
    setPreview("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function pickFile(f: File | undefined) {
    if (!f) return;
    setFile(f);
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(f));
  }

  async function uploadImageIfNeeded(): Promise<{
    image_url: string | null;
    image_path: string | null;
  }> {
    if (!file) {
      return {
        image_url: editing?.image_url ?? null,
        image_path: editing?.image_path ?? null,
      };
    }

    const path = `events/${uid()}.${fileExt(file)}`;
    const { error: uploadError } = await supabaseBrowser.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;

    const { data } = supabaseBrowser.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path);

    return { image_url: data.publicUrl, image_path: path };
  }

  const canSave = form.title.trim().length > 0 && !saving;

  async function handleSubmit() {
    if (!canSave) return;

    if (
      !form.is_always_available &&
      form.start_date &&
      form.end_date &&
      new Date(form.end_date) < new Date(form.start_date)
    ) {
      setError("End date must be after the start date.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const { image_url, image_path } = await uploadImageIfNeeded();

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        image_url,
        image_path,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
        // Always-available events never expire.
        end_date:
          form.is_always_available || !form.end_date
            ? null
            : new Date(form.end_date).toISOString(),
        is_always_available: form.is_always_available,
        is_active: form.is_active,
        category_id: form.category_id || null,
      };

      if (editing) {
        // If the image changed, clean up the old object.
        const oldPath = editing.image_path;
        if (file && oldPath && oldPath !== image_path) {
          await supabaseBrowser.storage
            .from(STORAGE_BUCKET)
            .remove([oldPath])
            .catch(() => undefined);
        }

        const { error: updateError } = await supabaseBrowser
          .from("gift_events")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", editing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabaseBrowser
          .from("gift_events")
          .insert(payload);
        if (insertError) throw insertError;
      }

      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setFile(null);
      setPreview("");
      if (fileRef.current) fileRef.current.value = "";
      await loadEvents();
    } catch (err) {
      console.error("Failed to save gift event:", err);
      setError(err instanceof Error ? err.message : "Failed to save event.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(ev: GiftEvent) {
    if (!confirm(`Delete "${ev.title}"? This cannot be undone.`)) return;
    setDeletingId(ev.id);
    try {
      const { error: deleteError } = await supabaseBrowser
        .from("gift_events")
        .delete()
        .eq("id", ev.id);
      if (deleteError) throw deleteError;

      const path = ev.image_path || storagePathFromUrl(ev.image_url);
      if (path) {
        await supabaseBrowser.storage
          .from(STORAGE_BUCKET)
          .remove([path])
          .catch(() => undefined);
      }
      await loadEvents();
    } catch (err) {
      console.error("Failed to delete gift event:", err);
      alert(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F4EEFF] ring-1 ring-[#E7DDF8]">
            <Gift className="h-5 w-5 text-[#5800AB]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Gift Events</h1>
            <p className="text-sm text-gray-600">
              Manage all gift events shown in the app.
            </p>
          </div>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search gift events..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
            />
          </div>
          <button
            onClick={() => setCatModalOpen(true)}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Tags className="h-4 w-4 text-[#5800AB]" />
            Categories
          </button>
        </div>
      </div>

      {error && !modalOpen && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-[14px] border border-slate-200/80 bg-white shadow-[0_2px_14px_rgba(15,23,42,0.07)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Event</th>
                <th className="px-5 py-3 font-medium">Schedule</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Created</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-16 animate-pulse rounded-lg bg-slate-100" />
                        <div className="space-y-2">
                          <div className="h-3.5 w-40 animate-pulse rounded bg-slate-100" />
                          <div className="h-3 w-28 animate-pulse rounded bg-slate-100" />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="ml-auto h-8 w-24 animate-pulse rounded-lg bg-slate-100" />
                    </td>
                  </tr>
                ))}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-16">
                    <div className="flex flex-col items-center text-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-200">
                        <Gift className="h-5 w-5 text-slate-500" />
                      </div>
                      <p className="text-base font-semibold text-gray-900">
                        No gift events yet
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        Tap the + button to create your first event.
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                filtered.map((ev) => (
                  <tr key={ev.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                          {ev.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={ev.image_url}
                              alt={ev.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Gift className="h-4 w-4 text-slate-300" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium text-gray-900">
                              {ev.title}
                            </p>
                            {ev.gift_event_categories?.name && (
                              <span className="inline-flex shrink-0 items-center rounded-full bg-[#F4EEFF] px-2 py-0.5 text-[11px] font-medium text-[#5800AB] ring-1 ring-[#E7DDF8]">
                                {ev.gift_event_categories.name}
                              </span>
                            )}
                          </div>
                          {ev.description && (
                            <p className="mt-0.5 line-clamp-1 max-w-[280px] text-xs text-gray-500">
                              {ev.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      <div className="flex items-center gap-1.5 text-xs">
                        <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                        {ev.is_always_available ? (
                          <span className="inline-flex items-center rounded-full bg-[#F4EEFF] px-2 py-0.5 font-medium text-[#5800AB] ring-1 ring-[#E7DDF8]">
                            Always available
                          </span>
                        ) : (
                          <span>
                            {formatDate(ev.start_date)} — {formatDate(ev.end_date)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                          ev.is_active
                            ? "bg-green-50 text-green-700 ring-1 ring-green-200"
                            : "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
                        ].join(" ")}
                      >
                        {ev.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500">
                      {formatDate(ev.created_at)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(ev)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 shadow-sm hover:bg-slate-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(ev)}
                          disabled={deletingId === ev.id}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-[13px] font-medium text-red-600 shadow-sm hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId === ev.id ? (
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

      {/* Floating add button */}
      <button
        onClick={openCreate}
        aria-label="Add gift event"
        className="fixed bottom-8 right-8 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-[#5800AB] text-white shadow-[0_12px_28px_rgba(88,0,171,0.4)] transition-transform hover:scale-105 hover:bg-[#4a0090]"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editing ? "Edit Gift Event" : "New Gift Event"}
              </h2>
              <button
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
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

              {/* Image */}
              <div>
                <label className="text-xs font-medium text-gray-600">Photo</label>
                <div className="mt-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                  {preview ? (
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preview}
                        alt="Preview"
                        className="h-44 w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-44 items-center justify-center rounded-xl border border-slate-200 bg-white text-center">
                      <div>
                        <Gift className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                        <p className="text-sm text-gray-500">No photo selected</p>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => pickFile(e.target.files?.[0])}
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#5800AB] px-3 py-2 text-xs font-medium text-white hover:bg-[#4a0090]"
                    >
                      <Upload className="h-4 w-4" />
                      {preview ? "Change" : "Upload"}
                    </button>
                    {preview && (
                      <button
                        type="button"
                        onClick={() => {
                          setFile(null);
                          if (preview.startsWith("blob:"))
                            URL.revokeObjectURL(preview);
                          setPreview(editing?.image_url || "");
                          if (fileRef.current) fileRef.current.value = "";
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        <X className="h-4 w-4" />
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-medium text-gray-600">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g., Diwali Gift Festival"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-gray-600">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  rows={3}
                  placeholder="Short description of the event"
                  className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              {/* Category */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-600">
                    Category
                  </label>
                  <button
                    type="button"
                    onClick={() => setCatModalOpen(true)}
                    className="text-xs font-medium text-[#5800AB] hover:underline"
                  >
                    Manage categories
                  </button>
                </div>
                <select
                  value={form.category_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category_id: e.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                >
                  <option value="">No category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Always available */}
              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Always available
                  </p>
                  <p className="text-xs text-gray-500">
                    Event never expires (e.g. Birthday).
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.is_always_available}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      is_always_available: e.target.checked,
                      end_date: e.target.checked ? "" : f.end_date,
                    }))
                  }
                  className="h-5 w-5 accent-[#5800AB]"
                />
              </label>

              {/* Dates */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-gray-600">
                    Start date
                  </label>
                  <input
                    type="datetime-local"
                    value={form.start_date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, start_date: e.target.value }))
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">
                    End date
                  </label>
                  <input
                    type="datetime-local"
                    value={form.end_date}
                    disabled={form.is_always_available}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, end_date: e.target.value }))
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                  />
                  {form.is_always_available && (
                    <p className="mt-1 text-[11px] text-gray-400">
                      No expiry for always-available events.
                    </p>
                  )}
                </div>
              </div>

              {/* Active toggle */}
              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Active</p>
                  <p className="text-xs text-gray-500">
                    Inactive events are hidden from the app.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, is_active: e.target.checked }))
                  }
                  className="h-5 w-5 accent-[#5800AB]"
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                onClick={closeModal}
                disabled={saving}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSave}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#5800AB] px-5 text-sm font-medium text-white shadow-[0_10px_20px_rgba(88,0,171,0.25)] hover:bg-[#4a0090] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Saving…" : editing ? "Save changes" : "Create event"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories manager */}
      {catModalOpen && (
        <CategoryManager
          onClose={() => setCatModalOpen(false)}
          onChanged={loadCategories}
        />
      )}
    </div>
  );
}

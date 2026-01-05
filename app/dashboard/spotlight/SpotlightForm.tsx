"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image as ImageIcon,
  Video as VideoIcon,
  Upload,
  X,
  Loader2,
  Globe,
  UtensilsCrossed,
  Store,
  CalendarDays,
} from "lucide-react";

interface SpotlightItem {
  id?: string;
  title: string;
  subtitle?: string;
  media_type: "image" | "video";
  media_url: string;
  thumbnail_url?: string;
  module_type: "dining" | "stores" | "events" | "global";
}

interface Props {
  editingItem: SpotlightItem | null;
  onCancel: () => void;
  onDone: () => void;
}

const MODULES = [
  { value: "global", label: "Global", Icon: Globe, desc: "Visible across the app" },
  { value: "dining", label: "Dining", Icon: UtensilsCrossed, desc: "Shows in Dining module" },
  { value: "stores", label: "Stores", Icon: Store, desc: "Shows in Stores module" },
  { value: "events", label: "Events", Icon: CalendarDays, desc: "Shows in Events module" },
] as const;

export default function SpotlightForm({ editingItem, onCancel, onDone }: Props) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [moduleType, setModuleType] = useState<"dining" | "stores" | "events" | "global">(
    "global"
  );

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title);
      setSubtitle(editingItem.subtitle || "");
      setMediaType(editingItem.media_type);
      setModuleType(editingItem.module_type);
      setPreview(editingItem.media_url || "");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } else {
      setTitle("");
      setSubtitle("");
      setMediaType("image");
      setModuleType("global");
      setPreview("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [editingItem]);

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const canSave = useMemo(() => {
    if (!title.trim()) return false;
    if (!editingItem?.id && !file) return false;
    return true;
  }, [title, editingItem?.id, file]);

  const handlePick = () => fileRef.current?.click();

  const handleRemoveFile = () => {
    setFile(null);
    if (editingItem?.media_url) {
      setPreview(editingItem.media_url);
      setMediaType(editingItem.media_type);
    } else {
      setPreview("");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const form = new FormData();
      form.append("title", title.trim());
      form.append("subtitle", subtitle.trim());
      form.append("media_type", mediaType);
      form.append("module_type", moduleType);
      if (file) form.append("file", file);

      const endpoint = editingItem?.id ? `/api/spotlight/${editingItem.id}` : `/api/spotlight`;

      const res = await fetch(endpoint, {
        method: editingItem?.id ? "PUT" : "POST",
        body: form,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Failed to save item");
      }

      onDone();
    } catch (err) {
      console.error(err);
      alert("Failed to save item");
    } finally {
      setLoading(false);
    }
  };

  const isImage = mediaType === "image";

  return (
    <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {editingItem ? "Edit Spotlight Item" : "Add Spotlight Item"}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Upload a hero image/video and choose where it appears.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading || !canSave}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </span>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Inputs */}
        <div className="lg:col-span-7 space-y-6">
          {/* Content card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Content</h3>
              <p className="text-xs text-gray-500">Title is required. Subtitle is optional.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Weekend Food Fest"
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
                <div className="mt-1 text-[11px] text-gray-400">{title.trim().length}/80</div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">Subtitle</label>
                <input
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g., Book your table now"
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>

          {/* Target card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Target</h3>
              <p className="text-xs text-gray-500">
                Decide which module this spotlight should appear in.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {MODULES.map(({ value, label, Icon, desc }) => {
                const active = moduleType === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setModuleType(value)}
                    className={[
                      "flex items-start gap-3 rounded-2xl border p-4 text-left transition",
                      active
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 bg-white hover:bg-gray-50",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border",
                        active ? "border-blue-600 bg-white" : "border-gray-200 bg-white",
                      ].join(" ")}
                    >
                      <Icon className={active ? "h-4 w-4 text-blue-700" : "h-4 w-4 text-gray-700"} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-900">{label}</p>
                        <span className={active ? "h-2.5 w-2.5 rounded-full bg-blue-600" : "h-2.5 w-2.5 rounded-full bg-gray-200"} />
                      </div>
                      <p className="mt-1 text-xs text-gray-600">{desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Media */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Media</h3>
                <p className="text-xs text-gray-500">Choose image/video and upload file.</p>
              </div>

              {/* Toggle */}
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setMediaType("image")}
                  className={[
                    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition",
                    mediaType === "image" ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-50",
                  ].join(" ")}
                >
                  <ImageIcon className="h-4 w-4" />
                  Image
                </button>

                <button
                  type="button"
                  onClick={() => setMediaType("video")}
                  className={[
                    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition",
                    mediaType === "video" ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-50",
                  ].join(" ")}
                >
                  <VideoIcon className="h-4 w-4" />
                  Video
                </button>
              </div>
            </div>

            {/* Upload box */}
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {file ? file.name : "Upload your media"}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    {isImage ? "PNG, JPG, WEBP" : "MP4, MOV"} • Recommended: 16:9
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept={isImage ? "image/*" : "video/*"}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;

                      setFile(f);
                      const url = URL.createObjectURL(f);
                      setPreview(url);
                    }}
                  />

                  <button
                    type="button"
                    onClick={handlePick}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700"
                  >
                    <Upload className="h-4 w-4" />
                    Choose
                  </button>

                  {(file || (!file && editingItem?.media_url)) && (
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      title="Remove"
                    >
                      <X className="h-4 w-4" />
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Preview */}
              {preview ? (
                <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="Preview" className="h-56 w-full object-cover" />
                  ) : (
                    <video src={preview} controls className="h-56 w-full object-cover" />
                  )}
                </div>
              ) : (
                <div className="mt-4 flex h-56 items-center justify-center rounded-2xl border border-gray-200 bg-white">
                  <div className="text-center">
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
                      {isImage ? (
                        <ImageIcon className="h-5 w-5 text-gray-700" />
                      ) : (
                        <VideoIcon className="h-5 w-5 text-gray-700" />
                      )}
                    </div>
                    <p className="text-sm text-gray-900">No preview yet</p>
                    <p className="mt-1 text-xs text-gray-600">
                      Choose a {isImage ? "image" : "video"} file to preview it here.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* helper */}
            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-3">
              <p className="text-xs text-gray-600">
                Tip: Use high quality media. For videos, keep it short for faster loading.
              </p>
            </div>
          </div>

          {/* Footer note */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs text-gray-600">
              {editingItem?.id
                ? "If you don’t upload a new file, the existing media will remain unchanged."
                : "Title + Media file are required to create a new spotlight item."}
            </p>
          </div>
        </div>
      </div>

      {/* Mobile footer buttons */}
      <div className="mt-6 flex gap-3 lg:hidden">
        <button
          onClick={onCancel}
          className="w-1/2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || !canSave}
          className="w-1/2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

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

export default function SpotlightForm({ editingItem, onCancel, onDone }: Props) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [moduleType, setModuleType] = useState<
    "dining" | "stores" | "events" | "global"
  >("global");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title);
      setSubtitle(editingItem.subtitle || "");
      setMediaType(editingItem.media_type);
      setModuleType(editingItem.module_type);
      setPreview(editingItem.media_url);
    }
  }, [editingItem]);

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const form = new FormData();
      form.append("title", title);
      form.append("subtitle", subtitle);
      form.append("media_type", mediaType);
      form.append("module_type", moduleType);
      if (file) form.append("file", file);

      const endpoint = editingItem
        ? `/api/spotlight/${editingItem.id}`
        : `/api/spotlight`;

      await fetch(endpoint, {
        method: editingItem ? "PUT" : "POST",
        body: form,
      });

      onDone();
    } catch (err) {
      console.error(err);
      alert("Failed to save item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 bg-[#1A1A1A] p-6 rounded-xl border border-[#333]">
      <h2 className="text-xl text-white mb-4">
        {editingItem ? "Edit Spotlight Item" : "Add Spotlight Item"}
      </h2>

      {/* Inputs */}
      <label className="text-gray-300 text-sm">Title</label>
      <input
        className="w-full mt-1 p-2 bg-[#0D0D0D] border border-gray-600 rounded-lg text-white"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <label className="text-gray-300 text-sm mt-3">Subtitle</label>
      <input
        className="w-full mt-1 p-2 bg-[#0D0D0D] border border-gray-600 rounded-lg text-white"
        value={subtitle}
        onChange={(e) => setSubtitle(e.target.value)}
      />

      <label className="text-gray-300 text-sm mt-3">Media Type</label>
      <select
        value={mediaType}
        onChange={(e) =>
          setMediaType(e.target.value as "image" | "video")
        }
        className="w-full mt-1 p-2 bg-[#0D0D0D] border border-gray-600 rounded-lg text-white"
      >
        <option value="image">Image</option>
        <option value="video">Video</option>
      </select>

      <label className="text-gray-300 text-sm mt-3">Upload Media</label>
      <input
        type="file"
        accept={mediaType === "image" ? "image/*" : "video/*"}
        className="mt-1 p-2 bg-[#0D0D0D] border border-gray-600 rounded-lg text-white w-full"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            setFile(f);
            setPreview(URL.createObjectURL(f));
          }
        }}
      />

      {preview && (
        <div className="mt-4">
          {mediaType === "image" ? (
            <img src={preview} className="w-48 rounded-lg" />
          ) : (
            <video src={preview} controls className="w-48 rounded-lg" />
          )}
        </div>
      )}

      <label className="text-gray-300 text-sm mt-3">Module Type</label>
      <select
        value={moduleType}
        onChange={(e) =>
          setModuleType(e.target.value as any)
        }
        className="w-full mt-1 p-2 bg-[#0D0D0D] border border-gray-600 rounded-lg text-white"
      >
        <option value="global">Global</option>
        <option value="dining">Dining</option>
        <option value="stores">Stores</option>
        <option value="events">Events</option>
      </select>

      <div className="flex gap-3 mt-6">
        <button
          onClick={onCancel}
          className="bg-gray-600 px-4 py-2 rounded-lg text-white"
        >
          Cancel
        </button>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-[#DA3224] px-4 py-2 rounded-lg text-white"
        >
          {loading ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

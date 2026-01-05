"use client";

import { useState } from "react";
import axios from "axios";
import { ChevronLeft } from 'lucide-react';
import Link from "next/link";

export default function AddOfferPage() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  const [form, setForm] = useState({
    title: "",
    type: "image",
    priority: 1,
    is_active: true,
  });

  const [file, setFile] = useState<File | null>(null);

  const onSubmit = async () => {
    if (!file) {
      alert("Please upload a file");
      return;
    }

    const formData = new FormData();
    formData.append("title", form.title);
    formData.append("type", form.type);
    formData.append("priority", String(form.priority));
    formData.append("is_active", String(form.is_active));
    formData.append("media", file); // 🔥 actual file

   await axios.post(`${backendUrl}/api/homeherooffers/upload`, formData, {
  headers: { "Content-Type": "multipart/form-data" },
});


    alert("Offer Added!");
    window.location.href = "/admin/offers";
  };

  return (
    <div className="max-w-xl">
      <div className="py-5">  <Link href="/dashboard/offers"><ChevronLeft  /></Link></div>

      <div className="space-y-4">

        {/* Title */}
        <input
          type="text"
          placeholder="Offer title"
          className="w-full p-3 rounded border border-gray-300"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />

        {/* Type */}
        <select
          className="w-full p-3 rounded border border-gray-300"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          <option value="image">Image</option>
          <option value="video">Video</option>
          <option value="lottie">Lottie</option>
        </select>

        {/* File Upload */}
        <input
          type="file"
          accept={form.type === "video" ? "video/*" : form.type === "image" ? "image/*" : ".json"}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full p-3 rounded border border-gray-300"
        />

        {/* Preview */}
        {file && (
          <div className="mt-3">
            {form.type === "image" && (
              <img
                src={URL.createObjectURL(file)}
                className="w-48 rounded"
              />
            )}

            {form.type === "video" && (
              <video
                src={URL.createObjectURL(file)}
                className="w-48 rounded"
                controls
              />
            )}
          </div>
        )}

        {/* Priority */}
        <input
          type="number"
          className="w-full p-3 rounded border border-gray-300"
          value={form.priority}
          onChange={(e) =>
            setForm({ ...form, priority: Number(e.target.value) })
          }
        />

        <button
          onClick={onSubmit}
          className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 text-white"
        >
          Save Offer
        </button>
      </div>
    </div>
  );
}

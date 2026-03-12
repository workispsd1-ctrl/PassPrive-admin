"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

type Offer = {
  id: number;
  title: string;
  type: string;
  media_url: string;
  priority: number;
  is_active: boolean;
};

export default function EditOfferPage() {
  const { id } = useParams();
  const router = useRouter();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    type: "image",
    priority: 1,
    is_active: true,
  });

  const [currentMediaUrl, setCurrentMediaUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // Load existing offer data
  useEffect(() => {
    const loadOffer = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${backendUrl}/api/homeherooffers/${id}`, {
          headers: { 'Cache-Control': 'no-cache' }
        });
        const offer: Offer = res.data.offer || res.data;

        setForm({
          title: offer.title || "",
          type: offer.type || "image",
          priority: offer.priority || 1,
          is_active: offer.is_active ?? true,
        });
        setCurrentMediaUrl(offer.media_url || "");
      } catch (err: any) {
        console.error("Error loading offer:", err);
        console.error("Backend URL:", backendUrl);
        console.error("Full URL:", `${backendUrl}/api/homeherooffers/${id}`);
        alert(`Failed to load offer: ${err.response?.data?.message || err.message}`);
        router.push("/dashboard/offers");
      } finally {
        setLoading(false);
      }
    };

    if (id) loadOffer();
  }, [id]);

  const onSubmit = async () => {
    try {
      setSaving(true);

      // If user uploaded a new file, use FormData
      if (file) {
        const formData = new FormData();
        formData.append("title", form.title);
        formData.append("type", form.type);
        formData.append("priority", String(form.priority));
        formData.append("is_active", String(form.is_active));
        formData.append("media", file);

        await axios.put(`${backendUrl}/api/homeherooffers/${id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        // No new file, just update metadata
        await axios.put(`${backendUrl}/api/homeherooffers/${id}`, {
          title: form.title,
          type: form.type,
          priority: form.priority,
          is_active: form.is_active,
        });
      }

      alert("Offer updated successfully!");
      router.refresh(); // Clear Next.js cache
      router.push("/dashboard/offers");
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to update offer");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3" />
          <div className="h-12 bg-slate-200 rounded" />
          <div className="h-12 bg-slate-200 rounded" />
          <div className="h-32 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl p-4">
      <div className="py-5 flex items-center gap-3">
        <Link href="/dashboard/offers">
          <ChevronLeft className="cursor-pointer hover:bg-slate-100 rounded" />
        </Link>
        <h1 className="text-2xl font-semibold">Edit Offer</h1>
      </div>

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Offer Title
          </label>
          <input
            type="text"
            placeholder="Offer title"
            className="w-full p-3 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Type
          </label>
          <select
            className="w-full p-3 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="lottie">Lottie</option>
          </select>
        </div>

        {/* Current Media Preview */}
        {currentMediaUrl && !file && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Current Media
            </label>
            <div className="border rounded-lg p-4 bg-slate-50">
              {form.type === "image" && (
                <img
                  src={currentMediaUrl}
                  alt="Current offer"
                  className="w-full max-w-md rounded shadow-sm"
                />
              )}
              {form.type === "video" && (
                <video
                  src={currentMediaUrl}
                  className="w-full max-w-md rounded shadow-sm"
                  controls
                />
              )}
            </div>
          </div>
        )}

        {/* File Upload (Optional - to replace) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {currentMediaUrl ? "Replace Media (optional)" : "Upload Media"}
          </label>
          <input
            type="file"
            accept={
              form.type === "video"
                ? "video/*"
                : form.type === "image"
                ? "image/*"
                : ".json"
            }
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full p-3 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* New File Preview */}
        {file && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              New Media Preview
            </label>
            <div className="border rounded-lg p-4 bg-slate-50">
              {form.type === "image" && (
                <img
                  src={URL.createObjectURL(file)}
                  alt="New preview"
                  className="w-full max-w-md rounded shadow-sm"
                />
              )}
              {form.type === "video" && (
                <video
                  src={URL.createObjectURL(file)}
                  className="w-full max-w-md rounded shadow-sm"
                  controls
                />
              )}
            </div>
          </div>
        )}

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Priority (higher = shown first)
          </label>
          <input
            type="number"
            className="w-full p-3 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={form.priority}
            onChange={(e) =>
              setForm({ ...form, priority: Number(e.target.value) })
            }
          />
        </div>

        {/* Active Status */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="is_active"
            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
            Active (visible to users)
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={onSubmit}
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Update Offer"}
          </button>

          <Link
            href="/dashboard/offers"
            className="px-6 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition flex items-center justify-center"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}

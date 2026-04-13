"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { supabaseBrowser } from "@/lib/supabaseBrowser";

function buildStoragePath(type: string, fileName: string) {
  const extension = fileName.split(".").pop() || "bin";
  const random = Math.random().toString(36).slice(2, 9);
  return `${type}/${Date.now()}-${random}.${extension}`;
}

export default function AddOfferPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
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

    try {
      setSaving(true);
      const path = buildStoragePath(form.type, file.name);
      const { error: uploadError } = await supabaseBrowser.storage
        .from("HomeHeroOffers")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data } = supabaseBrowser.storage.from("HomeHeroOffers").getPublicUrl(path);
      const { error: insertError } = await supabaseBrowser.from("homeherooffers").insert({
        title: form.title || null,
        type: form.type,
        media_url: data.publicUrl,
        thumbnail_url: null,
        cta_text: null,
        cta_link: null,
        priority: form.priority,
        is_active: form.is_active,
        start_at: null,
        end_at: null,
      });
      if (insertError) throw insertError;

      router.push("/dashboard/offers");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to create offer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl">
      <div className="py-5">
        <Link href="/dashboard/offers">
          <ChevronLeft />
        </Link>
      </div>

      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Add Home Hero Offer</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create a new banner for the main home hero section.
          </p>
        </div>

        <input
          type="text"
          placeholder="Offer title"
          className="w-full rounded border border-gray-300 p-3"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />

        <select
          className="w-full rounded border border-gray-300 p-3"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          <option value="image">Image</option>
          <option value="video">Video</option>
          <option value="lottie">Lottie</option>
        </select>

        <input
          type="file"
          accept={form.type === "video" ? "video/*" : form.type === "image" ? "image/*" : ".json"}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full rounded border border-gray-300 p-3"
        />

        {file && (
          <div className="mt-3">
            {form.type === "image" ? (
              <img src={URL.createObjectURL(file)} alt="Offer preview" className="w-48 rounded" />
            ) : (
              <video src={URL.createObjectURL(file)} className="w-48 rounded" controls />
            )}
          </div>
        )}

        <input
          type="number"
          className="w-full rounded border border-gray-300 p-3"
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: Number(e.target.value) || 1 })}
        />

        <button
          onClick={onSubmit}
          disabled={saving}
          className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Offer"}
        </button>
      </div>
    </div>
  );
}

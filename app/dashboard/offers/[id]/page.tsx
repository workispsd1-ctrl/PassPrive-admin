"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Offer = {
  id: number;
  title: string | null;
  type: string;
  media_url: string;
  priority: number | null;
  is_active: boolean | null;
};

function buildStoragePath(type: string, fileName: string) {
  const extension = fileName.split(".").pop() || "bin";
  const random = Math.random().toString(36).slice(2, 9);
  return `${type}/${Date.now()}-${random}.${extension}`;
}

function extractStoragePath(publicUrl: string) {
  const objectPublicMatch = publicUrl.match(/\/object\/public\/[^/]+\/(.+)$/);
  if (objectPublicMatch?.[1]) return objectPublicMatch[1];
  const bucketMatch = publicUrl.match(/\/HomeHeroOffers\/(.+)$/);
  return bucketMatch?.[1] ?? null;
}

export default function EditOfferPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

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

  useEffect(() => {
    const loadOffer = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabaseBrowser
          .from("homeherooffers")
          .select("id,title,type,media_url,priority,is_active")
          .eq("id", Number(id))
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Offer not found");

        const offer = data as Offer;
        setForm({
          title: offer.title || "",
          type: offer.type || "image",
          priority: offer.priority || 1,
          is_active: offer.is_active ?? true,
        });
        setCurrentMediaUrl(offer.media_url || "");
      } catch (error) {
        alert(error instanceof Error ? error.message : "Failed to load offer");
        router.push("/dashboard/offers");
      } finally {
        setLoading(false);
      }
    };

    if (id) void loadOffer();
  }, [id, router]);

  const onSubmit = async () => {
    try {
      setSaving(true);

      let nextMediaUrl = currentMediaUrl;
      if (file) {
        const path = buildStoragePath(form.type, file.name);
        const { error: uploadError } = await supabaseBrowser.storage
          .from("HomeHeroOffers")
          .upload(path, file);
        if (uploadError) throw uploadError;

        const { data } = supabaseBrowser.storage.from("HomeHeroOffers").getPublicUrl(path);
        nextMediaUrl = data.publicUrl;

        const oldPath = extractStoragePath(currentMediaUrl);
        if (oldPath) {
          await supabaseBrowser.storage.from("HomeHeroOffers").remove([oldPath]).catch(() => undefined);
        }
      }

      const { error } = await supabaseBrowser
        .from("homeherooffers")
        .update({
          title: form.title || null,
          type: form.type,
          media_url: nextMediaUrl,
          priority: form.priority,
          is_active: form.is_active,
        })
        .eq("id", Number(id));
      if (error) throw error;

      router.push("/dashboard/offers");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update offer");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 rounded bg-slate-200" />
          <div className="h-12 rounded bg-slate-200" />
          <div className="h-12 rounded bg-slate-200" />
          <div className="h-32 rounded bg-slate-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl p-4">
      <div className="flex items-center gap-3 py-5">
        <Link href="/dashboard/offers">
          <ChevronLeft className="cursor-pointer rounded hover:bg-slate-100" />
        </Link>
        <h1 className="text-2xl font-semibold">Edit Home Hero Offer</h1>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Offer Title</label>
          <input
            type="text"
            placeholder="Offer title"
            className="w-full rounded border border-gray-300 p-3"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Type</label>
          <select
            className="w-full rounded border border-gray-300 p-3"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="lottie">Lottie</option>
          </select>
        </div>

        {currentMediaUrl && !file && (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Current Media</label>
            <div className="rounded-lg border bg-slate-50 p-4">
              {form.type === "image" ? (
                <img src={currentMediaUrl} alt="Current offer" className="w-full max-w-md rounded shadow-sm" />
              ) : (
                <video src={currentMediaUrl} className="w-full max-w-md rounded shadow-sm" controls />
              )}
            </div>
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            {currentMediaUrl ? "Replace Media (optional)" : "Upload Media"}
          </label>
          <input
            type="file"
            accept={form.type === "video" ? "video/*" : form.type === "image" ? "image/*" : ".json"}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full rounded border border-gray-300 p-3"
          />
        </div>

        {file && (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">New Media Preview</label>
            <div className="rounded-lg border bg-slate-50 p-4">
              {form.type === "image" ? (
                <img src={URL.createObjectURL(file)} alt="New preview" className="w-full max-w-md rounded shadow-sm" />
              ) : (
                <video src={URL.createObjectURL(file)} className="w-full max-w-md rounded shadow-sm" controls />
              )}
            </div>
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Priority (higher = shown first)</label>
          <input
            type="number"
            className="w-full rounded border border-gray-300 p-3"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: Number(e.target.value) || 1 })}
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="is_active"
            className="h-5 w-5 rounded"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
            Active (visible to users)
          </label>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={onSubmit}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {saving ? "Saving..." : "Update Offer"}
          </button>

          <Link
            href="/dashboard/offers"
            className="flex items-center justify-center rounded-lg bg-slate-200 px-6 py-2.5 text-slate-700 transition hover:bg-slate-300"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}

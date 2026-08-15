"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { supabaseBrowser } from "@/lib/supabaseBrowser";
import BannerActionFields, { type BannerAction } from "../../../../_components/BannerActionFields";
import {
  buildBannerStoragePath,
  extractStoragePath,
  getBannerConfig,
} from "../../../bannerConfigs";

type Banner = {
  id: number;
  title: string | null;
  type: string;
  media_url: string;
  thumbnail_url: string | null;
  priority: number | null;
  is_active: boolean | null;
  action: BannerAction;
};

export default function EditBannerPage() {
  const { kind, id } = useParams<{ kind: string; id: string }>();
  const router = useRouter();
  const config = getBannerConfig(kind);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "image",
    priority: 1,
    is_active: true,
  });
  const [currentMediaUrl, setCurrentMediaUrl] = useState("");
  const [currentThumbnailUrl, setCurrentThumbnailUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [action, setAction] = useState<BannerAction>(null);

  useEffect(() => {
    if (!config) {
      router.push("/dashboard/offers");
      return;
    }

    const loadBanner = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabaseBrowser
          .from(config.table)
          .select("id,title,type,media_url,thumbnail_url,priority,is_active,action")
          .eq("id", Number(id))
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Banner not found");

        const banner = data as Banner;
        setForm({
          title: banner.title || "",
          type: banner.type || "image",
          priority: banner.priority || 1,
          is_active: banner.is_active ?? true,
        });
        setCurrentMediaUrl(banner.media_url || "");
        setCurrentThumbnailUrl(banner.thumbnail_url || "");
        setAction(banner.action ?? null);
      } catch (error) {
        alert(error instanceof Error ? error.message : "Failed to load banner");
        router.push("/dashboard/offers");
      } finally {
        setLoading(false);
      }
    };

    if (id) void loadBanner();
  }, [config, id, router]);

  const onSubmit = async () => {
    if (!config) return;

    try {
      setSaving(true);
      const bucket = config.storageBucket;

      let nextMediaUrl = currentMediaUrl;
      if (file) {
        const path = buildBannerStoragePath(form.type, file.name);
        const { error: uploadError } = await supabaseBrowser.storage.from(bucket).upload(path, file);
        if (uploadError) throw uploadError;

        const { data } = supabaseBrowser.storage.from(bucket).getPublicUrl(path);
        nextMediaUrl = data.publicUrl;

        const oldPath = extractStoragePath(currentMediaUrl, bucket);
        if (oldPath) {
          await supabaseBrowser.storage.from(bucket).remove([oldPath]).catch(() => undefined);
        }
      }

      let nextThumbnailUrl = currentThumbnailUrl || null;
      if (thumbnail) {
        const thumbPath = buildBannerStoragePath("thumbnail", thumbnail.name);
        const { error: thumbError } = await supabaseBrowser.storage
          .from(bucket)
          .upload(thumbPath, thumbnail);
        if (thumbError) throw thumbError;

        nextThumbnailUrl = supabaseBrowser.storage.from(bucket).getPublicUrl(thumbPath).data.publicUrl;

        const oldThumbPath = extractStoragePath(currentThumbnailUrl, bucket);
        if (oldThumbPath) {
          await supabaseBrowser.storage.from(bucket).remove([oldThumbPath]).catch(() => undefined);
        }
      }

      const { error } = await supabaseBrowser
        .from(config.table)
        .update({
          title: form.title || null,
          type: form.type,
          media_url: nextMediaUrl,
          thumbnail_url: form.type === "video" ? nextThumbnailUrl : null,
          action: action && action.type !== "NONE" ? action : null,
          priority: form.priority,
          is_active: form.is_active,
        })
        .eq("id", Number(id));
      if (error) throw error;

      router.push("/dashboard/offers");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update banner");
    } finally {
      setSaving(false);
    }
  };

  if (!config) return null;

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
        <h1 className="text-2xl font-semibold">{config.editLabel}</h1>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Banner Title</label>
          <input
            type="text"
            placeholder="Banner title"
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
                <img src={currentMediaUrl} alt="Current banner" className="w-full max-w-md rounded shadow-sm" />
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

        {form.type === "video" && (
          <div className="space-y-2 rounded border border-amber-200 bg-amber-50 p-3">
            <label className="block text-sm font-medium text-slate-900">
              Thumbnail image {currentThumbnailUrl ? "(replace)" : <span className="text-red-600">— missing</span>}
            </label>
            <p className="text-xs text-slate-600">
              Shown in the app while the video loads. Without it the banner appears black.
              Use a still frame from the video, same aspect ratio.
            </p>
            {currentThumbnailUrl && !thumbnail && (
              <img src={currentThumbnailUrl} alt="Current thumbnail" className="w-48 rounded" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setThumbnail(e.target.files?.[0] ?? null)}
              className="w-full rounded border border-gray-300 bg-white p-3"
            />
            {thumbnail && (
              <img src={URL.createObjectURL(thumbnail)} alt="New thumbnail" className="w-48 rounded" />
            )}
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

        <BannerActionFields value={action} onChange={setAction} />

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
            {saving ? "Saving..." : "Update Banner"}
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

"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type BannerRecord = {
  id: number;
  title?: string;
  type: string;
  media_url: string;
  is_active: boolean;
  priority?: number;
};

type BannerKind = "homehero" | "dinein" | "store";

type BannerConfig = {
  key: BannerKind;
  title: string;
  description: string;
  collectionLabel: string;
  table: string;
  storageBucket: string;
  emptyLabel: string;
  addLabel: string;
  supportsEdit: boolean;
};

type UploadFormState = {
  title: string;
  type: string;
  priority: number;
  is_active: boolean;
};

const initialUploadForm: UploadFormState = {
  title: "",
  type: "image",
  priority: 1,
  is_active: true,
};

const bannerConfigs: BannerConfig[] = [
  {
    key: "homehero",
    title: "Home Hero Offers",
    description: "Top-level hero creatives shown on the main home experience.",
    collectionLabel: "Hero offers",
    table: "homeherooffers",
    storageBucket: "HomeHeroOffers",
    emptyLabel: "No home hero offers available yet.",
    addLabel: "Add Home Hero Offer",
    supportsEdit: true,
  },
  {
    key: "dinein",
    title: "Dine-In Home Banners",
    description: "Promotional banners shown in the dine-in home section.",
    collectionLabel: "Dine-in banners",
    table: "dineinhomebanners",
    storageBucket: "DineinHomeBanners",
    emptyLabel: "No dine-in home banners available yet.",
    addLabel: "Add Dine-In Banner",
    supportsEdit: false,
  },
  {
    key: "store",
    title: "Store Home Banners",
    description: "Promotional banners shown in the store home section.",
    collectionLabel: "Store banners",
    table: "storeshomebanners",
    storageBucket: "homeherooffers",
    emptyLabel: "No store home banners available yet.",
    addLabel: "Add Store Banner",
    supportsEdit: false,
  },
];

function extractBannerList(payload: unknown): BannerRecord[] {
  if (Array.isArray(payload)) return payload;

  const recordPayload =
    payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  if (!recordPayload) return [];

  const possibleKeys = [
    "offers",
    "offer",
    "banners",
    "banner",
    "data",
    "items",
    "results",
  ];

  for (const key of possibleKeys) {
    const value = recordPayload[key];
    if (Array.isArray(value)) {
      return value as BannerRecord[];
    }
  }

  return [];
}

function extractStoragePath(publicUrl: string, bucket: string): string | null {
  if (!publicUrl) return null;
  const objectPublicMatch = publicUrl.match(/\/object\/public\/[^/]+\/(.+)$/);
  if (objectPublicMatch?.[1]) return objectPublicMatch[1];
  const bucketMatch = publicUrl.match(new RegExp(`/${bucket}/(.+)$`));
  return bucketMatch?.[1] ?? null;
}

function buildBannerStoragePath(type: string, fileName: string) {
  const extension = fileName.split(".").pop() || "bin";
  const random = Math.random().toString(36).slice(2, 9);
  return `${type}/${Date.now()}-${random}.${extension}`;
}

function BannerPreview({ banner }: { banner: BannerRecord }) {
  if (banner.type === "video") {
    return (
      <video
        src={banner.media_url}
        className="h-20 w-36 rounded-lg border border-slate-200 bg-slate-100 object-cover"
        controls
      />
    );
  }

  return (
    <img
      src={banner.media_url}
      alt={banner.title || "Banner"}
      className="h-20 w-36 rounded-lg border border-slate-200 bg-slate-100 object-cover"
    />
  );
}

function UploadPanel({
  config,
  form,
  file,
  saving,
  onChange,
  onFileChange,
  onCancel,
  onSubmit,
}: {
  config: BannerConfig;
  form: UploadFormState;
  file: File | null;
  saving: boolean;
  onChange: (patch: Partial<UploadFormState>) => void;
  onFileChange: (file: File | null) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">{config.addLabel}</h3>
        <p className="mt-1 text-sm text-slate-500">
          Upload a new creative for the {config.collectionLabel.toLowerCase()} section.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Title
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder={`${config.title} title`}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Media Type
          </label>
          <select
            value={form.type}
            onChange={(e) => onChange({ type: e.target.value })}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
          >
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="lottie">Lottie</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Priority
          </label>
          <input
            type="number"
            min={1}
            value={form.priority}
            onChange={(e) => onChange({ priority: Number(e.target.value) || 1 })}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Upload File
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
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFileChange(e.target.files?.[0] ?? null)
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
          />
        </div>

        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => onChange({ is_active: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
          />
          Active banner
        </label>
      </div>

      {file && (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-4">
          <p className="mb-3 text-sm font-medium text-slate-700">Preview</p>
          {form.type === "video" ? (
            <video
              src={URL.createObjectURL(file)}
              className="max-h-56 w-full max-w-sm rounded-lg object-cover"
              controls
            />
          ) : (
            <img
              src={URL.createObjectURL(file)}
              alt="Selected file preview"
              className="max-h-56 w-full max-w-sm rounded-lg object-cover"
            />
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          onClick={onSubmit}
          disabled={saving}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {saving ? "Uploading..." : config.addLabel}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function OffersPage() {
  const router = useRouter();
  const [records, setRecords] = useState<Record<BannerKind, BannerRecord[]>>({
    homehero: [],
    dinein: [],
    store: [],
  });
  const [loading, setLoading] = useState<Record<BannerKind, boolean>>({
    homehero: true,
    dinein: true,
    store: true,
  });
  const [deleting, setDeleting] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<BannerKind, boolean>>({
    homehero: false,
    dinein: false,
    store: false,
  });
  const [openForm, setOpenForm] = useState<BannerKind | null>(null);
  const [forms, setForms] = useState<Record<BannerKind, UploadFormState>>({
    homehero: { ...initialUploadForm },
    dinein: { ...initialUploadForm },
    store: { ...initialUploadForm },
  });
  const [files, setFiles] = useState<Record<BannerKind, File | null>>({
    homehero: null,
    dinein: null,
    store: null,
  });

  const summary = useMemo(
    () =>
      bannerConfigs.map((config) => ({
        label: config.collectionLabel,
        count: records[config.key]?.length || 0,
      })),
    [records]
  );

  async function loadBannerGroup(config: BannerConfig) {
    try {
      setLoading((current) => ({ ...current, [config.key]: true }));
      const { data, error } = await supabaseBrowser
        .from(config.table)
        .select("id,title,type,media_url,thumbnail_url,is_active,priority,start_at,end_at,created_at,updated_at")
        .order("priority", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRecords((current) => ({
        ...current,
        [config.key]: extractBannerList(data),
      }));
    } catch (error) {
      console.error(`Failed to load ${config.key} banners`, error);
      setRecords((current) => ({ ...current, [config.key]: [] }));
    } finally {
      setLoading((current) => ({ ...current, [config.key]: false }));
    }
  }

  useEffect(() => {
    void Promise.all(bannerConfigs.map((config) => loadBannerGroup(config)));
  }, []);

  function updateForm(kind: BannerKind, patch: Partial<UploadFormState>) {
    setForms((current) => ({
      ...current,
      [kind]: {
        ...current[kind],
        ...patch,
      },
    }));
  }

  function resetForm(kind: BannerKind) {
    setForms((current) => ({ ...current, [kind]: { ...initialUploadForm } }));
    setFiles((current) => ({ ...current, [kind]: null }));
    setOpenForm((current) => (current === kind ? null : current));
  }

  async function handleDelete(config: BannerConfig, id: number) {
    if (!confirm(`Delete this ${config.collectionLabel.slice(0, -1).toLowerCase()}?`)) {
      return;
    }

    const deletingKey = `${config.key}-${id}`;

    try {
      setDeleting(deletingKey);
      const banner = records[config.key].find((item) => item.id === id) as
        | (BannerRecord & { thumbnail_url?: string | null })
        | undefined;
      const paths = [banner?.media_url, banner?.thumbnail_url]
        .filter((value): value is string => Boolean(value))
        .map((value) => extractStoragePath(value, config.storageBucket))
        .filter((value): value is string => Boolean(value));

      if (paths.length > 0) {
        await supabaseBrowser.storage.from(config.storageBucket).remove(paths);
      }

      const { error } = await supabaseBrowser.from(config.table).delete().eq("id", id);
      if (error) throw error;
      await loadBannerGroup(config);
      alert(`${config.title} item deleted successfully.`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : undefined;
      console.error(error);
      alert(message || "Failed to delete banner");
    } finally {
      setDeleting(null);
    }
  }

  async function handleUpload(config: BannerConfig) {
    const file = files[config.key];
    const form = forms[config.key];

    if (!file) {
      alert("Please upload a file");
      return;
    }

    try {
      setSaving((current) => ({ ...current, [config.key]: true }));
      const path = buildBannerStoragePath(form.type, file.name);
      const { error: uploadError } = await supabaseBrowser.storage
        .from(config.storageBucket)
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data } = supabaseBrowser.storage.from(config.storageBucket).getPublicUrl(path);
      const { error: insertError } = await supabaseBrowser.from(config.table).insert({
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

      await loadBannerGroup(config);
      resetForm(config.key);
      alert(`${config.addLabel} created successfully.`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : undefined;
      console.error(error);
      alert(message || "Failed to upload banner");
    } finally {
      setSaving((current) => ({ ...current, [config.key]: false }));
    }
  }

  function handleEdit(id: number) {
    router.push(`/dashboard/offers/${id}`);
  }

  return (
    <div className="min-h-full bg-[linear-gradient(135deg,_#ECFEFF_0%,_#F3E8FF_100%)] p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        <Card
          className="overflow-hidden rounded-[18px] border border-slate-200/70 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-sm"
          style={{
            background:
              "linear-gradient(310.35deg, rgba(255, 255, 255, 0.42) 4.07%, rgba(255, 255, 255, 0.32) 48.73%, rgba(255, 255, 255, 0.22) 100%)",
          }}
        >
          <CardContent className="space-y-4 px-4 py-4 sm:px-5">
            <div className="flex flex-wrap justify-end gap-3">
              <Link
                href="/dashboard/bank-offers"
                className="inline-flex h-10 items-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Bank Offers
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/dashboard/passprive-offers"
                className="inline-flex h-10 items-center rounded-2xl bg-[#5800AB] px-5 text-sm font-medium text-white shadow-[0_10px_20px_rgba(88,0,171,0.25)] transition hover:bg-[#4a0090]"
              >
                PassPrive Offers
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {summary.map((item) => (
                <Card key={item.label} className="border-white/70 bg-white/80 shadow-sm backdrop-blur">
                  <CardContent className="p-4">
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                      {item.label}
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">{item.count}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <section className="rounded-[18px] border border-slate-200/90 bg-white/95 p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-xl font-semibold text-slate-900">Offer Systems</h2>
              <p className="mt-1 text-sm text-slate-500">
                Banner creatives stay here, while transaction-driven offer engines live in their
                own dedicated admin sections.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Link
              href="/dashboard/bank-offers"
              className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Bank Offers</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Card, bank, BIN, target, and redemption management.
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-500" />
              </div>
            </Link>

            <Link
              href="/dashboard/passprive-offers"
              className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">PassPrive Offers</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Product offers, targeting, conditions, usage limits, and subscriptions.
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-500" />
              </div>
            </Link>
          </div>
        </section>

        {bannerConfigs.map((config) => {
          const items = records[config.key] || [];
          const formOpen = openForm === config.key;

          return (
            <section
              key={config.key}
              className="rounded-[18px] border border-slate-200/90 bg-white/95 p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm"
            >
              <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-start md:justify-between">
                <div className="max-w-2xl">
                  <h2 className="text-xl font-semibold text-slate-900">{config.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">{config.description}</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {config.supportsEdit ? (
                    <Link
                      href="/dashboard/offers/new"
                      className="rounded-xl bg-[#5800AB] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#4a0090]"
                    >
                      {config.addLabel}
                    </Link>
                  ) : (
                    <button
                      onClick={() =>
                        setOpenForm((current) =>
                          current === config.key ? null : config.key
                        )
                      }
                      className="rounded-xl bg-[#5800AB] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#4a0090]"
                    >
                      {formOpen ? "Close Form" : config.addLabel}
                    </button>
                  )}
                </div>
              </div>

              {formOpen && !config.supportsEdit && (
                <div className="mt-5">
                  <UploadPanel
                    config={config}
                    form={forms[config.key]}
                    file={files[config.key]}
                    saving={saving[config.key]}
                    onChange={(patch) => updateForm(config.key, patch)}
                    onFileChange={(file) =>
                      setFiles((current) => ({ ...current, [config.key]: file }))
                    }
                    onCancel={() => resetForm(config.key)}
                    onSubmit={() => handleUpload(config)}
                  />
                </div>
              )}

              <div className="mt-6">
                {loading[config.key] ? (
                  <SkeletonTable />
                ) : items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
                    {config.emptyLabel}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-white">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium text-slate-600">ID</th>
                            <th className="px-4 py-3 text-left font-medium text-slate-600">Title</th>
                            <th className="px-4 py-3 text-left font-medium text-slate-600">Type</th>
                            <th className="px-4 py-3 text-left font-medium text-slate-600">Priority</th>
                            <th className="px-4 py-3 text-left font-medium text-slate-600">Preview</th>
                            <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                            <th className="px-4 py-3 text-right font-medium text-slate-600">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-[linear-gradient(135deg,_#ECFEFF_0%,_#F3E8FF_100%)]">
                          {items.map((item) => {
                            const rowDeleteKey = `${config.key}-${item.id}`;
                            return (
                              <tr key={item.id} className="hover:bg-slate-50">
                                <td className="px-4 py-4 text-slate-700">{item.id}</td>
                                <td className="px-4 py-4 font-medium text-slate-800">
                                  {item.title?.trim() || "-"}
                                </td>
                                <td className="px-4 py-4 capitalize text-slate-700">
                                  {item.type || "-"}
                                </td>
                                <td className="px-4 py-4 text-slate-700">
                                  {item.priority ?? "-"}
                                </td>
                                <td className="px-4 py-4">
                                  <BannerPreview banner={item} />
                                </td>
                                <td className="px-4 py-4">
                                  <span
                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                                      item.is_active
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-amber-100 text-amber-700"
                                    }`}
                                  >
                                    {item.is_active ? "Active" : "Inactive"}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-right">
                                  <div className="flex justify-end gap-3">
                                    {config.supportsEdit && (
                                      <button
                                        onClick={() => handleEdit(item.id)}
                                        className="text-blue-600 transition hover:underline"
                                        disabled={deleting === rowDeleteKey}
                                      >
                                        Edit
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDelete(config, item.id)}
                                      className="text-red-500 transition hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                                      disabled={deleting === rowDeleteKey}
                                    >
                                      {deleting === rowDeleteKey ? "Deleting..." : "Delete"}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="animate-pulse space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="grid grid-cols-6 gap-4">
            <div className="h-4 rounded bg-slate-200" />
            <div className="h-4 rounded bg-slate-200" />
            <div className="h-4 rounded bg-slate-200" />
            <div className="h-4 rounded bg-slate-200" />
            <div className="h-16 rounded bg-slate-200" />
            <div className="h-4 rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

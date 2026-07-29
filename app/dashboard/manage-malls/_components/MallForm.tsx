"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2, Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { showToast } from "@/hooks/useToast";
import { uploadMallImage, slugifyMall, type MallRecord } from "@/lib/mallAdmin";

type Props = {
  value: Partial<MallRecord>;
  onChange: (patch: Partial<MallRecord>) => void;
  disabled?: boolean;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 md:p-5">
      <h2 className="mb-4 text-sm font-semibold text-gray-800">{title}</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <Label className="mb-1.5 block text-xs font-medium text-gray-600">{label}</Label>
      {children}
    </div>
  );
}

export default function MallForm({ value, onChange, disabled }: Props) {
  const set = (key: keyof MallRecord, v: unknown) => onChange({ [key]: v } as Partial<MallRecord>);

  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);

  const upload = async (kind: "logo" | "cover", file?: File | null) => {
    if (!file) return;
    setUploading(kind);
    try {
      const key = slugifyMall(String(value.slug || value.name || "mall")) || "mall";
      const url = await uploadMallImage(key, kind, file);
      set(kind === "logo" ? "logo_url" : "cover_image", url);
    } catch (err) {
      showToast({ type: "error", title: "Upload failed", description: (err as Error)?.message });
    } finally {
      setUploading(null);
    }
  };

  const ImagePicker = ({ kind, url }: { kind: "logo" | "cover"; url: string | null | undefined }) => (
    <div className="flex items-center gap-3">
      <div className={`relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50 ${kind === "logo" ? "h-20 w-20" : "h-20 w-32"}`}>
        {url ? (
          <Image src={url} alt={kind} fill className="object-cover" sizes="128px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">No {kind}</div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 ${disabled ? "pointer-events-none opacity-50" : ""}`}>
          {uploading === kind ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {url ? "Replace" : "Upload"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={disabled || uploading === kind}
            onChange={(e) => upload(kind, e.target.files?.[0])}
          />
        </label>
        {url && !disabled && (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
            onClick={() => set(kind === "logo" ? "logo_url" : "cover_image", null)}
          >
            <X className="h-3 w-3" /> Remove
          </button>
        )}
      </div>
    </div>
  );

  const input = "w-full";

  return (
    <div className="space-y-4">
      <Section title="Basic Information">
        <Field label="Mall Name *" full>
          <Input
            className={input}
            disabled={disabled}
            value={value.name ?? ""}
            onChange={(e) => {
              const name = e.target.value;
              const autoSlug = !value.slug || value.slug === slugifyMall(String(value.name || ""));
              onChange({ name, ...(autoSlug ? { slug: slugifyMall(name) } : {}) } as Partial<MallRecord>);
            }}
            placeholder="e.g. Bagatelle Mall of Mauritius"
          />
        </Field>
        <Field label="Slug">
          <Input className={input} disabled={disabled} value={value.slug ?? ""} onChange={(e) => set("slug", e.target.value)} placeholder="auto-generated" />
        </Field>
        <Field label="Total Floors">
          <Input
            className={input}
            type="number"
            disabled={disabled}
            value={value.total_floors ?? ""}
            onChange={(e) => set("total_floors", e.target.value === "" ? null : Number(e.target.value))}
            placeholder="e.g. 3"
          />
        </Field>
        <Field label="Description" full>
          <Textarea
            className={input}
            disabled={disabled}
            rows={3}
            value={value.description ?? ""}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Short description of the mall"
          />
        </Field>
      </Section>

      <Section title="Media">
        <Field label="Logo">
          <ImagePicker kind="logo" url={value.logo_url} />
        </Field>
        <Field label="Cover Image">
          <ImagePicker kind="cover" url={value.cover_image} />
        </Field>
      </Section>

      <Section title="Contact">
        <Field label="Phone">
          <Input className={input} disabled={disabled} value={value.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Email">
          <Input className={input} type="email" disabled={disabled} value={value.email ?? ""} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Website" full>
          <Input className={input} disabled={disabled} value={value.website ?? ""} onChange={(e) => set("website", e.target.value)} placeholder="https://" />
        </Field>
      </Section>

      <Section title="Location">
        <Field label="Address Line 1" full>
          <Input className={input} disabled={disabled} value={value.address_line1 ?? ""} onChange={(e) => set("address_line1", e.target.value)} />
        </Field>
        <Field label="Address Line 2" full>
          <Input className={input} disabled={disabled} value={value.address_line2 ?? ""} onChange={(e) => set("address_line2", e.target.value)} />
        </Field>
        <Field label="Area / Location Name">
          <Input className={input} disabled={disabled} value={value.location_name ?? ""} onChange={(e) => set("location_name", e.target.value)} />
        </Field>
        <Field label="City">
          <Input className={input} disabled={disabled} value={value.city ?? ""} onChange={(e) => set("city", e.target.value)} />
        </Field>
        <Field label="Region / District">
          <Input className={input} disabled={disabled} value={value.region ?? ""} onChange={(e) => set("region", e.target.value)} />
        </Field>
        <Field label="Postal Code">
          <Input className={input} disabled={disabled} value={value.postal_code ?? ""} onChange={(e) => set("postal_code", e.target.value)} />
        </Field>
        <Field label="Country">
          <Input className={input} disabled={disabled} value={value.country ?? ""} onChange={(e) => set("country", e.target.value)} />
        </Field>
        <Field label="Google Place ID">
          <Input className={input} disabled={disabled} value={value.google_place_id ?? ""} onChange={(e) => set("google_place_id", e.target.value)} />
        </Field>
        <Field label="Latitude">
          <Input
            className={input}
            type="number"
            disabled={disabled}
            value={value.lat ?? ""}
            onChange={(e) => set("lat", e.target.value === "" ? null : Number(e.target.value))}
          />
        </Field>
        <Field label="Longitude">
          <Input
            className={input}
            type="number"
            disabled={disabled}
            value={value.lng ?? ""}
            onChange={(e) => set("lng", e.target.value === "" ? null : Number(e.target.value))}
          />
        </Field>
      </Section>

      <Section title="System">
        <Field label="Sort Order">
          <Input
            className={input}
            type="number"
            disabled={disabled}
            value={value.sort_order ?? ""}
            onChange={(e) => set("sort_order", e.target.value === "" ? null : Number(e.target.value))}
          />
        </Field>
        <div className="flex items-center gap-8 pt-6">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-700">Active</span>
            <Switch checked={value.is_active !== false} disabled={disabled} onCheckedChange={(v) => set("is_active", v)} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-700">Featured</span>
            <Switch checked={!!value.is_featured} disabled={disabled} onCheckedChange={(v) => set("is_featured", v)} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-700">Parking</span>
            <Switch checked={!!value.parking_available} disabled={disabled} onCheckedChange={(v) => set("parking_available", v)} />
          </div>
        </div>
      </Section>
    </div>
  );
}

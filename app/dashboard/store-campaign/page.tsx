"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { showToast } from "@/hooks/useToast";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import {
  StoreCampaign,
  extractErrorMessage,
  formatDate,
  itemCount,
} from "./_lib";

type CampaignFormState = {
  title: string;
  subtitle: string;
  slug: string;
  is_active: boolean;
  max_items: string;
};

const initialForm: CampaignFormState = {
  title: "",
  subtitle: "",
  slug: "",
  is_active: true,
  max_items: "12",
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildCampaignThumbnailPath(fileName: string) {
  const extension = fileName.split(".").pop() || "jpg";
  const random = Math.random().toString(36).slice(2, 9);
  return `campaigns/${Date.now()}-${random}.${extension}`;
}

async function uploadCampaignThumbnail(file: File) {
  const path = buildCampaignThumbnailPath(file.name);
  const { error } = await supabaseBrowser.storage.from("stores").upload(path, file);
  if (error) throw error;

  const { data } = supabaseBrowser.storage.from("stores").getPublicUrl(path);
  return data.publicUrl;
}

export default function StoreCampaignPage() {
  const [campaigns, setCampaigns] = useState<StoreCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<StoreCampaign | null>(null);
  const [form, setForm] = useState<CampaignFormState>(initialForm);
  const [query, setQuery] = useState("");
  const [pageError, setPageError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  const filteredCampaigns = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return campaigns;

    return campaigns.filter((campaign) =>
      [campaign.title, campaign.subtitle || "", campaign.slug].join(" ").toLowerCase().includes(search)
    );
  }, [campaigns, query]);

  useEffect(() => {
    void loadCampaigns();
  }, []);

  async function loadCampaigns() {
    try {
      setLoading(true);
      setPageError(null);
      const [{ data: sectionRows, error: sectionError }, { data: itemRows, error: itemError }] =
        await Promise.all([
          supabaseBrowser
            .from("stores_home_sections")
            .select("id,slug,title,subtitle,is_active,max_items,starts_at,ends_at,thumbnail_url,created_at,updated_at")
            .order("created_at", { ascending: false }),
          supabaseBrowser.from("stores_home_section_items").select("section_id"),
        ]);

      if (sectionError) throw sectionError;
      if (itemError) throw itemError;

      const countsBySection = ((itemRows as Array<{ section_id: string }> | null) || []).reduce(
        (accumulator, row) => {
          const sectionId = typeof row.section_id === "string" ? row.section_id : null;
          if (!sectionId) return accumulator;
          accumulator.set(sectionId, (accumulator.get(sectionId) || 0) + 1);
          return accumulator;
        },
        new Map<string, number>()
      );

      const nextCampaigns = ((sectionRows as StoreCampaign[] | null) || []).map((campaign) => ({
        ...campaign,
        item_count: countsBySection.get(campaign.id) || 0,
      }));

      setCampaigns(nextCampaigns);
    } catch (error: unknown) {
      setPageError(extractErrorMessage(error, "Unable to fetch campaigns."));
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm(initialForm);
    setEditingCampaign(null);
    setImageFile(null);
    setImagePreview("");
  }

  function openCreateDialog() {
    resetForm();
    setDialogOpen(true);
  }

  function openEditDialog(campaign: StoreCampaign) {
    setEditingCampaign(campaign);
    setForm({
      title: campaign.title || "",
      subtitle: campaign.subtitle || "",
      slug: campaign.slug || "",
      is_active: Boolean(campaign.is_active),
      max_items: String(campaign.max_items ?? 12),
    });
    setImageFile(null);
    setImagePreview(campaign.thumbnail_url || "");
    setDialogOpen(true);
  }

  function updateForm<K extends keyof CampaignFormState>(key: K, value: CampaignFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveCampaign() {
    if (!form.title.trim()) {
      showToast({ type: "error", title: "Title is required" });
      return;
    }

    if (!form.slug.trim()) {
      showToast({ type: "error", title: "Slug is required" });
      return;
    }

    const maxItems = Number(form.max_items);
    if (!Number.isFinite(maxItems) || maxItems <= 0) {
      showToast({ type: "error", title: "Max items must be greater than 0" });
      return;
    }

    const payload = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      slug: slugify(form.slug),
      is_active: form.is_active,
      max_items: maxItems,
    };

    try {
      setSaving(true);
      const thumbnailUrl = imageFile
        ? await uploadCampaignThumbnail(imageFile)
        : editingCampaign?.thumbnail_url || null;

      const record = {
        ...payload,
        thumbnail_url: thumbnailUrl,
      };

      if (editingCampaign) {
        const { error } = await supabaseBrowser
          .from("stores_home_sections")
          .update(record)
          .eq("id", editingCampaign.id);
        if (error) throw error;
      } else {
        const { error } = await supabaseBrowser.from("stores_home_sections").insert(record);
        if (error) throw error;
      }

      showToast({ title: editingCampaign ? "Campaign updated" : "Campaign created" });
      setDialogOpen(false);
      resetForm();
      await loadCampaigns();
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: "Failed to save campaign",
        description: extractErrorMessage(error, "Save failed."),
      });
    } finally {
      setSaving(false);
    }
  }

  async function toggleCampaignStatus(campaign: StoreCampaign) {
    try {
      setSaving(true);
      const { error } = await supabaseBrowser
        .from("stores_home_sections")
        .update({ is_active: !campaign.is_active })
        .eq("id", campaign.id);
      if (error) throw error;

      showToast({
        title: campaign.is_active ? "Campaign deactivated" : "Campaign activated",
      });
      await loadCampaigns();
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: "Failed to update campaign",
        description: extractErrorMessage(error, "Status update failed."),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: "#FFFFFF4D",
      }}
    >
      <div
        className="mx-auto flex min-h-screen w-full max-w-[1360px] flex-col"
        style={{
          background: "#FFFFFF4D",
        }}
      >
        <div className="flex-1 px-4 pb-6 pt-4 sm:px-5 lg:px-6">
          <Card
            className="overflow-hidden rounded-[18px] border border-slate-200/70 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-sm"
            style={{
              background:
                "linear-gradient(310.35deg, rgba(255, 255, 255, 0.4) 4.07%, rgba(255, 255, 255, 0.3) 48.73%, rgba(255, 255, 255, 0.2) 100%)",
            }}
          >
            <CardHeader className="space-y-4 border-b border-slate-100/90 bg-white/70 px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="text-[18px] leading-6 text-slate-900">Cards</CardTitle>
                  <CardDescription className="mt-1 text-[12px] leading-5 text-slate-500">
                    Create and manage store home campaigns and the stores attached to each section.
                  </CardDescription>
                </div>
                <Button className="h-10 rounded-2xl bg-[#5800AB] px-5 text-sm text-white shadow-[0_10px_20px_rgba(88,0,171,0.25)] hover:bg-[#4a0090]" onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add new card
                </Button>
              </div>

              <div className="relative w-full lg:max-w-[1120px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search campaign title, subtitle, or slug..."
                  className="h-10 rounded-xl border-slate-200 bg-white pl-10 text-sm shadow-[0_1px_0_rgba(15,23,42,0.02)] placeholder:text-slate-400"
                />
              </div>
            </CardHeader>

            <CardContent className="px-4 py-4 sm:px-5">
          {loading ? (
            <div className="flex items-center justify-center gap-3 rounded-[16px] border border-dashed border-slate-200 bg-white px-6 py-20 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading campaigns...
            </div>
          ) : pageError ? (
            <div className="rounded-[16px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
              <p className="text-sm font-medium text-slate-900">{pageError}</p>
              <p className="mt-2 text-sm text-slate-500">
                Try again later or check whether this account has access to campaign management.
              </p>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="rounded-[16px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
              <p className="text-sm font-medium text-slate-900">No campaigns found.</p>
              <p className="mt-2 text-sm text-slate-500">
                Create your first store campaign to start curating stores for the home section.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredCampaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="rounded-[14px] border border-slate-200/80 px-4 py-4 shadow-[0_2px_14px_rgba(15,23,42,0.07)] transition-shadow hover:shadow-[0_6px_20px_rgba(15,23,42,0.09)]"
                  style={{
                    background:
                      "linear-gradient(0deg, #FFFFFF, #FFFFFF), linear-gradient(142.22deg, #ECFEFF 4.91%, #F3E8FF 95.09%)",
                  }}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[14px] font-semibold leading-5 text-slate-900">{campaign.title}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium leading-4 ${campaign.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                          {campaign.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] leading-5 text-slate-500">{campaign.subtitle || "No subtitle added yet."}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] leading-4 text-slate-400">
                        <span className="font-mono">/{campaign.slug}</span>
                        <span>Max items: {campaign.max_items ?? "—"}</span>
                        <span>Stores: {itemCount(campaign)}</span>
                        <span>Updated: {formatDate(campaign.updated_at || campaign.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <Button variant="outline" className="h-9 rounded-xl border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 shadow-sm hover:bg-slate-50" onClick={() => openEditDialog(campaign)}>
                        <Image src="/restaurentpasspriveedit.png" alt="Edit" width={14} height={14} className="mr-2 h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button asChild variant="outline" className="h-9 rounded-xl border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 shadow-sm hover:bg-slate-50">
                        <Link href={`/dashboard/store-campaign/${campaign.id}`}>
                          <Image src="/restaurentpassprivemange.png" alt="Manage" width={14} height={14} className="mr-2 h-3.5 w-3.5" />
                          Manage Stores
                        </Link>
                      </Button>
                      <Button
                        variant={campaign.is_active ? "destructive" : "default"}
                        onClick={() => void toggleCampaignStatus(campaign)}
                        disabled={saving}
                        className={`h-9 rounded-xl px-3 text-[13px] font-medium ${
                          campaign.is_active
                            ? "bg-red-600 text-white hover:bg-red-700"
                            : "bg-[#5800AB] text-white hover:bg-[#4a0090]"
                        }`}
                      >
                        {campaign.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCampaign ? "Edit campaign" : "Create campaign"}</DialogTitle>
            <DialogDescription>
              Keep the setup simple: campaign details here, stores managed from the next screen.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="campaign-title">Title</Label>
              <Input
                id="campaign-title"
                value={form.title}
                onChange={(event) => {
                  const value = event.target.value;
                  updateForm("title", value);
                  if (!editingCampaign) updateForm("slug", slugify(value));
                }}
                placeholder="Weekend grocery picks"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="campaign-subtitle">Subtitle</Label>
              <Input
                id="campaign-subtitle"
                value={form.subtitle}
                onChange={(event) => updateForm("subtitle", event.target.value)}
                placeholder="Fresh offers near your customers"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="campaign-slug">Key</Label>
              <Input
                id="campaign-slug"
                value={form.slug}
                onChange={(event) => updateForm("slug", slugify(event.target.value))}
                placeholder="weekend-grocery-picks"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="campaign-max-items">Max items</Label>
                <Input
                  id="campaign-max-items"
                  type="number"
                  min={1}
                  value={form.max_items}
                  onChange={(event) => updateForm("max_items", event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="campaign-image">Thumbnail image</Label>
              <Input
                id="campaign-image"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setImageFile(file);
                  setImagePreview(file ? URL.createObjectURL(file) : editingCampaign?.thumbnail_url || "");
                }}
              />
              <p className="text-xs text-slate-500">
                Upload the image that should represent this campaign in admin and consumer surfaces.
              </p>
              {imagePreview ? (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Campaign thumbnail preview"
                    className="h-40 w-full object-cover"
                  />
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Campaign active</p>
                <p className="text-xs text-slate-500">Inactive campaigns stay saved but stop serving publicly.</p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={(checked) => updateForm("is_active", checked)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void saveCampaign()} disabled={saving} className="bg-[#5800AB] text-white hover:bg-[#4a0090]">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingCampaign ? "Save changes" : "Create campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, X } from "lucide-react";

import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  buildStorePayload,
  deleteStoreImages,
  fetchStoreDetail,
  replaceStoreRelations,
  type StoreFlatRecord,
  type StoreOfferInput,
  upsertStorePaymentDetails,
  uploadStoreImages,
} from "@/lib/storeAdmin";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PaymentDetails } from "@/app/dashboard/_components/StoreComponents/types";

/* ---------------- CONSTANTS ---------------- */

const inputClass =
  "border border-gray-300 focus:border-gray-400 focus:ring-0 bg-white";

type StoreMoodCategoryRecord = {
  title?: string;
};

function extractCategoryList(payload: unknown): StoreMoodCategoryRecord[] {
  if (Array.isArray(payload)) return payload as StoreMoodCategoryRecord[];

  const recordPayload =
    payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;

  if (!recordPayload) return [];

  const possibleKeys = ["data", "items", "results", "categories", "moodCategories"];
  for (const key of possibleKeys) {
    if (Array.isArray(recordPayload[key])) {
      return recordPayload[key] as StoreMoodCategoryRecord[];
    }
  }

  return [];
}

const cleanObject = (obj: Record<string, unknown>) => {
  const out: Record<string, unknown> = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (typeof v === "string" && v.trim() === "") return;
    out[k] = v;
  });
  return out;
};

const emptyPaymentDetails = (): PaymentDetails => ({
  legal_business_name: "",
  display_name_on_invoice: "",
  payout_method: "BANK_TRANSFER",
  beneficiary_name: "",
  bank_name: "",
  account_number: "",
  ifsc: "",
  iban: "",
  swift: "",
  payout_upi_id: "",
  settlement_cycle: "T+1",
  commission_percent: "",
  currency: "MUR",
  tax_id_label: "VAT",
  tax_id_value: "",
  billing_email: "",
  billing_phone: "",
  kyc_status: "NOT_STARTED",
  notes: "",
});

const normalizePaymentState = (
  payment: StoreFlatRecord["payment_details"]
): PaymentDetails => ({
  legal_business_name: payment?.legal_business_name || "",
  display_name_on_invoice: payment?.display_name_on_invoice || "",
  payout_method:
    (payment?.payout_method as PaymentDetails["payout_method"] | undefined) || "BANK_TRANSFER",
  beneficiary_name: payment?.beneficiary_name || "",
  bank_name: payment?.bank_name || "",
  account_number: payment?.account_number || "",
  ifsc: payment?.ifsc || "",
  iban: payment?.iban || "",
  swift: payment?.swift || "",
  payout_upi_id: payment?.payout_upi_id || "",
  settlement_cycle:
    (payment?.settlement_cycle as PaymentDetails["settlement_cycle"] | undefined) || "T+1",
  commission_percent:
    payment?.commission_percent === null || payment?.commission_percent === undefined
      ? ""
      : String(payment.commission_percent),
  currency: payment?.currency || "MUR",
  tax_id_label:
    (payment?.tax_id_label as PaymentDetails["tax_id_label"] | undefined) || "VAT",
  tax_id_value: payment?.tax_id_value || "",
  billing_email: payment?.billing_email || "",
  billing_phone: payment?.billing_phone || "",
  kyc_status:
    (payment?.kyc_status as PaymentDetails["kyc_status"] | undefined) || "NOT_STARTED",
  notes: payment?.notes || "",
});

/* ---------------- COMPONENT ---------------- */

export default function StoreDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [store, setStore] = useState<StoreFlatRecord | null>(null);
  const [storeOriginal, setStoreOriginal] = useState<StoreFlatRecord | null>(null);
  const [hasMounted, setHasMounted] = useState(false);

  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [payment, setPayment] = useState<PaymentDetails>(emptyPaymentDetails());
  const [paymentOriginal, setPaymentOriginal] = useState<PaymentDetails>(emptyPaymentDetails());

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // ✅ Image management state
  const [logoToAdd, setLogoToAdd] = useState<File | null>(null);
  const [coverToAdd, setCoverToAdd] = useState<File | null>(null);
  const [galleryToAdd, setGalleryToAdd] = useState<File[]>([]);
  const [logoToDelete, setLogoToDelete] = useState(false);
  const [coverToDelete, setCoverToDelete] = useState(false);
  const [galleryToDelete, setGalleryToDelete] = useState<string[]>([]);

  const headerLocation = useMemo(() => {
    if (!store) return "";
    const parts = [store.location_name, store.city, store.region].filter(Boolean);
    return parts.join(", ");
  }, [store]);

  const selectedStoreCategories = useMemo(() => {
    if (!store) return [] as string[];

    const values = Array.isArray(store.category)
      ? store.category
      : String(store.category || "")
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);

    return values.filter((value: string) => categoryOptions.includes(value));
  }, [store, categoryOptions]);

  const categoryForSave = useMemo(() => {
    if (!store) return null;
    const raw = typeof store.category === "string" ? store.category.trim() : "";
    if (!categoryOptions.length) return raw || null;
    return selectedStoreCategories.length ? selectedStoreCategories.join(", ") : null;
  }, [store, categoryOptions, selectedStoreCategories]);

  const applyStoreState = (data: StoreFlatRecord) => {
    setStore(data);
    setStoreOriginal(data);
    const normalizedPayment = normalizePaymentState(data.payment_details);
    setPayment(normalizedPayment);
    setPaymentOriginal(normalizedPayment);
  };

  // Function to refresh store data (can be called manually)
  const refreshStoreData = async () => {
    try {
      const data = await fetchStoreDetail(String(id));
      applyStoreState(data);
    } catch (err: unknown) {
      showToast({
        type: "error",
        title: "Failed to load store",
        description: err instanceof Error ? err.message : "Unable to load store details.",
      });
    }
  };

  useEffect(() => {
    if (id) {
      const timer = window.setTimeout(() => {
        void refreshStoreData();
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [id]);

  useEffect(() => {
    const loadDropdownOptions = async () => {
      try {
        const { data, error } = await supabaseBrowser
          .from("store_mood_categories")
          .select("title")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("title", { ascending: true });

        if (error) throw error;

        const categories = Array.from(
          new Set(
            extractCategoryList(data)
              .map((item) => item?.title)
              .filter(
                (value): value is string => typeof value === "string" && value.trim().length > 0
              )
              .map((value) => value.trim())
          )
        ).sort((a, b) => a.localeCompare(b));

        setCategoryOptions(categories);
      } catch {
        // Keep form usable even if dropdown options fail to load.
      }
    };

    void loadDropdownOptions();
  }, []);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const handleCancel = () => {
    setStore(storeOriginal);
    setPayment(paymentOriginal);
    // ✅ Reset image changes
    setLogoToAdd(null);
    setCoverToAdd(null);
    setGalleryToAdd([]);
    setLogoToDelete(false);
    setCoverToDelete(false);
    setGalleryToDelete([]);
    setEditMode(false);
  };

  const handleSave = async () => {
    if (!store?.name) {
      showToast({ type: "error", title: "Store name is required" });
      return;
    }
    if (!payment.legal_business_name.trim()) {
      showToast({
        type: "error",
        title: "Legal business name is required",
        description: "Required for settlement & invoicing.",
      });
      return;
    }

    setSaving(true);

    try {
      const urlsToDelete: string[] = [];
      if (logoToDelete && store.logo_url) urlsToDelete.push(store.logo_url);
      if (coverToDelete) {
        const coverUrlToDelete =
          store.cover_media_type === "video" ? store.cover_media_url : store.cover_image_url;
        if (coverUrlToDelete) urlsToDelete.push(coverUrlToDelete);
      }
      if (galleryToDelete.length > 0) urlsToDelete.push(...galleryToDelete);

      if (urlsToDelete.length > 0) {
        await deleteStoreImages(urlsToDelete);
      }

      const [uploadedLogoUrls, uploadedCoverUrls, uploadedGalleryUrls] = await Promise.all([
        logoToAdd ? uploadStoreImages(String(id), [logoToAdd], "logo") : Promise.resolve([]),
        coverToAdd ? uploadStoreImages(String(id), [coverToAdd], "cover") : Promise.resolve([]),
        galleryToAdd.length > 0
          ? uploadStoreImages(String(id), galleryToAdd, "gallery")
          : Promise.resolve([]),
      ]);

      const newLogoUrl = uploadedLogoUrls[0] ?? null;
      const newCoverUrl = uploadedCoverUrls[0] ?? null;
      const finalLogoUrl = logoToDelete ? newLogoUrl : newLogoUrl || store.logo_url;
      const finalCoverUrl = coverToDelete ? newCoverUrl : newCoverUrl || store.cover_image_url;
      const finalGalleryUrls = [
        ...(store.gallery_urls || []).filter((url: string) => !galleryToDelete.includes(url)),
        ...uploadedGalleryUrls,
      ];

      const tagsArray = Array.isArray(store.tags) ? store.tags : [];
      const lat = typeof store.lat === "number" && !Number.isNaN(store.lat) ? store.lat : null;
      const lng = typeof store.lng === "number" && !Number.isNaN(store.lng) ? store.lng : null;

      const social_links = cleanObject({
        instagram: store.instagram,
        facebook: store.facebook,
        tiktok: store.tiktok,
        maps: store.maps,
        website: store.website,
        ...(store.social_links || {}),
      }) as Record<string, string | null | undefined>;

      const basePayload = buildStorePayload({
        id: String(id),
        name: store.name,
        store_type: store.store_type || "PRODUCT",
        description: store.description || null,
        category: categoryForSave,
        subcategory: store.subcategory || null,
        phone: store.phone || null,
        whatsapp: store.whatsapp || null,
        email: store.email || null,
        website: store.website || null,
        location_name: store.location_name || null,
        address_line1: store.address_line1 || null,
        address_line2: store.address_line2 || null,
        city: store.city || null,
        region: store.region || null,
        country: store.country || "Mauritius",
        postal_code: store.postal_code || null,
        lat,
        lng,
        google_place_id: store.google_place_id || null,
        is_active: !!store.is_active,
        is_featured: !!store.is_featured,
        logo_url: finalLogoUrl || null,
        cover_image: finalCoverUrl || null,
      });

      const normalizedOffers: StoreOfferInput[] = (store.offers || [])
        .filter((offer) => Boolean(offer?.title))
        .map((offer) => ({
          title: typeof offer.title === "string" ? offer.title : null,
          description: typeof offer.description === "string" ? offer.description : null,
          badge_text: typeof offer.badge_text === "string" ? offer.badge_text : null,
          offer_type: typeof offer.offer_type === "string" ? offer.offer_type : null,
          discount_value:
            typeof offer.discount_value === "number" ? offer.discount_value : null,
          min_spend: typeof offer.min_spend === "number" ? offer.min_spend : null,
          start_at: typeof offer.start_at === "string" ? offer.start_at : null,
          end_at: typeof offer.end_at === "string" ? offer.end_at : null,
          is_active: typeof offer.is_active === "boolean" ? offer.is_active : true,
          metadata:
            offer.metadata && typeof offer.metadata === "object"
              ? (offer.metadata as Record<string, unknown>)
              : null,
        }));
      const normalizedPayment = {
        legal_business_name: payment.legal_business_name.trim(),
        display_name_on_invoice: payment.display_name_on_invoice?.trim() || null,
        payout_method: payment.payout_method,
        beneficiary_name: payment.beneficiary_name?.trim() || null,
        bank_name: payment.bank_name?.trim() || null,
        account_number: payment.account_number?.trim() || null,
        ifsc: payment.ifsc?.trim() || null,
        iban: payment.iban?.trim() || null,
        swift: payment.swift?.trim() || null,
        payout_upi_id: payment.payout_upi_id?.trim() || null,
        settlement_cycle: payment.settlement_cycle,
        commission_percent: payment.commission_percent
          ? Number(payment.commission_percent)
          : null,
        currency: payment.currency || "MUR",
        tax_id_label: payment.tax_id_label || null,
        tax_id_value: payment.tax_id_value?.trim() || null,
        billing_email: payment.billing_email?.trim() || null,
        billing_phone: payment.billing_phone?.trim() || null,
        kyc_status: payment.kyc_status,
        notes: payment.notes?.trim() || null,
      };

      const { error: updateError } = await supabaseBrowser
        .from("stores")
        .update(basePayload)
        .eq("id", String(id));

      if (updateError) throw updateError;

      await Promise.all([
        replaceStoreRelations(String(id), {
          tags: tagsArray,
          social_links,
          offers: normalizedOffers,
          subscription: store.subscription || null,
          gallery_urls: finalGalleryUrls,
          logo_url: finalLogoUrl || null,
          cover_image_url: finalCoverUrl || null,
          cover_video_url:
            store.cover_media_type === "video" && !coverToDelete
              ? store.cover_media_url
              : null,
        }),
        upsertStorePaymentDetails(String(id), normalizedPayment),
      ]);

      const refreshedStore = await fetchStoreDetail(String(id));

      showToast({ type: "success", title: "Store updated" });
      setEditMode(false);
      applyStoreState(refreshedStore);
      setLogoToAdd(null);
      setCoverToAdd(null);
      setGalleryToAdd([]);
      setLogoToDelete(false);
      setCoverToDelete(false);
      setGalleryToDelete([]);
    } catch (err: unknown) {
      showToast({
        type: "error",
        title: "Failed to update store",
        description: err instanceof Error ? err.message : "Unable to update store.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!store) return <div className="p-6">Loading…</div>;

  // Make social links editable via separate inputs (same style as add page)
  const social = store.social_links || {};

  return (
    <div className="w-full p-4 space-y-12">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-gray-300 pb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-2xl font-semibold">{store.name}</h1>
            <p className="text-sm text-gray-500">{headerLocation || "-"}</p>
          </div>
        </div>

        {!editMode ? (
          <Button onClick={() => setEditMode(true)}>Edit</Button>
        ) : (
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#DA3224] text-white"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>

      {/* SYSTEM */}
      <Section title="System">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4">
            <span>Active</span>
            <Switch
              checked={!!store.is_active}
              disabled={!editMode}
              onCheckedChange={(v) => setStore({ ...store, is_active: v })}
            />
          </div>

          <div className="flex items-center gap-4">
            <span>Featured</span>
            <Switch
              checked={!!store.is_featured}
              disabled={!editMode}
              onCheckedChange={(v) => setStore({ ...store, is_featured: v })}
            />
          </div>
        </div>
      </Section>

      {/* BASIC INFO */}
      <Section title="Basic Information">
        <Grid>
          <Field label="Name">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.name || ""}
              onChange={(e) => setStore({ ...store, name: e.target.value })}
            />
          </Field>

          <Field label="Store Type">
            <select
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100"
              disabled={!editMode}
              value={store.store_type || "PRODUCT"}
              onChange={(e) => setStore({ ...store, store_type: e.target.value })}
            >
              <option value="PRODUCT">PRODUCT</option>
              <option value="SERVICE">SERVICE</option>
            </select>
          </Field>

          <Field label="Category">
            {hasMounted ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!editMode}
                    className="w-full justify-between bg-white border-gray-300"
                  >
                    {selectedStoreCategories.length
                      ? `${selectedStoreCategories.length} categories selected`
                      : "Select categories"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  sideOffset={6}
                  className="z-[9999] w-[420px] max-w-[calc(100vw-2rem)] max-h-72 overflow-y-auto rounded-md border border-gray-300 bg-white shadow-xl"
                >
                  {categoryOptions.length ? (
                    categoryOptions.map((category) => (
                      <DropdownMenuCheckboxItem
                        key={category}
                        checked={selectedStoreCategories.includes(category)}
                        onCheckedChange={(checked) => {
                          const next =
                            checked === true
                              ? selectedStoreCategories.includes(category)
                                ? selectedStoreCategories
                                : [...selectedStoreCategories, category]
                              : selectedStoreCategories.filter((item: string) => item !== category);

                          setStore({
                            ...store,
                            category: next.join(", "),
                          });
                        }}
                      >
                        {category}
                      </DropdownMenuCheckboxItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No store mood categories found
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled
                className="w-full justify-between bg-white border-gray-300"
              >
                {selectedStoreCategories.length
                  ? `${selectedStoreCategories.length} categories selected`
                  : "Select categories"}
              </Button>
            )}
            {selectedStoreCategories.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedStoreCategories.map((category: string) => (
                  <span
                    key={category}
                    className="inline-flex items-center rounded-full border border-gray-300 bg-white px-2 py-1 text-xs"
                  >
                    {category}
                  </span>
                ))}
              </div>
            )}
          </Field>

          <Field label="Subcategory">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.subcategory ?? ""}
              onChange={(e) => setStore({ ...store, subcategory: e.target.value })}
            />
          </Field>

          <Field label="Tags (comma separated)">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={
                Array.isArray(store.tags)
                  ? store.tags.join(", ")
                  : (store.tags ?? "")
              }
              onChange={(e) =>
                setStore({
                  ...store,
                  tags: e.target.value
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean),
                })
              }
            />
          </Field>
        </Grid>

        <Field label="Description">
          <Textarea
            className={inputClass}
            disabled={!editMode}
            value={store.description ?? ""}
            onChange={(e) => setStore({ ...store, description: e.target.value })}
          />
        </Field>
      </Section>

      {/* CONTACT */}
      <Section title="Contact">
        <Grid>
          <Field label="Phone">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.phone ?? ""}
              onChange={(e) => setStore({ ...store, phone: e.target.value })}
            />
          </Field>

          <Field label="WhatsApp">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.whatsapp ?? ""}
              onChange={(e) => setStore({ ...store, whatsapp: e.target.value })}
            />
          </Field>

          <Field label="Email">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.email ?? ""}
              onChange={(e) => setStore({ ...store, email: e.target.value })}
            />
          </Field>

          <Field label="Website">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.website ?? ""}
              onChange={(e) => setStore({ ...store, website: e.target.value })}
            />
          </Field>
        </Grid>

        <Grid>
          <Field label="Instagram">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.instagram ?? social.instagram ?? ""}
              onChange={(e) => setStore({ ...store, instagram: e.target.value })}
            />
          </Field>

          <Field label="Facebook">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.facebook ?? social.facebook ?? ""}
              onChange={(e) => setStore({ ...store, facebook: e.target.value })}
            />
          </Field>

          <Field label="TikTok">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.tiktok ?? social.tiktok ?? ""}
              onChange={(e) => setStore({ ...store, tiktok: e.target.value })}
            />
          </Field>

          <Field label="Google Maps Link">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.maps ?? social.maps ?? ""}
              onChange={(e) => setStore({ ...store, maps: e.target.value })}
            />
          </Field>
        </Grid>
      </Section>

      <Section title="Payment & Settlement">
        <Grid>
          <Field label="Legal Business Name">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={payment.legal_business_name}
              onChange={(e) =>
                setPayment((prev) => ({ ...prev, legal_business_name: e.target.value }))
              }
            />
          </Field>

          <Field label="Invoice Display Name">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={payment.display_name_on_invoice || ""}
              onChange={(e) =>
                setPayment((prev) => ({ ...prev, display_name_on_invoice: e.target.value }))
              }
            />
          </Field>

          <Field label="Payout Method">
            <select
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100"
              disabled={!editMode}
              value={payment.payout_method}
              onChange={(e) =>
                setPayment((prev) => ({
                  ...prev,
                  payout_method: e.target.value as PaymentDetails["payout_method"],
                }))
              }
            >
              <option value="BANK_TRANSFER">BANK_TRANSFER</option>
              <option value="UPI">UPI</option>
              <option value="MANUAL">MANUAL</option>
            </select>
          </Field>

          <Field label="Settlement Cycle">
            <select
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100"
              disabled={!editMode}
              value={payment.settlement_cycle}
              onChange={(e) =>
                setPayment((prev) => ({
                  ...prev,
                  settlement_cycle: e.target.value as PaymentDetails["settlement_cycle"],
                }))
              }
            >
              <option value="T+0">T+0</option>
              <option value="T+1">T+1</option>
              <option value="T+2">T+2</option>
              <option value="WEEKLY">WEEKLY</option>
              <option value="MONTHLY">MONTHLY</option>
            </select>
          </Field>

          <Field label="Beneficiary Name">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={payment.beneficiary_name || ""}
              onChange={(e) =>
                setPayment((prev) => ({ ...prev, beneficiary_name: e.target.value }))
              }
            />
          </Field>

          <Field label="Bank Name">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={payment.bank_name || ""}
              onChange={(e) => setPayment((prev) => ({ ...prev, bank_name: e.target.value }))}
            />
          </Field>

          <Field label="Account Number">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={payment.account_number || ""}
              onChange={(e) =>
                setPayment((prev) => ({ ...prev, account_number: e.target.value }))
              }
            />
          </Field>

          <Field label="UPI ID">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={payment.payout_upi_id || ""}
              onChange={(e) =>
                setPayment((prev) => ({ ...prev, payout_upi_id: e.target.value }))
              }
            />
          </Field>

          <Field label="IFSC">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={payment.ifsc || ""}
              onChange={(e) => setPayment((prev) => ({ ...prev, ifsc: e.target.value }))}
            />
          </Field>

          <Field label="IBAN">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={payment.iban || ""}
              onChange={(e) => setPayment((prev) => ({ ...prev, iban: e.target.value }))}
            />
          </Field>

          <Field label="SWIFT">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={payment.swift || ""}
              onChange={(e) => setPayment((prev) => ({ ...prev, swift: e.target.value }))}
            />
          </Field>

          <Field label="Commission Percent">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={payment.commission_percent || ""}
              onChange={(e) =>
                setPayment((prev) => ({ ...prev, commission_percent: e.target.value }))
              }
            />
          </Field>

          <Field label="Currency">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={payment.currency}
              onChange={(e) => setPayment((prev) => ({ ...prev, currency: e.target.value }))}
            />
          </Field>

          <Field label="Tax ID Label">
            <select
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100"
              disabled={!editMode}
              value={payment.tax_id_label || "VAT"}
              onChange={(e) =>
                setPayment((prev) => ({
                  ...prev,
                  tax_id_label: e.target.value as PaymentDetails["tax_id_label"],
                }))
              }
            >
              <option value="VAT">VAT</option>
              <option value="GST">GST</option>
              <option value="BRN">BRN</option>
              <option value="TIN">TIN</option>
              <option value="OTHER">OTHER</option>
            </select>
          </Field>

          <Field label="Tax ID Value">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={payment.tax_id_value || ""}
              onChange={(e) =>
                setPayment((prev) => ({ ...prev, tax_id_value: e.target.value }))
              }
            />
          </Field>

          <Field label="Billing Email">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={payment.billing_email || ""}
              onChange={(e) =>
                setPayment((prev) => ({ ...prev, billing_email: e.target.value }))
              }
            />
          </Field>

          <Field label="Billing Phone">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={payment.billing_phone || ""}
              onChange={(e) =>
                setPayment((prev) => ({ ...prev, billing_phone: e.target.value }))
              }
            />
          </Field>

          <Field label="KYC Status">
            <select
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100"
              disabled={!editMode}
              value={payment.kyc_status}
              onChange={(e) =>
                setPayment((prev) => ({
                  ...prev,
                  kyc_status: e.target.value as PaymentDetails["kyc_status"],
                }))
              }
            >
              <option value="NOT_STARTED">NOT_STARTED</option>
              <option value="PENDING">PENDING</option>
              <option value="VERIFIED">VERIFIED</option>
            </select>
          </Field>
        </Grid>

        <Field label="Notes">
          <Textarea
            className={inputClass}
            disabled={!editMode}
            value={payment.notes || ""}
            onChange={(e) => setPayment((prev) => ({ ...prev, notes: e.target.value }))}
          />
        </Field>
      </Section>

      {/* LOCATION */}
      <Section title="Location">
        <Grid>
          <Field label="Location Name">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.location_name ?? ""}
              onChange={(e) => setStore({ ...store, location_name: e.target.value })}
            />
          </Field>

          <Field label="City">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.city ?? ""}
              onChange={(e) => setStore({ ...store, city: e.target.value })}
            />
          </Field>

          <Field label="Region">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.region ?? ""}
              onChange={(e) => setStore({ ...store, region: e.target.value })}
            />
          </Field>

          <Field label="Postal Code">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.postal_code ?? ""}
              onChange={(e) => setStore({ ...store, postal_code: e.target.value })}
            />
          </Field>
        </Grid>

        <Field label="Address Line 1">
          <Textarea
            className={inputClass}
            disabled={!editMode}
            value={store.address_line1 ?? ""}
            onChange={(e) => setStore({ ...store, address_line1: e.target.value })}
          />
        </Field>

        <Field label="Address Line 2">
          <Textarea
            className={inputClass}
            disabled={!editMode}
            value={store.address_line2 ?? ""}
            onChange={(e) => setStore({ ...store, address_line2: e.target.value })}
          />
        </Field>

        <Grid>
          <Field label="Latitude">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.lat ?? ""}
              onChange={(e) =>
                setStore({
                  ...store,
                  lat: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </Field>

          <Field label="Longitude">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.lng ?? ""}
              onChange={(e) =>
                setStore({
                  ...store,
                  lng: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </Field>

          <Field label="Google Place ID">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.google_place_id ?? ""}
              onChange={(e) =>
                setStore({ ...store, google_place_id: e.target.value })
              }
            />
          </Field>

          <Field label="Country">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.country ?? "Mauritius"}
              onChange={(e) => setStore({ ...store, country: e.target.value })}
            />
          </Field>
        </Grid>
      </Section>

      {/* IMAGES */}
      <Section title="Images">
        {/* Logo Image */}
        <div className="space-y-3">
          <EditableSingleImage
            title="Logo"
            src={logoToDelete ? null : store.logo_url}
            onDelete={() => setLogoToDelete(true)}
            disabled={!editMode}
          />

          {editMode && (
            <div className="space-y-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">{logoToDelete ? 'Replace' : 'Change'} Logo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setLogoToAdd(file);
                      setLogoToDelete(false); // Clear delete flag when adding new
                    }
                    e.target.value = ""; // Reset input
                  }}
                  className="mt-1 block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-gray-100 file:text-gray-700
                    hover:file:bg-gray-200
                    cursor-pointer"
                />
              </label>

              {logoToAdd && (
                <SingleFilePreview
                  file={logoToAdd}
                  onRemove={() => setLogoToAdd(null)}
                />
              )}
            </div>
          )}
        </div>

        {/* Cover Image */}
        <div className="space-y-3 mt-6">
          <EditableSingleImage
            title="Cover Image"
            src={coverToDelete ? null : store.cover_image_url}
            onDelete={() => setCoverToDelete(true)}
            disabled={!editMode}
          />

          {editMode && (
            <div className="space-y-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">{coverToDelete ? 'Replace' : 'Change'} Cover</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setCoverToAdd(file);
                      setCoverToDelete(false); // Clear delete flag when adding new
                    }
                    e.target.value = ""; // Reset input
                  }}
                  className="mt-1 block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-gray-100 file:text-gray-700
                    hover:file:bg-gray-200
                    cursor-pointer"
                />
              </label>

              {coverToAdd && (
                <SingleFilePreview
                  file={coverToAdd}
                  onRemove={() => setCoverToAdd(null)}
                />
              )}
            </div>
          )}
        </div>

        {/* Gallery Images */}
        <div className="space-y-3 mt-6">
          <EditableImageGrid
            title="Gallery Images"
            images={(store.gallery_urls || []).filter(
              (url: string) => !galleryToDelete.includes(url)
            )}
            onDelete={(url) => setGalleryToDelete([...galleryToDelete, url])}
            disabled={!editMode}
          />

          {editMode && (
            <div className="space-y-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Add Gallery Images</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setGalleryToAdd([...galleryToAdd, ...files]);
                    e.target.value = ""; // Reset input
                  }}
                  className="mt-1 block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-gray-100 file:text-gray-700
                    hover:file:bg-gray-200
                    cursor-pointer"
                />
              </label>

              <FilePreviewGrid
                files={galleryToAdd}
                onRemove={(idx) =>
                  setGalleryToAdd(galleryToAdd.filter((_, i) => i !== idx))
                }
              />
            </div>
          )}
        </div>
      </Section>

      {/* SYSTEM (Read Only) */}
      <Section title="System Info (Read Only)">
        <Grid>
          <ReadOnly
            label="Created At"
            value={store.created_at ? new Date(store.created_at).toLocaleString() : "-"}
          />
          <ReadOnly
            label="Updated At"
            value={store.updated_at ? new Date(store.updated_at).toLocaleString() : "-"}
          />
        </Grid>
      </Section>
    </div>
  );
}

/* ---------------- HELPERS ---------------- */

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-4">
    <h2 className="text-lg font-semibold">{title}</h2>
    {children}
  </section>
);

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="space-y-1">
    <label className="text-xs text-gray-500 uppercase">{label}</label>
    {children}
  </div>
);

const Grid = ({ children }: { children: ReactNode }) => (
  <div className="grid grid-cols-2 gap-6">{children}</div>
);

const ReadOnly = ({ label, value }: { label: string; value: ReactNode }) => (
  <div>
    <label className="text-xs text-gray-500 uppercase">{label}</label>
    <div className="text-sm font-medium">{value ?? "-"}</div>
  </div>
);

/* ---------------- IMAGE COMPONENTS ---------------- */

/**
 * Editable Single Image - shows one image with delete button
 */
const EditableSingleImage = ({
  title,
  src,
  onDelete,
  disabled,
}: {
  title: string;
  src: string | null;
  onDelete: () => void;
  disabled: boolean;
}) => {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      {src ? (
        <div className="relative w-full max-w-sm h-48 rounded-md overflow-hidden border">
          <img src={src} className="w-full h-full object-cover" alt={title} />
          {!disabled && (
            <button
              type="button"
              onClick={onDelete}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black transition-colors"
              aria-label="Delete image"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400">No image</p>
      )}
    </div>
  );
};

/**
 * Single File Preview - shows preview of newly selected file with remove button
 */
const SingleFilePreview = ({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) => (
  <div className="relative w-full max-w-sm h-48 rounded-md overflow-hidden border border-gray-300">
    <img
      src={URL.createObjectURL(file)}
      alt="Preview"
      className="w-full h-full object-cover"
    />
    <button
      type="button"
      onClick={onRemove}
      className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black transition-colors"
      aria-label="Remove file"
    >
      <X size={14} />
    </button>
  </div>
);

/**
 * Editable Image Grid - shows existing images with delete buttons
 */
const EditableImageGrid = ({
  title,
  images,
  onDelete,
  disabled,
}: {
  title: string;
  images: string[];
  onDelete: (url: string) => void;
  disabled: boolean;
}) => {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="grid grid-cols-4 gap-3">
        {images?.length ? (
          images.map((src: string, i: number) => (
            <div key={i} className="relative h-32 rounded-md overflow-hidden border">
              <img src={src} className="w-full h-full object-cover" alt={`${title} ${i + 1}`} />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onDelete(src)}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black transition-colors"
                  aria-label="Delete image"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-400">No images</p>
        )}
      </div>
    </div>
  );
};

/**
 * File Preview Grid - shows newly selected files with remove buttons
 */
const FilePreviewGrid = ({
  files,
  onRemove,
}: {
  files: File[];
  onRemove: (index: number) => void;
}) => {
  if (files.length === 0) return null;

  return (
    <div className="grid grid-cols-4 gap-3 mt-3">
      {files.map((file, index) => (
        <div key={index} className="relative h-32 rounded-md overflow-hidden border border-gray-300">
          <img
            src={URL.createObjectURL(file)}
            alt={`Preview ${index + 1}`}
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black transition-colors"
            aria-label="Remove file"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

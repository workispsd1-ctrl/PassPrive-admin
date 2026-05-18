"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";
import {
  buildStorePayload,
  deleteStoreImages,
  replaceStoreRelations,
  type StoreOfferInput,
  uploadStoreImages,
  upsertStoreMember,
  upsertStorePaymentDetails,
} from "@/lib/storeAdmin";

import { DAYS, PRIMARY_BTN } from "@/app/dashboard/_components/StoreComponents/constants";

import type {
  CatalogueCategoryDraft,
  DayHours,
  OpenSection,
  PaymentDetails,
  StoreFormState,
} from "@/app/dashboard/_components/StoreComponents/types";

import { safeNumberOrNull, slugify } from "@/app/dashboard/_components/StoreComponents/utils";

import { usePreserveScroll } from "@/app/dashboard/_components/StoreComponents/hooks/usePreserveScroll";
import { useStoreOffers } from "@/app/dashboard/_components/StoreComponents/hooks/useStoreOffers";
import { useStoreCatalogue } from "@/app/dashboard/_components/StoreComponents/hooks/useStoreCatalogue";

import StoreHeader from "@/app/dashboard/_components/StoreComponents/sections/StoreHeader";
import BasicSection from "@/app/dashboard/_components/StoreComponents/sections/BasicSection";
import ContactSection from "@/app/dashboard/_components/StoreComponents/sections/ContactSection";
import LocationSection from "@/app/dashboard/_components/StoreComponents/sections/LocationSection";
import MediaSection from "@/app/dashboard/_components/StoreComponents/sections/MediaSection";
import HoursSection from "@/app/dashboard/_components/StoreComponents/sections/HoursSection";
import DiscountsSection from "@/app/dashboard/_components/StoreComponents/sections/DiscountsSection";
import PaymentSection from "@/app/dashboard/_components/StoreComponents/sections/PaymentSection";
import CatalogueSection from "@/app/dashboard/_components/StoreComponents/sections/CatalogueSection";
import { syncStoreCatalogueAdmin } from "@/lib/storeCatalogueAdmin";
import { fetchCategoryOptions } from "@/lib/storeCategoryOptions";

/* -------------------------------------------------------
  ✅ CONSTANTS
------------------------------------------------------- */
const STORE_ROLE = "storepartner" as const;
const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

/* -------------------------------------------------------
  ✅ INDUSTRIAL HELPERS (safe ids + uploads)
------------------------------------------------------- */

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id_${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`;
}

function getExt(file: File): string {
  const nameExt = file.name.split(".").pop()?.toLowerCase();
  if (nameExt) return nameExt;
  const mimeExt = file.type.split("/")[1]?.toLowerCase();
  return mimeExt || "bin";
}

function isImage(file?: File | null): boolean {
  return !!file?.type?.startsWith("image/");
}

function isVideo(file?: File | null): boolean {
  return !!file?.type?.startsWith("video/");
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object") {
    const message = "message" in error ? error.message : null;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "Unknown error";
}

async function getAccessToken() {
  const { data, error } = await supabaseBrowser.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error("Not logged in. Please login as admin/superadmin.");
  return token;
}

function validateCatalogueForStoreType(
  categories: CatalogueCategoryDraft[],
  storeType: "PRODUCT" | "SERVICE"
) {
  const enabledCategories = categories.filter((category) => category.enabled);

  for (const category of enabledCategories) {
    if (!category.title.trim()) {
      return `${storeType === "SERVICE" ? "Service" : "Catalogue"} category title is required.`;
    }

    for (const item of category.items) {
      const hasMeaningfulContent =
        item.title.trim() ||
        item.description?.trim() ||
        item.price.trim() ||
        item.imageUrl?.trim() ||
        item.imageFile;

      if (!hasMeaningfulContent) continue;

      if (!item.title.trim()) {
        return `Each ${storeType === "SERVICE" ? "service" : "catalogue"} item needs a title.`;
      }

      if (item.is_billable && !item.price.trim()) {
        return `Price is required for billable item "${item.title}".`;
      }

      if (item.supports_slot_booking && !item.duration_minutes.trim()) {
        return `Duration is required for slot-bookable item "${item.title}".`;
      }
    }
  }

  return null;
}

function toDbOfferType(
  uiOfferType: string | undefined,
  valueType: "PERCENT" | "FLAT" | undefined
): string {
  const normalized = String(uiOfferType || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (normalized === "percentage" || normalized === "percent") return "percentage";
  if (normalized === "flat" || normalized === "flat_discount") return "flat";
  if (normalized === "cashback" || normalized === "cover_discount") return "cover_discount";

  if (
    normalized === "in_store" ||
    normalized === "passprive_pass" ||
    normalized === "bank_benefit" ||
    normalized === "coupon"
  ) {
    return valueType === "FLAT" ? "flat" : "percentage";
  }

  return valueType === "FLAT" ? "flat" : "percentage";
}

/* -------------------------------------------------------
  ✅ FIX: useSearchParams must be inside Suspense boundary
------------------------------------------------------- */

function AddStorePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);

  // ✅ NEW: Partner login credentials (frontend create)
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerPassword, setPartnerPassword] = useState("");

  // Media
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverMediaFile, setCoverMediaFile] = useState<File | null>(null); // video OR image
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);

  const { preserveScroll, scrollYRef } = usePreserveScroll();

  // Only one section expanded at a time
  const [openSection, setOpenSection] = useState<OpenSection>("basic");

  const setOpenSectionStable = (next: OpenSection) => {
    const y = scrollYRef.current;
    setOpenSection(next);
    requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "auto" }));
  };

  const toggleSectionStable = (key: Exclude<OpenSection, null>) => {
    const next = openSection === key ? null : key;
    setOpenSectionStable(next);
  };

  const [form, setForm] = useState<StoreFormState>({
    name: "",
    store_type: "PRODUCT",
    category: "",
    subcategory: "",
    tags: "",
    description: "",

    phone: "",
    whatsapp: "",
    email: "", // store contact email (not login)
    website: "",

    location_name: "",
    address_line1: "",
    address_line2: "",
    city: "",
    region: "",
    postal_code: "",
    lat: "",
    lng: "",
    google_place_id: "",

    instagram: "",
    facebook: "",
    tiktok: "",
    maps: "",

    is_active: true,
    is_featured: false,
  });

  const [openingHours, setOpeningHours] = useState<Record<string, DayHours>>(
    DAYS.reduce((acc, day) => {
      acc[day] = { open: "", close: "", closed: false };
      return acc;
    }, {} as Record<string, DayHours>)
  );
  const [weekEnabled] = useState(true);

  const [payment, setPayment] = useState<PaymentDetails>({
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

  const tagsArray = useMemo(() => {
    return form.tags ? form.tags.split(",").map((v) => v.trim()).filter(Boolean) : [];
  }, [form.tags]);

  const offersApi = useStoreOffers(preserveScroll);
  const catalogueApi = useStoreCatalogue(preserveScroll, form.store_type);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        setCategoryOptions(await fetchCategoryOptions(form.store_type));
      } catch {
        // Keep form usable even if dropdown options fail to load.
        setCategoryOptions([]);
      }
    };

    void loadOptions();
  }, [form.store_type]);

  /* ---------------------------------------------
     ✅ STORAGE UPLOAD HELPERS
  --------------------------------------------- */

  const uploadSingle = async (
    storeId: string,
    file: File | null,
    folder: "logo" | "cover"
  ) => {
    if (!file) return null;
    const [url] = await uploadStoreImages(storeId, [file], folder);
    return url || null;
  };

  const uploadGallery = async (storeId: string, files: File[]) => {
    return uploadStoreImages(storeId, files, "gallery");
  };

  const uploadCatalogueImage = async (
    storeId: string,
    categoryId: string,
    itemId: string,
    file: File
  ) => {
    const ext = getExt(file);
    const path = `catalogue/${storeId}/${categoryId}/${itemId}-${uuid()}.${ext}`;
    const { error } = await supabaseBrowser.storage.from("stores").upload(path, file, {
      upsert: false,
    });

    if (error) throw error;

    const { data } = supabaseBrowser.storage.from("stores").getPublicUrl(path);
    return data.publicUrl;
  };

  /* ---------------------------------------------
     ✅ CREATE STORE PARTNER LOGIN (Frontend)
  --------------------------------------------- */
  const createStorePartnerAccount = async (): Promise<{ userId: string; email: string }> => {
    const email = partnerEmail.trim().toLowerCase();
    const password = partnerPassword;

    if (!email) throw new Error("Login email is required");
    if (!password || password.length < 6)
      throw new Error("Password must be at least 6 characters");

    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/api/auth/create-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email,
        password,
        full_name: form.name?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        role: STORE_ROLE,
      }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(json?.error || "Failed to create store partner account");
    }

    const newUserId = json?.user?.id;
    if (!newUserId) throw new Error("User created, but missing user id in response.");

    return { userId: newUserId, email };
  };

  /* ---------------------------------------------
     ✅ STORE OWNER ID RESOLUTION
  --------------------------------------------- */
  const resolveStoreOwnerId = async (): Promise<string> => {
    const fromQuery =
      searchParams.get("storeOwnerId") ||
      searchParams.get("store_owner_id") ||
      searchParams.get("storeId") ||
      searchParams.get("store_id");

    if (fromQuery) return fromQuery;

    const created = await createStorePartnerAccount();
    showToast({
      title: "Store Login Created",
      description: `Login: ${created.email}`,
    });

    return created.userId;
  };

  /* ---------------------------------------------
     ✅ SUBMIT
  --------------------------------------------- */
  const handleSubmit = async () => {
    if (!form.name.trim()) {
      showToast({ type: "error", title: "Store name is required" });
      setOpenSectionStable("basic");
      return;
    }
    if (!form.category.trim()) {
      showToast({ type: "error", title: "Category is required" });
      setOpenSectionStable("basic");
      return;
    }
    if (!form.region.trim()) {
      showToast({ type: "error", title: "Region is required" });
      setOpenSectionStable("location");
      return;
    }
    if (!form.postal_code.trim()) {
      showToast({ type: "error", title: "Postal code is required" });
      setOpenSectionStable("location");
      return;
    }
    if (!payment.legal_business_name.trim()) {
      showToast({
        type: "error",
        title: "Legal business name is required",
        description: "Required for settlement & invoicing.",
      });
      setOpenSectionStable("payment");
      return;
    }

    if (coverMediaFile && !isImage(coverMediaFile) && !isVideo(coverMediaFile)) {
      showToast({
        type: "error",
        title: "Cover media must be an Image or Video",
        description: "Please upload a valid image/* or video/* file.",
      });
      setOpenSectionStable("media");
      return;
    }

    const catalogueValidationError = validateCatalogueForStoreType(
      catalogueApi.catalogueCategories,
      form.store_type
    );
    if (catalogueValidationError) {
      showToast({ type: "error", title: catalogueValidationError });
      setOpenSectionStable("catalogue");
      return;
    }

    const hasOwnerInQuery =
      !!(
        searchParams.get("storeOwnerId") ||
        searchParams.get("store_owner_id") ||
        searchParams.get("storeId") ||
        searchParams.get("store_id")
      );

    if (!hasOwnerInQuery) {
      if (!partnerEmail.trim()) {
        showToast({ type: "error", title: "Store Login Email is required" });
        return;
      }
      if (!partnerPassword || partnerPassword.length < 6) {
        showToast({
          type: "error",
          title: "Store Login Password is required",
          description: "Password must be at least 6 characters.",
        });
        return;
      }
    }

    setLoading(true);

    let uploadedUrls: string[] = [];
    let createdStoreId: string | null = null;

    try {
      const ownerUserId = await resolveStoreOwnerId(); // auth user id
      const storeId = uuid(); // store uuid (branch id)
      createdStoreId = storeId;

      const normalizedOpeningHours = DAYS.reduce((acc, day) => {
        const value = openingHours[day] || { open: "", close: "", closed: false };
        acc[day] = weekEnabled
          ? value
          : { open: "", close: "", closed: true };
        return acc;
      }, {} as Record<string, DayHours>);

      const socialLinks = {
        instagram: form.instagram || undefined,
        facebook: form.facebook || undefined,
        tiktok: form.tiktok || undefined,
        maps: form.maps || undefined,
      };

      const lat = safeNumberOrNull(form.lat);
      const lng = safeNumberOrNull(form.lng);

      const offersFinal: StoreOfferInput[] = offersApi.offers
        .filter((o) => o.enabled)
        .map((o) => ({
          title: o.title?.trim(),
          description: o.subtitle?.trim() || null,
          badge_text: o.badge_text?.trim() || null,
          offer_type: toDbOfferType(o.type, o.value_type),
          discount_value:
            o.value_type === "PERCENT"
              ? safeNumberOrNull(o.percent || "")
              : safeNumberOrNull(o.flat_amount || ""),
          min_spend: safeNumberOrNull(o.min_bill || ""),
          start_at: o.start_at || null,
          end_at: o.end_at || null,
          is_active: true,
          metadata: {
            offer_type_ui: o.type,
            subtitle: o.subtitle?.trim() || null,
            value_type: o.value_type,
            currency: o.currency || "MUR",
            max_discount: safeNumberOrNull(o.max_discount || ""),
            requires_pass: !!o.requires_pass,
            pass_tiers: o.pass_tiers
              ? o.pass_tiers.split(",").map((x) => x.trim()).filter(Boolean)
              : [],
            coupon_code: o.coupon_code?.trim() || null,
            stackable: !!o.stackable,
            terms: o.terms?.trim() || null,
          },
        }))
        .filter((o) => o.title);

      const coverType: "video" | "image" | null = coverMediaFile
        ? isVideo(coverMediaFile)
          ? "video"
          : "image"
        : null;

      // ✅ PATCH 1: slug generation should not query by new storeId
      // Generate and retry if unique constraint fails.
      const finalSlug = `${slugify(form.name)}-${Math.random().toString(16).slice(2, 6)}`;

      const baseStorePayload = buildStorePayload({
        id: storeId,
        owner_user_id: ownerUserId,
        name: form.name.trim(),
        slug: finalSlug,
        store_type: form.store_type,
        description: form.description?.trim() || null,
        category: form.category?.trim() || null,
        subcategory: form.subcategory?.trim() || null,
        phone: form.phone?.trim() || null,
        whatsapp: form.whatsapp?.trim() || null,
        email: form.email?.trim() || null,
        website: form.website?.trim() || null,
        location_name: form.location_name?.trim() || null,
        address_line1: form.address_line1?.trim() || null,
        address_line2: form.address_line2?.trim() || null,
        city: form.city?.trim() || null,
        region: form.region?.trim() || null,
        postal_code: form.postal_code?.trim() || null,
        country: "Mauritius",
        lat,
        lng,
        google_place_id: form.google_place_id?.trim() || null,
        is_active: !!form.is_active,
        is_featured: !!form.is_featured,
      });

      const paymentDetails = {
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
      const storePayload = {
        ...baseStorePayload,
        logo_url: null,
        cover_image: null,
      };
      const { error: createError } = await supabaseBrowser.from("stores").insert(storePayload);
      if (createError) throw createError;

      const [logoUrl, coverMediaUrl, galleryUrls] = await Promise.all([
        uploadSingle(storeId, logoFile, "logo"),
        uploadSingle(storeId, coverMediaFile, "cover"),
        uploadGallery(storeId, galleryFiles),
      ]);

      const coverImageUrl = coverType === "image" ? coverMediaUrl : null;
      uploadedUrls = [logoUrl, coverMediaUrl, ...galleryUrls].filter(
        (value): value is string => Boolean(value)
      );

      const { error: updateStoreError } = await supabaseBrowser
        .from("stores")
        .update({
          logo_url: logoUrl,
          cover_image: coverImageUrl,
        })
        .eq("id", storeId);

      if (updateStoreError) throw updateStoreError;

      // 4) Catalogue / Services via admin CRUD APIs
      const enabledCats = catalogueApi.catalogueCategories
        .filter((category) => category.enabled && category.title.trim())
        .map(async (category, idx) => ({
          clientId: category.id,
          title: category.title.trim(),
          starting_from: category.starting_from ? Number(category.starting_from) : null,
          enabled: true,
          sort_order: category.sort_order ? Number(category.sort_order) : idx,
          items: await Promise.all(
            category.items.map(async (item, itemIdx) => {
              const title = item.title.trim();
              const hasMeaningfulContent =
                title ||
                item.description?.trim() ||
                item.price.trim() ||
                item.imageUrl?.trim() ||
                item.imageFile;

              if (!hasMeaningfulContent) return null;

              let imageUrl = item.imageUrl?.trim() || null;
              if (item.imageFile) {
                imageUrl = await uploadCatalogueImage(storeId, category.id, item.id, item.imageFile);
              }

              return {
                clientId: item.id,
                title,
                description: item.description?.trim() || null,
                price: item.price ? Number(item.price) : null,
                image_url: imageUrl,
                sku: item.sku?.trim() || null,
                sort_order: item.sort_order ? Number(item.sort_order) : itemIdx,
                is_available: !!item.is_available,
                item_type: (item.item_type || form.store_type) as "PRODUCT" | "SERVICE",
                is_billable: !!item.is_billable,
                duration_minutes: item.duration_minutes ? Number(item.duration_minutes) : null,
                supports_slot_booking: !!item.supports_slot_booking,
              };
            })
          ),
        }));

      const categoriesPayload = (await Promise.all(enabledCats)).map((category) => ({
        ...category,
        items: category.items.filter(
          (item): item is Exclude<typeof item, null> => item !== null
        ),
      }));

      await Promise.all([
        replaceStoreRelations(storeId, {
          tags: tagsArray,
          social_links: socialLinks,
          opening_hours: normalizedOpeningHours,
          offers: offersFinal,
          payment_details: paymentDetails,
          gallery_urls: galleryUrls,
          logo_url: logoUrl,
          cover_image_url: coverImageUrl,
          cover_video_url: coverType === "video" ? coverMediaUrl : null,
        }),
        upsertStorePaymentDetails(storeId, paymentDetails),
        upsertStoreMember(storeId, ownerUserId, "manager"),
        syncStoreCatalogueAdmin({
          storeId,
          categories: categoriesPayload,
          deletedCategoryIds: [],
          deletedItemIds: [],
        }),
      ]);

      showToast({ type: "success", title: "Store saved successfully" });
      router.push("/dashboard/manage-stores");
    } catch (err: unknown) {
      if (uploadedUrls.length > 0) {
        try {
          await deleteStoreImages(uploadedUrls);
        } catch {
          // Keep the original error surfaced to the user.
        }
      }

      if (createdStoreId) {
        try {
          await supabaseBrowser.from("stores").delete().eq("id", createdStoreId);
        } catch {
          // Keep the original error surfaced to the user.
        }
      }

      showToast({
        type: "error",
        title: "Failed to save store",
        description: getErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-full mx-auto px-6 py-4">
      <StoreHeader
        onBack={() => router.push("/dashboard/manage-stores")}
        isActive={!!form.is_active}
        setIsActive={(v) => setForm((p) => ({ ...p, is_active: v }))}
        isFeatured={!!form.is_featured}
        setIsFeatured={(v) => setForm((p) => ({ ...p, is_featured: v }))}
        preserveScroll={preserveScroll}
      />

      {/* ✅ LOGIN SECTION */}
      <div className="rounded-xl border bg-white p-4 mb-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Store Partner Login</div>
            <div className="text-xs text-muted-foreground">
              This creates the login account for the store owner.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          <div className="space-y-1">
            <label className="text-xs font-medium">Login Email</label>
            <Input
              type="email"
              value={partnerEmail}
              onChange={(e) => setPartnerEmail(e.target.value)}
              placeholder="owner@store.com"
              disabled={loading}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Login Password</label>
            <Input
              type="password"
              value={partnerPassword}
              onChange={(e) => setPartnerPassword(e.target.value)}
              placeholder="Min 6 characters"
              disabled={loading}
            />
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <BasicSection
          openSection={openSection}
          onToggle={toggleSectionStable}
          preserveScroll={preserveScroll}
          form={form}
          setForm={setForm}
          categoryOptions={categoryOptions}
        />

        <ContactSection
          openSection={openSection}
          onToggle={toggleSectionStable}
          preserveScroll={preserveScroll}
          form={form}
          setForm={setForm}
        />

        <LocationSection
          openSection={openSection}
          onToggle={toggleSectionStable}
          preserveScroll={preserveScroll}
          form={form}
          setForm={setForm}
        />

        <MediaSection
          openSection={openSection}
          onToggle={toggleSectionStable}
          preserveScroll={preserveScroll}
          logoFile={logoFile}
          setLogoFile={setLogoFile}
          coverMediaFile={coverMediaFile}
          setCoverMediaFile={setCoverMediaFile}
          galleryFiles={galleryFiles}
          setGalleryFiles={setGalleryFiles}
        />

        <HoursSection
          openSection={openSection}
          onToggle={toggleSectionStable}
          preserveScroll={preserveScroll}
          openingHours={openingHours}
          setOpeningHours={setOpeningHours}
        />

        <DiscountsSection
          openSection={openSection}
          onToggle={toggleSectionStable}
          preserveScroll={preserveScroll}
          offers={offersApi.offers}
          addOffer={offersApi.addOffer}
          removeOffer={offersApi.removeOffer}
          toggleOfferExpanded={offersApi.toggleOfferExpanded}
          updateOffer={offersApi.updateOffer}
          typeLabel={offersApi.typeLabel}
        />

        <PaymentSection
          openSection={openSection}
          onToggle={toggleSectionStable}
          preserveScroll={preserveScroll}
          payment={payment}
          setPayment={setPayment}
        />

        <CatalogueSection
          openSection={openSection}
          onToggle={toggleSectionStable}
          preserveScroll={preserveScroll}
          storeType={form.store_type}
          catalogueCategories={catalogueApi.catalogueCategories}
          customCategoryTitle={catalogueApi.customCategoryTitle}
          setCustomCategoryTitle={catalogueApi.setCustomCategoryTitle}
          customCategoryStartingFrom={catalogueApi.customCategoryStartingFrom}
          setCustomCategoryStartingFrom={catalogueApi.setCustomCategoryStartingFrom}
          customCategorySortOrder={catalogueApi.customCategorySortOrder}
          setCustomCategorySortOrder={catalogueApi.setCustomCategorySortOrder}
          toggleCategoryEnabled={catalogueApi.toggleCategoryEnabled}
          toggleCategoryExpanded={catalogueApi.toggleCategoryExpanded}
          addCategory={catalogueApi.addCategory}
          removeCategory={catalogueApi.removeCategory}
          updateCategoryField={catalogueApi.updateCategoryField}
          addItemToCategory={catalogueApi.addItemToCategory}
          removeItemFromCategory={catalogueApi.removeItemFromCategory}
          updateItem={catalogueApi.updateItem}
        />
      </div>

      {/* ACTIONS */}
      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
          className="bg-red-700 hover:bg-red-600 text-white"
        >
          Cancel
        </Button>

        <Button onClick={handleSubmit} disabled={loading} className={[PRIMARY_BTN, "cursor-pointer"].join(" ")}>
          {loading ? "Saving..." : "Save Store"}
        </Button>
      </div>
    </div>
  );
}

export default function AddStorePage() {
  return (
    <Suspense fallback={<div className="max-w-full mx-auto px-6 py-4">Loading...</div>}>
      <AddStorePageInner />
    </Suspense>
  );
}

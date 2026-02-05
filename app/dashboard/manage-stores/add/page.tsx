"use client";

import React, { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";

import { DAYS, PRIMARY_BTN } from "@/app/dashboard/_components/StoreComponents/constants";

import type {
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

/* -------------------------------------------------------
  ✅ CONSTANTS
------------------------------------------------------- */
const STORE_ROLE = "storepartner" as const;

/* -------------------------------------------------------
  ✅ INDUSTRIAL HELPERS (safe ids + uploads)
------------------------------------------------------- */

function uuid(): string {
  // @ts-ignore
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

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T, idx: number) => Promise<void>
) {
  const queue = items.map((item, idx) => ({ item, idx }));
  const runners = Array.from({ length: Math.max(1, limit) }).map(async () => {
    while (queue.length) {
      const next = queue.shift();
      if (!next) return;
      await worker(next.item, next.idx);
    }
  });
  await Promise.all(runners);
}

/* -------------------------------------------------------
  ✅ FIX: useSearchParams must be inside Suspense boundary
------------------------------------------------------- */

function AddStorePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);

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
  const catalogueApi = useStoreCatalogue(preserveScroll);

  /* ---------------------------------------------
     ✅ STORAGE UPLOAD HELPERS
  --------------------------------------------- */

  const uploadedPathsRef = React.useRef<string[]>([]);

  const uploadToBucket = async (path: string, file: File) => {
    const { error } = await supabaseBrowser.storage.from("stores").upload(path, file, {
      upsert: false,
    });

    if (error) throw error;

    uploadedPathsRef.current.push(path);

    const { data } = supabaseBrowser.storage.from("stores").getPublicUrl(path);
    return data.publicUrl;
  };

  const uploadSingle = async (
    storeId: string,
    file: File | null,
    folder: "logo" | "cover"
  ) => {
    if (!file) return null;
    const ext = getExt(file);
    const path = `${folder}/${storeId}/${uuid()}.${ext}`;
    return uploadToBucket(path, file);
  };

  const uploadGallery = async (storeId: string, files: File[]) => {
    const urls: string[] = new Array(files.length).fill("");

    await runWithConcurrency(files, 3, async (file, idx) => {
      const ext = getExt(file);
      const path = `gallery/${storeId}/${uuid()}.${ext}`;
      const url = await uploadToBucket(path, file);
      urls[idx] = url;
    });

    return urls.filter(Boolean);
  };

  const uploadCatalogueImage = async (
    storeId: string,
    categoryId: string,
    itemId: string,
    file: File
  ) => {
    const ext = getExt(file);
    const path = `catalogue/${storeId}/${categoryId}/${itemId}-${uuid()}.${ext}`;
    return uploadToBucket(path, file);
  };

  const cleanupUploads = async () => {
    const uploaded = uploadedPathsRef.current;
    if (!uploaded.length) return;
    await supabaseBrowser.storage.from("stores").remove(uploaded);
    uploadedPathsRef.current = [];
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

    // Save current admin session (best effort)
    const { data: prevSession } = await supabaseBrowser.auth.getSession();

    const { data: signUpData, error: signUpError } = await supabaseBrowser.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: form.name?.trim() || null,
          phone: form.phone?.trim() || null,
          role: STORE_ROLE,
        },
        emailRedirectTo: `fb-marketplace-bot.web.app/callback`,
      },
    });

    if (signUpError) throw new Error(signUpError.message);

    const newUserId = signUpData.user?.id;
    if (!newUserId) throw new Error("User created, but missing user id in response.");

    // Insert into public.users
    const { error: usersInsertErr } = await supabaseBrowser.from("users").insert({
      id: newUserId,
      email,
      full_name: form.name?.trim() || null,
      phone: form.phone?.trim() || null,
      role: STORE_ROLE,
      notifications_enabled: true,
      veg_mode: false,
      membership_tier: "none",
    });

    if (usersInsertErr) {
      throw new Error(
        `Auth user created, but failed to insert into public.users: ${usersInsertErr.message}. Fix RLS policy or insert via service role.`
      );
    }

    // Restore previous session (best effort)
    try {
      if (signUpData.session && prevSession?.session) {
        await supabaseBrowser.auth.setSession({
          access_token: prevSession.session.access_token,
          refresh_token: prevSession.session.refresh_token,
        });
      }
    } catch {
      // ignore
    }

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

    try {
      const ownerUserId = await resolveStoreOwnerId(); // auth user id
      const storeId = uuid(); // store uuid (branch id)

      const hours = DAYS.map((day) => {
        const d = openingHours[day];
        const closed = !!d.closed || (!d.open && !d.close);
        return { day, closed, slots: closed ? [] : [{ open: d.open, close: d.close }] };
      });

      const social_links = {
        instagram: form.instagram || undefined,
        facebook: form.facebook || undefined,
        tiktok: form.tiktok || undefined,
        maps: form.maps || undefined,
        website: form.website || undefined,
      };

      const lat = safeNumberOrNull(form.lat);
      const lng = safeNumberOrNull(form.lng);

      const offersFinal = offersApi.offers
        .filter((o) => o.enabled)
        .map((o) => ({
          id: o.id,
          type: o.type,
          title: o.title?.trim(),
          subtitle: o.subtitle?.trim() || null,
          badge_text: o.badge_text?.trim() || null,
          value_type: o.value_type,
          percent: o.value_type === "PERCENT" ? safeNumberOrNull(o.percent || "") : null,
          flat_amount: o.value_type === "FLAT" ? safeNumberOrNull(o.flat_amount || "") : null,
          currency: o.currency || "MUR",
          min_bill: safeNumberOrNull(o.min_bill || ""),
          max_discount: safeNumberOrNull(o.max_discount || ""),
          start_at: o.start_at || null,
          end_at: o.end_at || null,
          requires_pass: !!o.requires_pass,
          pass_tiers: o.pass_tiers
            ? o.pass_tiers.split(",").map((x) => x.trim()).filter(Boolean)
            : [],
          coupon_code: o.coupon_code?.trim() || null,
          stackable: !!o.stackable,
          terms: o.terms?.trim() || null,
        }))
        .filter((o) => o.title);

      const coverType: "video" | "image" | null = coverMediaFile
        ? isVideo(coverMediaFile)
          ? "video"
          : "image"
        : null;

      // ✅ PATCH 1: slug generation should not query by new storeId
      // Generate and retry if unique constraint fails.
      let finalSlug = `${slugify(form.name)}-${Math.random().toString(16).slice(2, 6)}`;

      // 1) Insert store row
      const { error: upsertStoreErr } = await supabaseBrowser.from("stores").upsert(
        {
          id: storeId,
          owner_user_id: ownerUserId,
          name: form.name.trim(),
          slug: finalSlug,
          description: form.description?.trim() || null,

          category: form.category?.trim() || null,
          subcategory: form.subcategory?.trim() || null,
          tags: tagsArray,

          phone: form.phone?.trim() || null,
          whatsapp: form.whatsapp?.trim() || null,
          email: form.email?.trim() || null,
          website: form.website?.trim() || null,

          social_links,

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

          hours,
          offers: offersFinal,

          is_active: !!form.is_active,
          is_featured: !!form.is_featured,
          cover_media_type: coverType,
        },
        { onConflict: "id" }
      );

      if (upsertStoreErr) {
        // If slug unique error, regenerate once and retry
        if (
          typeof upsertStoreErr.message === "string" &&
          upsertStoreErr.message.toLowerCase().includes("stores_slug_key")
        ) {
          finalSlug = `${slugify(form.name)}-${Math.random().toString(16).slice(2, 8)}`;
          const retry = await supabaseBrowser.from("stores").upsert(
            {
              id: storeId,
              owner_user_id: ownerUserId,
              name: form.name.trim(),
              slug: finalSlug,
              description: form.description?.trim() || null,
              category: form.category?.trim() || null,
              subcategory: form.subcategory?.trim() || null,
              tags: tagsArray,
              phone: form.phone?.trim() || null,
              whatsapp: form.whatsapp?.trim() || null,
              email: form.email?.trim() || null,
              website: form.website?.trim() || null,
              social_links,
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
              hours,
              offers: offersFinal,
              is_active: !!form.is_active,
              is_featured: !!form.is_featured,
              cover_media_type: coverType,
            },
            { onConflict: "id" }
          );
          if (retry.error) throw retry.error;
        } else {
          throw upsertStoreErr;
        }
      }

      // ✅ PATCH 2 (IMPORTANT): create membership row so partner can access their store
      // Requires a table: store_members(store_id uuid, user_id uuid, role text, created_at...)
      const { error: memberErr } = await supabaseBrowser.from("store_members").insert({
        store_id: storeId,
        user_id: ownerUserId,
        role: "owner",
      });
      if (memberErr) throw memberErr;

      // 2) Upload media then update store
      const logoUrl = await uploadSingle(storeId, logoFile, "logo");

      let coverMediaUrl: string | null = null;
      if (coverMediaFile) {
        coverMediaUrl = await uploadSingle(storeId, coverMediaFile, "cover");
      }

      const galleryUrls = await uploadGallery(storeId, galleryFiles);

      const coverImageUrl = coverType === "image" ? coverMediaUrl : null;

      const { error: mediaErr } = await supabaseBrowser
        .from("stores")
        .update({
          logo_url: logoUrl,
          cover_image_url: coverImageUrl,
          cover_media_url: coverMediaUrl,
          gallery_urls: galleryUrls,
        })
        .eq("id", storeId);

      if (mediaErr) throw mediaErr;

      // 3) Payment
      const { error: payErr } = await supabaseBrowser.from("store_payment_details").upsert(
        {
          store_id: storeId,
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
        },
        { onConflict: "store_id" }
      );
      if (payErr) throw payErr;

      // 4) Catalogue (replace all)
      const { error: delItemsErr } = await supabaseBrowser
        .from("store_catalogue_items")
        .delete()
        .eq("store_id", storeId);
      if (delItemsErr) throw delItemsErr;

      const { error: delCatsErr } = await supabaseBrowser
        .from("store_catalogue_categories")
        .delete()
        .eq("store_id", storeId);
      if (delCatsErr) throw delCatsErr;

      const enabledCats = catalogueApi.catalogueCategories
        .filter((c) => c.enabled && c.title.trim())
        .map((c, idx) => ({
          draftId: c.id,
          id: uuid(),
          store_id: storeId,
          title: c.title.trim(),
          starting_from: c.starting_from ? Number(c.starting_from) : null,
          enabled: true,
          sort_order: idx,
          items: c.items,
        }));

      if (enabledCats.length) {
        const { error: insCatsErr } = await supabaseBrowser.from("store_catalogue_categories").insert(
          enabledCats.map((c) => ({
            id: c.id,
            store_id: c.store_id,
            title: c.title,
            starting_from: c.starting_from,
            enabled: c.enabled,
            sort_order: c.sort_order,
          }))
        );
        if (insCatsErr) throw insCatsErr;
      }

      const itemsToInsert: any[] = [];

      for (const cat of enabledCats) {
        for (let i = 0; i < cat.items.length; i++) {
          const it = cat.items[i];
          const title = (it.title || "").trim();
          const priceNum = it.price ? Number(it.price) : null;

          if (!title && !priceNum) continue;

          const itemId = uuid();

          let imageUrl: string | null = null;
          if (it.imageFile) {
            imageUrl = await uploadCatalogueImage(storeId, cat.id, itemId, it.imageFile);
          }

          itemsToInsert.push({
            id: itemId,
            store_id: storeId,
            category_id: cat.id,
            title: title || "Untitled",
            price: Number.isFinite(priceNum as any) ? priceNum : null,
            sku: it.sku?.trim() || null,
            description: it.description?.trim() || null,
            is_available: !!it.is_available,
            image_url: imageUrl,
            sort_order: i,
          });
        }
      }

      if (itemsToInsert.length) {
        const { error: insItemsErr } = await supabaseBrowser
          .from("store_catalogue_items")
          .insert(itemsToInsert);
        if (insItemsErr) throw insItemsErr;
      }

      showToast({ type: "success", title: "Store saved successfully" });
      router.push("/dashboard/manage-stores");
    } catch (err: any) {
      await cleanupUploads();

      showToast({
        type: "error",
        title: "Failed to save store",
        description: err?.message ?? "Unknown error",
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
          catalogueCategories={catalogueApi.catalogueCategories}
          customCategoryTitle={catalogueApi.customCategoryTitle}
          setCustomCategoryTitle={catalogueApi.setCustomCategoryTitle}
          customCategoryStartingFrom={catalogueApi.customCategoryStartingFrom}
          setCustomCategoryStartingFrom={catalogueApi.setCustomCategoryStartingFrom}
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

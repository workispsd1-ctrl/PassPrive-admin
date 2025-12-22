"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";

import {
  DAYS,
  PRIMARY_BTN,
} from "@/app/dashboard/_components/StoreComponents/constants";

import type {
  DayHours,
  OpenSection,
  PaymentDetails,
  StoreFormState,
} from "@/app/dashboard/_components/StoreComponents/types";

import {
  safeNumberOrNull,
  slugify,
} from "@/app/dashboard/_components/StoreComponents/utils";

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

export default function AddStorePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Media
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverMediaFile, setCoverMediaFile] = useState<File | null>(null); // ✅ video OR image
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);

  const { preserveScroll, scrollYRef } = usePreserveScroll();

  // ✅ Only one section expanded at a time
  const [openSection, setOpenSection] = useState<OpenSection>("basic");

  const setOpenSectionStable = (next: OpenSection) => {
    const y = scrollYRef.current;
    setOpenSection(next);
    requestAnimationFrame(() => {
      window.scrollTo({ top: y, behavior: "auto" });
    });
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
    email: "",
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
    return form.tags
      ? form.tags.split(",").map((v) => v.trim()).filter(Boolean)
      : [];
  }, [form.tags]);

  const offersApi = useStoreOffers(preserveScroll);
  const catalogueApi = useStoreCatalogue(preserveScroll);

  /* ---------------------------------------------
     STORAGE UPLOAD HELPERS
  --------------------------------------------- */
  const uploadSingle = async (
    storeId: string,
    file: File | null,
    folder: "logo" | "cover_video" | "cover_image"
  ) => {
    if (!file) return null;

    const ext = file.name.split(".").pop();
    const path = `${folder}/${storeId}/${Date.now()}.${ext}`;

    const { error } = await supabaseBrowser.storage
      .from("stores")
      .upload(path, file);

    if (error) throw error;

    const { data } = supabaseBrowser.storage.from("stores").getPublicUrl(path);
    return data.publicUrl;
  };

  const uploadMultiple = async (
    storeId: string,
    files: File[],
    folder: "gallery"
  ) => {
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `${folder}/${storeId}/${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}.${ext}`;

      const { error } = await supabaseBrowser.storage
        .from("stores")
        .upload(path, file);

      if (error) throw error;

      const { data } = supabaseBrowser.storage.from("stores").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const uploadCatalogueImage = async (
    storeId: string,
    categoryId: string,
    itemId: string,
    file: File
  ) => {
    const ext = file.name.split(".").pop();
    const path = `catalogue/${storeId}/${categoryId}/${itemId}-${Date.now()}.${ext}`;

    const { error } = await supabaseBrowser.storage
      .from("stores")
      .upload(path, file);

    if (error) throw error;

    const { data } = supabaseBrowser.storage.from("stores").getPublicUrl(path);
    return data.publicUrl;
  };

  /* ---------------------------------------------
     SUBMIT
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

    setLoading(true);

    try {
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

      const enabledCatalogueDraft = catalogueApi.catalogueCategories
        .filter((c) => c.enabled)
        .map((c) => ({
          id: c.id,
          title: c.title.trim(),
          startingFrom: c.starting_from ? Number(c.starting_from) : null,
          items: c.items.map((it) => ({
            id: it.id,
            title: it.title.trim(),
            price: it.price ? Number(it.price) : null,
            sku: it.sku?.trim() || null,
            description: it.description?.trim() || null,
            isAvailable: !!it.is_available,
            imageUrl: null as string | null,
          })),
        }))
        .filter((c) => c.title);

      const coverType =
        coverMediaFile?.type?.startsWith("video/")
          ? "video"
          : coverMediaFile?.type?.startsWith("image/")
          ? "image"
          : null;

      const metadataDraft = {
        payment_details: {
          ...payment,
          commission_percent: payment.commission_percent
            ? Number(payment.commission_percent)
            : null,
        },
        catalogue: { version: 1, categories: enabledCatalogueDraft },
        cover_media: {
          type: coverType,
          url: null as string | null,
        },
      };

      const uniqueSlug = `${slugify(form.name)}-${Math.random()
        .toString(16)
        .slice(2, 6)}`;

      const { data: store, error } = await supabaseBrowser
        .from("stores")
        .insert({
          name: form.name.trim(),
          slug: uniqueSlug,
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

          logo_url: null,
          cover_image_url: null,
          gallery_urls: [],

          amenities: {},
          services: {},
          pricing: {},

          offers: offersFinal,
          metadata: metadataDraft,

          is_active: !!form.is_active,
          is_featured: !!form.is_featured,
        })
        .select()
        .single();

      if (error) throw error;

      const logoUrl = await uploadSingle(store.id, logoFile, "logo");

      // ✅ cover media upload (video OR image)
      let coverMediaUrl: string | null = null;
      if (coverMediaFile) {
        const folder: "cover_video" | "cover_image" =
          coverMediaFile.type.startsWith("video/") ? "cover_video" : "cover_image";
        coverMediaUrl = await uploadSingle(store.id, coverMediaFile, folder);
      }

      const galleryUrls = await uploadMultiple(store.id, galleryFiles, "gallery");

      // Upload catalogue item images
      const categoriesWithImages = await Promise.all(
        catalogueApi.catalogueCategories.map(async (cat) => {
          if (!cat.enabled) return cat;

          const updatedItems = await Promise.all(
            cat.items.map(async (it) => {
              if (!it.imageFile) return it;
              const url = await uploadCatalogueImage(store.id, cat.id, it.id, it.imageFile);
              return { ...it, imageUrl: url };
            })
          );

          return { ...cat, items: updatedItems };
        })
      );

      const enabledCatalogueFinal = categoriesWithImages
        .filter((c) => c.enabled)
        .map((c) => ({
          id: c.id,
          title: c.title.trim(),
          startingFrom: c.starting_from ? Number(c.starting_from) : null,
          items: c.items
            .filter((it) => it.title.trim() || it.price)
            .map((it) => ({
              id: it.id,
              title: it.title.trim(),
              price: it.price ? Number(it.price) : null,
              sku: it.sku?.trim() || null,
              description: it.description?.trim() || null,
              isAvailable: !!it.is_available,
              imageUrl: it.imageUrl || null,
            })),
        }))
        .filter((c) => c.title);

      const metadataFinal = {
        ...metadataDraft,
        catalogue: { version: 1, categories: enabledCatalogueFinal },
        cover_media: {
          type: coverType,
          url: coverMediaUrl,
        },
      };

      const coverImageUrl =
        coverMediaFile?.type?.startsWith("image/") ? coverMediaUrl : null;

      const { error: upErr } = await supabaseBrowser
        .from("stores")
        .update({
          logo_url: logoUrl,
          cover_image_url: coverImageUrl, // ✅ only if image
          gallery_urls: galleryUrls,
          metadata: metadataFinal,
        })
        .eq("id", store.id);

      if (upErr) throw upErr;

      showToast({ type: "success", title: "Store added successfully" });
      router.push("/dashboard/manage-stores");
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Failed to add store",
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

        <Button
          onClick={handleSubmit}
          disabled={loading}
          className={[PRIMARY_BTN, "cursor-pointer"].join(" ")}
        >
          {loading ? "Saving..." : "Save Store"}
        </Button>
      </div>
    </div>
  );
}

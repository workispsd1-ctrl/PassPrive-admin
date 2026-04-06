"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, X } from "lucide-react";

import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStoreCatalogue } from "@/app/dashboard/_components/StoreComponents/hooks/useStoreCatalogue";
import CatalogueSection from "@/app/dashboard/_components/StoreComponents/sections/CatalogueSection";
import type { CatalogueCategoryDraft, OpenSection } from "@/app/dashboard/_components/StoreComponents/types";
import { fetchStoreCatalogueAdmin, syncStoreCatalogueAdmin } from "@/lib/storeCatalogueAdmin";

/* ---------------- CONSTANTS ---------------- */

const inputClass =
  "border border-gray-300 focus:border-gray-400 focus:ring-0 bg-white";

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

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

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const HOUR_OPTIONS = Array.from(
  { length: 24 },
  (_, hour) => `${String(hour).padStart(2, "0")}:00`
);

type DayHours = {
  open: string;
  close: string;
  closed: boolean;
};

const emptyWeek = () =>
  DAYS.reduce((acc, day) => {
    acc[day] = { open: "", close: "", closed: false };
    return acc;
  }, {} as Record<string, DayHours>);

const normalizeDayLabel = (day: string) => {
  if (!day) return "";
  const lowered = day.toLowerCase();
  const match = DAYS.find((d) => d.toLowerCase() === lowered);
  return match || "";
};

/* ---------------- HOURS UTILS ---------------- */

const parseHours = (raw: any) => {
  const week = emptyWeek();

  if (Array.isArray(raw)) {
    for (const item of raw) {
      const day = normalizeDayLabel(item?.day || "");
      if (!day || !week[day]) continue;

      const closed = !!item?.closed;
      const slot0 = Array.isArray(item?.slots) ? item.slots[0] : null;

      week[day] = {
        closed,
        open: closed ? "" : (slot0?.open || ""),
        close: closed ? "" : (slot0?.close || ""),
      };
    }

    return week;
  }

  if (raw && typeof raw === "object") {
    for (const [dayKey, value] of Object.entries(raw)) {
      const day = normalizeDayLabel(dayKey);
      if (!day || !week[day]) continue;

      if (typeof value === "string" && value.includes("-")) {
        const [open, close] = value.split("-").map((x) => x.trim());
        week[day] = { open: open || "", close: close || "", closed: false };
        continue;
      }

      if (value && typeof value === "object") {
        const obj = value as { open?: string; close?: string; closed?: boolean };
        const closed = !!obj.closed;
        week[day] = {
          closed,
          open: closed ? "" : (obj.open || ""),
          close: closed ? "" : (obj.close || ""),
        };
      }
    }
  }

  return week;
};

const serializeHours = (week: Record<string, DayHours>) => {
  return DAYS.map((day) => {
    const d = week[day] || { open: "", close: "", closed: false };
    const closed = !!d.closed || (!d.open && !d.close);

    return {
      day,
      closed,
      slots: closed ? [] : [{ open: d.open, close: d.close }],
    };
  });
};

const cleanObject = (obj: Record<string, any>) => {
  const out: Record<string, any> = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (typeof v === "string" && v.trim() === "") return;
    out[k] = v;
  });
  return out;
};

const validateCatalogueForStoreType = (
  categories: CatalogueCategoryDraft[],
  storeType: "PRODUCT" | "SERVICE"
) => {
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
};

/* ---------------- COMPONENT ---------------- */

export default function StoreDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [store, setStore] = useState<any>(null);
  const [storeOriginal, setStoreOriginal] = useState<any>(null);
  const [catalogueOriginal, setCatalogueOriginal] = useState<CatalogueCategoryDraft[]>([]);
  const [catalogueOpenSection, setCatalogueOpenSection] = useState<OpenSection>("catalogue");

  const [openingHours, setOpeningHours] = useState<Record<string, DayHours>>(
    emptyWeek()
  );
  const [openingHoursOriginal, setOpeningHoursOriginal] =
    useState<Record<string, DayHours>>(emptyWeek());

  // ✅ week include/exclude (same as restaurants)
  const [weekEnabled, setWeekEnabled] = useState(true);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // ✅ Image management state
  const [logoToAdd, setLogoToAdd] = useState<File | null>(null);
  const [coverToAdd, setCoverToAdd] = useState<File | null>(null);
  const [galleryToAdd, setGalleryToAdd] = useState<File[]>([]);
  const [logoToDelete, setLogoToDelete] = useState(false);
  const [coverToDelete, setCoverToDelete] = useState(false);
  const [galleryToDelete, setGalleryToDelete] = useState<string[]>([]);
  const hasLoadedCatalogueRef = useRef(false);
  const catalogueApi = useStoreCatalogue(
    (fn) => fn(),
    (store?.store_type as "PRODUCT" | "SERVICE") || "PRODUCT"
  );

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

  // Function to refresh store data (can be called manually)
  const refreshStoreData = async () => {
    try {
      const { data, error } = await supabaseBrowser
        .from("stores")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        showToast({
          type: "error",
          title: "Failed to load store",
          description: error.message,
        });
        console.error("❌ Fetch error:", error);
        return;
      }

      console.log("✅ Store data fetched from Supabase:", {
        id: data.id,
        name: data.name,
        cover_image_url: data.cover_image_url,
        cover_media_url: data.cover_media_url,
        cover_media_type: data.cover_media_type,
        logo_url: data.logo_url,
        gallery_urls: data.gallery_urls,
      });

      setStore(data);
      setStoreOriginal(data);

      const parsed = parseHours(data.hours);
      setOpeningHours(parsed);
      setOpeningHoursOriginal(parsed);

      const hasArrayHours = Array.isArray(data.hours) && data.hours.length > 0;
      const hasObjectHours =
        !!data.hours &&
        typeof data.hours === "object" &&
        !Array.isArray(data.hours) &&
        Object.keys(data.hours).length > 0;
      setWeekEnabled(hasArrayHours || hasObjectHours);
    } catch (err) {
      console.error("❌ Failed to refresh store:", err);
    }
  };

  useEffect(() => {
    if (id) {
      refreshStoreData();
    }
  }, [id]);

  useEffect(() => {
    const loadDropdownOptions = async () => {
      try {
        const moodResult = await fetch(`${API_BASE}/api/storemoodcategories`, {
          method: "GET",
          cache: "no-store",
        });

        if (moodResult.ok) {
          const payload = await moodResult.json().catch(() => null);
          const categories = Array.from(
            new Set(
              extractCategoryList(payload)
                .map((item) => item?.title)
                .filter(
                  (value): value is string =>
                    typeof value === "string" && value.trim().length > 0
                )
                .map((value) => value.trim())
            )
          ).sort((a, b) => a.localeCompare(b));

          setCategoryOptions(categories);
        }
      } catch {
        // Keep form usable even if dropdown options fail to load.
      }
    };

    void loadDropdownOptions();
  }, []);

  useEffect(() => {
    const loadCatalogue = async () => {
      if (!id || hasLoadedCatalogueRef.current) return;
      hasLoadedCatalogueRef.current = true;

      try {
        const data = await fetchStoreCatalogueAdmin(String(id));
        const mapped: CatalogueCategoryDraft[] = data.map((category) => ({
          id: category.id || `cat_${Date.now()}`,
          persistedId: category.id,
          enabled: category.enabled,
          title: category.title,
          starting_from:
            category.starting_from === null || category.starting_from === undefined
              ? ""
              : String(category.starting_from),
          sort_order: String(category.sort_order ?? 0),
          expanded: false,
          items: category.items.map((item) => ({
            id: item.id || `item_${Date.now()}`,
            persistedId: item.id,
            title: item.title,
            price: item.price === null || item.price === undefined ? "" : String(item.price),
            sku: item.sku || "",
            description: item.description || "",
            is_available: item.is_available,
            sort_order: String(item.sort_order ?? 0),
            item_type: item.item_type,
            is_billable: item.is_billable,
            duration_minutes:
              item.duration_minutes === null || item.duration_minutes === undefined
                ? ""
                : String(item.duration_minutes),
            supports_slot_booking: item.supports_slot_booking,
            imageFile: null,
            imageUrl: item.image_url || null,
          })),
        }));

        catalogueApi.replaceCatalogue(mapped);
        setCatalogueOriginal(mapped);
      } catch (error: any) {
        if (error?.response?.status === 404) {
          // Keep edit page usable when catalogue API is unavailable in this environment.
          catalogueApi.replaceCatalogue([]);
          setCatalogueOriginal([]);
          return;
        }

        showToast({
          type: "error",
          title: "Failed to load catalogue",
          description: error.message,
        });
      }
    };

    void loadCatalogue();
  }, [id]);

  /* ---------------- IMAGE MANAGEMENT HELPERS ---------------- */

  /**
   * Extract storage path from Supabase public URL
   * Example: https://xyz.supabase.co/storage/v1/object/public/stores/logo/123/abc.jpg
   * Returns: logo/123/abc.jpg
   */
  const extractStoragePath = (url: string): string | null => {
    try {
      const match = url.match(/\/stores\/(.+)$/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  };

  /**
   * Upload a single image to Supabase Storage
   */
  const uploadSingleImage = async (
    storeId: string,
    file: File,
    type: "logo" | "cover" | "gallery"
  ): Promise<string> => {
    const ext = file.name.split(".").pop() || "jpg";
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 9);
    const path = `${type}/${storeId}/${timestamp}-${random}.${ext}`;

    const { error } = await supabaseBrowser.storage
      .from("stores")
      .upload(path, file);

    if (error) throw error;

    const { data } = supabaseBrowser.storage
      .from("stores")
      .getPublicUrl(path);

    return data.publicUrl;
  };

  /**
   * Upload multiple images to Supabase Storage
   */
  const uploadMultipleImages = async (
    storeId: string,
    files: File[],
    type: "gallery"
  ): Promise<string[]> => {
    const urls: string[] = [];
    const uploadedPaths: string[] = [];

    try {
      // Upload with concurrency limit of 3
      const batchSize = 3;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const batchPromises = batch.map(async (file) => {
          const ext = file.name.split(".").pop() || "jpg";
          const timestamp = Date.now();
          const random = Math.random().toString(36).slice(2, 9);
          const path = `${type}/${storeId}/${timestamp}-${random}.${ext}`;

          const { error } = await supabaseBrowser.storage
            .from("stores")
            .upload(path, file);

          if (error) throw error;

          uploadedPaths.push(path);

          const { data } = supabaseBrowser.storage
            .from("stores")
            .getPublicUrl(path);

          return data.publicUrl;
        });

        const batchUrls = await Promise.all(batchPromises);
        urls.push(...batchUrls);
      }

      return urls;
    } catch (error) {
      // Cleanup: delete successfully uploaded files
      if (uploadedPaths.length > 0) {
        await supabaseBrowser.storage
          .from("stores")
          .remove(uploadedPaths)
          .catch(() => {}); // Silent fail on cleanup
      }
      throw error;
    }
  };

  const uploadCatalogueImage = async (
    storeId: string,
    categoryId: string,
    itemId: string,
    file: File
  ): Promise<string> => {
    const ext = file.name.split(".").pop() || "jpg";
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 9);
    const path = `catalogue/${storeId}/${categoryId}/${itemId}-${timestamp}-${random}.${ext}`;

    const { error } = await supabaseBrowser.storage.from("stores").upload(path, file);
    if (error) throw error;

    const { data } = supabaseBrowser.storage.from("stores").getPublicUrl(path);
    return data.publicUrl;
  };

  /**
   * Delete images from Supabase Storage
   */
  const deleteImagesFromStorage = async (urls: string[]): Promise<void> => {
    const paths = urls.map(extractStoragePath).filter(Boolean) as string[];
    if (paths.length === 0) return;

    const { error } = await supabaseBrowser.storage
      .from("stores")
      .remove(paths);

    if (error) throw error;
  };

  const handleCancel = () => {
    setStore(storeOriginal);
    setOpeningHours(openingHoursOriginal);
    setWeekEnabled(Array.isArray(storeOriginal?.hours) && storeOriginal.hours.length > 0);
    catalogueApi.replaceCatalogue(catalogueOriginal);
    catalogueApi.clearDeletedTracking();
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

    const catalogueValidationError = validateCatalogueForStoreType(
      catalogueApi.catalogueCategories,
      (store?.store_type as "PRODUCT" | "SERVICE") || "PRODUCT"
    );
    if (catalogueValidationError) {
      showToast({ type: "error", title: catalogueValidationError });
      setCatalogueOpenSection("catalogue");
      return;
    }

    setSaving(true);

    try {
      // ✅ Step 1: Delete removed images from storage
      const urlsToDelete: string[] = [];
      if (logoToDelete && store.logo_url) urlsToDelete.push(store.logo_url);
      if (coverToDelete && (store.cover_image_url || store.cover_media_url)) {
        urlsToDelete.push(store.cover_image_url || store.cover_media_url);
      }
      if (galleryToDelete.length > 0) urlsToDelete.push(...galleryToDelete);

      if (urlsToDelete.length > 0) {
        try {
          await deleteImagesFromStorage(urlsToDelete);
        } catch (error: any) {
          showToast({
            type: "error",
            title: "Failed to delete images",
            description: error.message,
          });
          setSaving(false);
          return;
        }
      }

      // ✅ Step 2: Upload new images
      let newLogoUrl: string | null = null;
      let newCoverUrl: string | null = null;
      let newGalleryUrls: string[] = [];

      try {
        if (logoToAdd) {
          newLogoUrl = await uploadSingleImage(id as string, logoToAdd, "logo");
        }
        if (coverToAdd) {
          newCoverUrl = await uploadSingleImage(id as string, coverToAdd, "cover");
        }
        if (galleryToAdd.length > 0) {
          newGalleryUrls = await uploadMultipleImages(id as string, galleryToAdd, "gallery");
        }
      } catch (error: any) {
        showToast({
          type: "error",
          title: "Failed to upload images",
          description: error.message,
        });
        setSaving(false);
        return;
      }

      // ✅ Step 3: Determine final image URLs
      const finalLogoUrl = logoToDelete ? newLogoUrl : (newLogoUrl || store.logo_url);
      const finalCoverUrl = coverToDelete ? newCoverUrl : (newCoverUrl || store.cover_image_url);
      const finalGalleryUrls = [
        ...(store.gallery_urls || []).filter((url: string) => !galleryToDelete.includes(url)),
        ...newGalleryUrls,
      ];

      // ✅ Determine cover media type (for consistency with add page)
      const coverMediaType: "image" | "video" | null = finalCoverUrl ? "image" : null;

      const tagsArray =
        typeof store.tags === "string"
          ? store.tags
              .split(",")
              .map((v: string) => v.trim())
              .filter(Boolean)
          : Array.isArray(store.tags)
          ? store.tags
          : [];

      const lat =
        store.lat !== "" && store.lat !== null && !Number.isNaN(Number(store.lat))
          ? Number(store.lat)
          : null;

      const lng =
        store.lng !== "" && store.lng !== null && !Number.isNaN(Number(store.lng))
          ? Number(store.lng)
          : null;

      const social_links = cleanObject({
        instagram: store.instagram,
        facebook: store.facebook,
        tiktok: store.tiktok,
        maps: store.maps,
        website: store.website,
        ...(store.social_links || {}),
      });

      const payload: any = {
        name: store.name,
        store_type: store.store_type || "PRODUCT",
        description: store.description || null,

        category: categoryForSave,
        subcategory: store.subcategory || null,
        tags: tagsArray,

        phone: store.phone || null,
        whatsapp: store.whatsapp || null,
        email: store.email || null,
        website: store.website || null,

        social_links,

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

        // ✅ week enable/disable
        hours: weekEnabled ? serializeHours(openingHours) : [],

        is_active: !!store.is_active,
        is_featured: !!store.is_featured,

        // ✅ Updated images (matching add page structure)
        logo_url: finalLogoUrl || null,
        cover_image_url: finalCoverUrl || null,
        cover_media_url: finalCoverUrl || null, // Also set cover_media_url for consistency
        cover_media_type: coverMediaType,
        gallery_urls: finalGalleryUrls,
      };

      const { error } = await supabaseBrowser
        .from("stores")
        .update(payload)
        .eq("id", id);

      if (error) {
        showToast({
          type: "error",
          title: "Update failed",
          description: error.message,
        });
        setSaving(false);
        return;
      }

      const categoriesPayload = await Promise.all(
        catalogueApi.catalogueCategories
          .filter((category) => category.enabled && category.title.trim())
          .map(async (category, categoryIndex) => ({
            id: category.persistedId,
            clientId: category.id,
            title: category.title.trim(),
            starting_from: category.starting_from ? Number(category.starting_from) : null,
            enabled: true,
            sort_order: category.sort_order ? Number(category.sort_order) : categoryIndex,
            items: (
              await Promise.all(
                category.items.map(async (item, itemIndex) => {
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
                    imageUrl = await uploadCatalogueImage(
                      String(id),
                      category.persistedId || category.id,
                      item.persistedId || item.id,
                      item.imageFile
                    );
                  }

                  return {
                    id: item.persistedId,
                    clientId: item.id,
                    title,
                    description: item.description?.trim() || null,
                    price: item.price ? Number(item.price) : null,
                    image_url: imageUrl,
                    sku: item.sku?.trim() || null,
                    sort_order: item.sort_order ? Number(item.sort_order) : itemIndex,
                    is_available: !!item.is_available,
                    item_type: item.item_type,
                    is_billable: !!item.is_billable,
                    duration_minutes: item.duration_minutes ? Number(item.duration_minutes) : null,
                    supports_slot_booking: !!item.supports_slot_booking,
                  };
                })
              )
            ).filter(
              (item): item is Exclude<typeof item, null> => item !== null
            ),
          }))
      );

      await syncStoreCatalogueAdmin({
        storeId: String(id),
        categories: categoriesPayload,
        deletedCategoryIds: catalogueApi.deletedCategoryIds,
        deletedItemIds: catalogueApi.deletedItemIds,
      });

      const refreshedCatalogue = await fetchStoreCatalogueAdmin(String(id));
      const mappedCatalogue: CatalogueCategoryDraft[] = refreshedCatalogue.map((category) => ({
        id: category.id || `cat_${Date.now()}`,
        persistedId: category.id,
        enabled: category.enabled,
        title: category.title,
        starting_from:
          category.starting_from === null || category.starting_from === undefined
            ? ""
            : String(category.starting_from),
        sort_order: String(category.sort_order ?? 0),
        expanded: false,
        items: category.items.map((item) => ({
          id: item.id || `item_${Date.now()}`,
          persistedId: item.id,
          title: item.title,
          price: item.price === null || item.price === undefined ? "" : String(item.price),
          sku: item.sku || "",
          description: item.description || "",
          is_available: item.is_available,
          sort_order: String(item.sort_order ?? 0),
          item_type: item.item_type,
          is_billable: item.is_billable,
          duration_minutes:
            item.duration_minutes === null || item.duration_minutes === undefined
              ? ""
              : String(item.duration_minutes),
          supports_slot_booking: item.supports_slot_booking,
          imageFile: null,
          imageUrl: item.image_url || null,
        })),
      }));

      showToast({ type: "success", title: "Store updated" });
      setEditMode(false);

      // ✅ Refresh originals and reset image state
      const merged = {
        ...store,
        ...payload,
        tags: payload.tags,
        hours: payload.hours,
        social_links: payload.social_links,
        lat: payload.lat,
        lng: payload.lng,
        logo_url: finalLogoUrl,
        cover_image_url: finalCoverUrl,
        cover_media_url: finalCoverUrl,
        cover_media_type: coverMediaType,
        gallery_urls: finalGalleryUrls,
      };
      setStore(merged);
      setStoreOriginal(merged);
      
      // Log the saved cover image URL for debugging
      console.log("✅ Store saved successfully. Cover Image URL:", finalCoverUrl);
      console.log("✅ Cover Media URL:", finalCoverUrl);
      console.log("✅ Cover Media Type:", coverMediaType);
      
      catalogueApi.replaceCatalogue(mappedCatalogue);
      catalogueApi.clearDeletedTracking();
      setCatalogueOriginal(mappedCatalogue);
      setOpeningHoursOriginal(openingHours);
      setLogoToAdd(null);
      setCoverToAdd(null);
      setGalleryToAdd([]);
      setLogoToDelete(false);
      setCoverToDelete(false);
      
      // Verify data was persisted by fetching fresh from Supabase
      setTimeout(() => {
        refreshStoreData();
      }, 500);
      setGalleryToDelete([]);

      setSaving(false);
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Failed to update store",
        description: err.message,
      });
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
              onChange={(e) => setStore({ ...store, tags: e.target.value })}
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
              onChange={(e) => setStore({ ...store, lat: e.target.value })}
            />
          </Field>

          <Field label="Longitude">
            <Input
              className={inputClass}
              disabled={!editMode}
              value={store.lng ?? ""}
              onChange={(e) => setStore({ ...store, lng: e.target.value })}
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

      {/* ✅ WEEK ENABLE / DISABLE */}
      <Section title="Weekly Schedule">
        <div className="flex items-center gap-4">
          <span className="text-sm">Enable opening hours for this week</span>
          <Switch
            checked={weekEnabled}
            disabled={!editMode}
            onCheckedChange={setWeekEnabled}
            className="data-[state=unchecked]:bg-rose-500 data-[state=checked]:bg-blue-600"
          />
          <span
            className={`text-sm font-medium ${weekEnabled ? "text-blue-700" : "text-rose-600"}`}
          >
            {weekEnabled ? "Open" : "Closed"}
          </span>
        </div>
        {!weekEnabled && (
          <p className="text-xs text-gray-500">
            Week disabled: hours will be saved as empty (store closed for the week).
          </p>
        )}
      </Section>

      {/* OPENING HOURS */}
      <Section title="Opening Hours">
        {DAYS.map((day) => (
          <div key={day} className="space-y-3 rounded-md border border-gray-200 p-4 mb-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{day}</span>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  disabled={!editMode || !weekEnabled}
                  checked={!!openingHours[day]?.closed}
                  onChange={(e) =>
                    setOpeningHours((prev) => ({
                      ...prev,
                      [day]: {
                        ...prev[day],
                        closed: e.target.checked,
                        open: e.target.checked ? "" : (prev[day]?.open || ""),
                        close: e.target.checked ? "" : (prev[day]?.close || ""),
                      },
                    }))
                  }
                />
                <span className="text-sm text-gray-600">Closed</span>
              </div>
            </div>

            {!openingHours[day]?.closed && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  disabled={!editMode || !weekEnabled}
                  className="border rounded-md px-3 py-2 text-sm bg-white disabled:bg-gray-100"
                  value={openingHours[day]?.open || ""}
                  onChange={(e) =>
                    setOpeningHours((prev) => ({
                      ...prev,
                      [day]: { ...prev[day], open: e.target.value },
                    }))
                  }
                >
                  <option value="">Open</option>
                  {HOUR_OPTIONS.map((t) => (
                    <option key={`${day}-open-${t}`} value={t}>
                      {t}
                    </option>
                  ))}
                </select>

                <select
                  disabled={!editMode || !weekEnabled}
                  className="border rounded-md px-3 py-2 text-sm bg-white disabled:bg-gray-100"
                  value={openingHours[day]?.close || ""}
                  onChange={(e) =>
                    setOpeningHours((prev) => ({
                      ...prev,
                      [day]: { ...prev[day], close: e.target.value },
                    }))
                  }
                >
                  <option value="">Close</option>
                  {HOUR_OPTIONS.map((t) => (
                    <option key={`${day}-close-${t}`} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ))}
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

      <CatalogueSection
        openSection={catalogueOpenSection}
        onToggle={(next) =>
          setCatalogueOpenSection((current) => (current === next ? null : next))
        }
        preserveScroll={(fn) => fn()}
        storeType={(store.store_type as "PRODUCT" | "SERVICE") || "PRODUCT"}
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

const Section = ({ title, children }: any) => (
  <section className="space-y-4">
    <h2 className="text-lg font-semibold">{title}</h2>
    {children}
  </section>
);

const Field = ({ label, children }: any) => (
  <div className="space-y-1">
    <label className="text-xs text-gray-500 uppercase">{label}</label>
    {children}
  </div>
);

const Grid = ({ children }: any) => (
  <div className="grid grid-cols-2 gap-6">{children}</div>
);

const ReadOnly = ({ label, value }: any) => (
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
}) => (
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
}) => (
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

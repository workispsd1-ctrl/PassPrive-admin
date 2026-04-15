import { supabaseBrowser } from "@/lib/supabaseBrowser";

export const STORE_STORAGE_BUCKET = "stores";

export const STORE_DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type StoreDayName = (typeof STORE_DAY_NAMES)[number];

export type StoreDayHours = {
  open: string;
  close: string;
  closed: boolean;
};

export type StoreOfferInput = {
  title?: string | null;
  description?: string | null;
  badge_text?: string | null;
  offer_type?: string | null;
  discount_value?: number | null;
  min_spend?: number | null;
  start_at?: string | null;
  end_at?: string | null;
  is_active?: boolean;
  metadata?: Record<string, unknown> | null;
};

export type StoreSubscriptionInput = {
  plan_code?: string | null;
  status?: string | null;
  pickup_premium_enabled?: boolean;
  starts_at?: string | null;
  expires_at?: string | null;
};

export type StorePaymentDetailsInput = {
  legal_business_name?: string | null;
  display_name_on_invoice?: string | null;
  payout_method?: string | null;
  beneficiary_name?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  ifsc?: string | null;
  iban?: string | null;
  swift?: string | null;
  payout_upi_id?: string | null;
  settlement_cycle?: string | null;
  commission_percent?: number | null;
  currency?: string | null;
  tax_id_label?: string | null;
  tax_id_value?: string | null;
  billing_email?: string | null;
  billing_phone?: string | null;
  kyc_status?: string | null;
  notes?: string | null;
  payment_details?: Record<string, unknown> | null;
};

export type StoreFlatRecord = Record<string, unknown> & {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  location_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  postal_code: string | null;
  full_address: string | null;
  lat: number | null;
  lng: number | null;
  google_place_id: string | null;
  logo_url: string | null;
  cover_image: string | null;
  owner_user_id: string | null;
  created_by: string | null;
  is_featured: boolean;
  is_active: boolean;
  is_top_brand: boolean;
  sort_order: number | null;
  store_type: string | null;
  booking_enabled: boolean;
  avg_duration_minutes: number | null;
  max_bookings_per_slot: number | null;
  advance_booking_days: number | null;
  modification_available: boolean;
  modification_cutoff_minutes: number | null;
  cancellation_available: boolean;
  cancellation_cutoff_minutes: number | null;
  cover_charge_enabled: boolean;
  cover_charge_amount: number | null;
  booking_terms: string[] | null;
  pickup_basic_enabled: boolean;
  pickup_mode: string | null;
  supports_time_slots: boolean;
  slot_duration_minutes: number | null;
  slot_buffer_minutes: number | null;
  slot_advance_days: number | null;
  slot_max_per_window: number | null;
  is_advertised: boolean;
  ad_priority: number | null;
  ad_starts_at: string | null;
  ad_ends_at: string | null;
  ad_badge_text: string | null;
  created_at: string | null;
  updated_at: string | null;
  tags: string[];
  facilities: string[];
  highlights: string[];
  worth_visit: string[];
  mood_tags: string[];
  social_links: Record<string, string>;
  hours: Array<{ day: string; closed: boolean; slots: Array<{ open: string; close: string }> }>;
  opening_hours: Record<string, StoreDayHours>;
  offers: StoreOfferInput[];
  subscription: StoreSubscriptionInput | null;
  payment_details: StorePaymentDetailsInput | null;
  gallery_urls: string[];
  cover_image_url: string | null;
  cover_media_url: string | null;
  cover_media_type: "image" | "video" | null;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  maps?: string;
};

type DatabaseRow = Record<string, unknown>;

type NormalizeParams = {
  store: DatabaseRow;
  tags?: DatabaseRow[];
  socialLinks?: DatabaseRow[];
  openingHours?: DatabaseRow[];
  media?: DatabaseRow[];
  offers?: DatabaseRow[];
  subscriptions?: DatabaseRow[];
  paymentDetails?: DatabaseRow | null;
};

type StoreRelationsInput = {
  tags?: string[];
  facilities?: string[];
  highlights?: string[];
  worth_visit?: string[];
  mood_tags?: string[];
  social_links?: Record<string, string | null | undefined>;
  opening_hours?: Record<string, StoreDayHours>;
  offers?: StoreOfferInput[];
  subscription?: StoreSubscriptionInput | null;
  payment_details?: StorePaymentDetailsInput | null;
  gallery_urls?: string[];
  logo_url?: string | null;
  cover_image_url?: string | null;
  cover_video_url?: string | null;
};

type StoreAssetType = "logo" | "cover" | "gallery";

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/^"+|"+$/g, "");
  return trimmed ? trimmed : null;
}

function inferStorageBucket(value?: string | null) {
  if (!value) return STORE_STORAGE_BUCKET;

  const publicUrlMatch = value.match(/\/storage\/v1\/object\/public\/([^/]+)\//i);
  if (publicUrlMatch?.[1]) return publicUrlMatch[1];

  const normalized = value.replace(/^\/+/, "");
  const [firstSegment] = normalized.split("/");
  if (!firstSegment) return STORE_STORAGE_BUCKET;

  const knownBuckets = new Set([
    STORE_STORAGE_BUCKET,
    "store",
    "stores",
    "restaurant",
    "restaurants",
  ]);

  return knownBuckets.has(firstSegment) ? firstSegment : STORE_STORAGE_BUCKET;
}

function buildStorePublicUrl(path: string, bucketHint?: string | null) {
  const bucket = inferStorageBucket(bucketHint || path);
  const normalizedPath = path
    .replace(/^\/+/, "")
    .replace(/^storage\/v1\/object\/public\/[^/]+\//, "")
    .replace(new RegExp(`^${bucket}/`), "");

  const { data } = supabaseBrowser.storage.from(bucket).getPublicUrl(normalizedPath);
  return data.publicUrl || null;
}

function resolveStoreMediaUrl(value: unknown, filePath?: unknown): string | null {
  const directValue = asString(value);
  const normalizedFilePath = asString(filePath);

  // Prefer the stored object path over any persisted public URL so stale URLs do not win.
  if (normalizedFilePath) {
    return buildStorePublicUrl(normalizedFilePath, directValue || normalizedFilePath);
  }

  if (directValue?.startsWith("http://") || directValue?.startsWith("https://")) {
    return directValue;
  }

  const path = directValue;
  if (!path) return null;
  return buildStorePublicUrl(path, directValue || path);
}

export function extractStoreStoragePath(publicUrl: string): string | null {
  if (!publicUrl) return null;

  const objectPublicMatch = publicUrl.match(/\/object\/public\/[^/]+\/(.+)$/);
  if (objectPublicMatch?.[1]) return objectPublicMatch[1];

  const bucketMatch = publicUrl.match(/\/stores\/(.+)$/);
  return bucketMatch?.[1] ?? null;
}

export function buildStoreStoragePath(
  storeId: string,
  assetType: StoreAssetType,
  fileName: string
) {
  const extension = fileName.split(".").pop() || "jpg";
  const random = Math.random().toString(36).slice(2, 9);
  return `${assetType}/${storeId}/${Date.now()}-${random}.${extension}`;
}

export async function uploadStoreImages(
  storeId: string,
  files: File[],
  assetType: StoreAssetType
) {
  const urls: string[] = new Array(files.length).fill("");
  const uploadedPaths: string[] = [];

  try {
    const batchSize = 3;
    for (let index = 0; index < files.length; index += batchSize) {
      const batch = files.slice(index, index + batchSize);
      await Promise.all(
        batch.map(async (file, batchIndex) => {
          const fileIndex = index + batchIndex;
          const path = buildStoreStoragePath(storeId, assetType, file.name);

          const { error } = await supabaseBrowser.storage
            .from(STORE_STORAGE_BUCKET)
            .upload(path, file);

          if (error) throw error;
          uploadedPaths.push(path);

          const { data } = supabaseBrowser.storage
            .from(STORE_STORAGE_BUCKET)
            .getPublicUrl(path);

          urls[fileIndex] = data.publicUrl;
        })
      );
    }

    return urls.filter(Boolean);
  } catch (error) {
    if (uploadedPaths.length > 0) {
      const { error: cleanupError } = await supabaseBrowser.storage
        .from(STORE_STORAGE_BUCKET)
        .remove(uploadedPaths);

      if (cleanupError) {
        console.error("[storeAdmin] cleanup upload error", cleanupError);
      }
    }

    throw error;
  }
}

export async function deleteStoreImages(publicUrls: string[]) {
  const paths = publicUrls
    .map((url) => extractStoreStoragePath(url))
    .filter((value): value is string => Boolean(value));

  if (!paths.length) return;

  const { error } = await supabaseBrowser.storage
    .from(STORE_STORAGE_BUCKET)
    .remove(paths);

  if (error) throw error;
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => asString(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function hasValue(value: unknown) {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function emptyOpeningHours(): Record<string, StoreDayHours> {
  return STORE_DAY_NAMES.reduce<Record<string, StoreDayHours>>((accumulator, day) => {
    const value = { open: "", close: "", closed: false };
    accumulator[day] = value;
    accumulator[day.toLowerCase()] = value;
    return accumulator;
  }, {});
}

function dayNameFromValue(dayOfWeek: unknown): StoreDayName | null {
  if (typeof dayOfWeek === "string") {
    const normalized = dayOfWeek.trim().toLowerCase();
    const match = STORE_DAY_NAMES.find((day) => day.toLowerCase() === normalized);
    if (match) return match;
  }

  if (typeof dayOfWeek === "number" && Number.isFinite(dayOfWeek)) {
    if (dayOfWeek === 0) return "Sunday";
    if (dayOfWeek >= 1 && dayOfWeek <= 6) return STORE_DAY_NAMES[dayOfWeek - 1];
    if (dayOfWeek === 7) return "Sunday";
  }

  return null;
}

function dayValueFromName(dayName: string): number | null {
  const normalized = dayName.trim().toLowerCase();
  if (normalized === "sunday") return 0;
  const index = STORE_DAY_NAMES.findIndex((day) => day.toLowerCase() === normalized);
  if (index === -1) return null;
  return index + 1;
}

function normalizeOpeningHours(rows: DatabaseRow[]): Record<string, StoreDayHours> {
  const result = emptyOpeningHours();
  for (const row of rows || []) {
    const dayName = dayNameFromValue(row.day_of_week);
    if (!dayName) continue;

    const hours: StoreDayHours = {
      open: asString(row.open_time) ?? "",
      close: asString(row.close_time) ?? "",
      closed: asBoolean(row.is_closed),
    };

    result[dayName] = hours;
    result[dayName.toLowerCase()] = hours;
  }
  return result;
}

function serializeOpeningHoursForUi(openingHours: Record<string, StoreDayHours>) {
  return STORE_DAY_NAMES.map((day) => {
    const row = openingHours[day] || openingHours[day.toLowerCase()] || {
      open: "",
      close: "",
      closed: false,
    };
    const closed = !!row.closed || (!row.open && !row.close);
    return {
      day,
      closed,
      slots: closed ? [] : [{ open: row.open, close: row.close }],
    };
  });
}

function tagsByType(rows: DatabaseRow[], tagType: string) {
  return rows
    .filter((row) => asString(row.tag_type) === tagType)
    .sort((left, right) => (asNumber(left.sort_order) ?? 0) - (asNumber(right.sort_order) ?? 0))
    .map((row) => asString(row.tag_value))
    .filter((value): value is string => Boolean(value));
}

function normalizeSocialLinks(rows: DatabaseRow[]) {
  const result: Record<string, string> = {};
  for (const row of rows || []) {
    const platform = asString(row.platform);
    const url = asString(row.url);
    if (!platform || !url) continue;
    result[platform] = url;
  }
  return result;
}

function normalizeOffers(rows: DatabaseRow[]): StoreOfferInput[] {
  return (rows || [])
    .map((row) => ({
      title: asString(row.title),
      description: asString(row.description),
      badge_text: asString(row.badge_text),
      offer_type: asString(row.offer_type),
      discount_value: asNumber(row.discount_value),
      min_spend: asNumber(row.min_spend),
      start_at: asString(row.start_at),
      end_at: asString(row.end_at),
      is_active: asBoolean(row.is_active, true),
      metadata:
        row.metadata && typeof row.metadata === "object"
          ? (row.metadata as Record<string, unknown>)
          : null,
    }))
    .filter((offer) => hasValue(offer.title));
}

function normalizeSubscription(rows: DatabaseRow[]): StoreSubscriptionInput | null {
  const [row] = rows || [];
  if (!row) return null;
  return {
    plan_code: asString(row.plan_code),
    status: asString(row.status),
    pickup_premium_enabled: asBoolean(row.pickup_premium_enabled),
    starts_at: asString(row.starts_at),
    expires_at: asString(row.expires_at),
  };
}

function normalizePaymentDetails(row?: DatabaseRow | null): StorePaymentDetailsInput | null {
  if (!row) return null;

  return {
    legal_business_name: asString(row.legal_business_name),
    display_name_on_invoice: asString(row.display_name_on_invoice),
    payout_method: asString(row.payout_method),
    beneficiary_name: asString(row.beneficiary_name),
    bank_name: asString(row.bank_name),
    account_number: asString(row.account_number),
    ifsc: asString(row.ifsc),
    iban: asString(row.iban),
    swift: asString(row.swift),
    payout_upi_id: asString(row.payout_upi_id),
    settlement_cycle: asString(row.settlement_cycle),
    commission_percent: asNumber(row.commission_percent),
    currency: asString(row.currency),
    tax_id_label: asString(row.tax_id_label),
    tax_id_value: asString(row.tax_id_value),
    billing_email: asString(row.billing_email),
    billing_phone: asString(row.billing_phone),
    kyc_status: asString(row.kyc_status),
    notes: asString(row.notes),
    payment_details:
      row.payment_details && typeof row.payment_details === "object"
        ? (row.payment_details as Record<string, unknown>)
        : null,
  };
}

function normalizeMedia(rows: DatabaseRow[]) {
  const sorted = [...(rows || [])].sort(
    (left, right) => (asNumber(left.sort_order) ?? 0) - (asNumber(right.sort_order) ?? 0)
  );
  const activeRows = sorted.filter((row) => asBoolean(row.is_active, true));
  const byType = (type: string) =>
    activeRows
      .filter((row) => asString(row.asset_type) === type && asBoolean(row.is_active, true))
      .map((row) => resolveStoreMediaUrl(row.file_url, row.file_path))
      .filter((value): value is string => Boolean(value));

  const fallbackImageAssets = ["gallery", "ambience", "food", "menu"];
  const fallbackImages = fallbackImageAssets.flatMap((type) => byType(type));
  const logo = byType("logo")[0] ?? fallbackImages[0] ?? null;
  const coverImage = byType("cover_image")[0] ?? fallbackImages[0] ?? null;
  const coverVideo = byType("cover_video")[0] ?? null;
  const gallery = Array.from(new Set(fallbackImages));

  return {
    logo,
    coverImage,
    coverVideo,
    gallery,
  };
}

function buildFullAddress(store: {
  location_name?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  postal_code?: string | null;
}) {
  const parts = [
    store.location_name,
    store.address_line1,
    store.address_line2,
    store.city,
    store.region,
    store.country,
    store.postal_code,
  ]
    .map((part) => (typeof part === "string" ? part.trim() : part))
    .filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function normalizeStore({
  store,
  tags = [],
  socialLinks = [],
  openingHours = [],
  media = [],
  offers = [],
  subscriptions = [],
  paymentDetails = null,
}: NormalizeParams): StoreFlatRecord {
  const normalizedOpeningHours = normalizeOpeningHours(openingHours);
  const normalizedSocialLinks = normalizeSocialLinks(socialLinks);
  const normalizedMedia = normalizeMedia(media);
  const directLogo = resolveStoreMediaUrl(store.logo_url);
  const directCoverImage = resolveStoreMediaUrl(store.cover_image);
  const logoUrl = normalizedMedia.logo || directLogo;
  const coverImageUrl = normalizedMedia.coverImage || directCoverImage;
  const coverMediaUrl = normalizedMedia.coverVideo || coverImageUrl;
  const coverMediaType = normalizedMedia.coverVideo ? "video" : coverImageUrl ? "image" : null;

  return {
    id: String(store.id),
    name: asString(store.name) ?? "",
    slug: asString(store.slug),
    description: asString(store.description),
    category: asString(store.category),
    subcategory: asString(store.subcategory),
    phone: asString(store.phone),
    whatsapp: asString(store.whatsapp),
    email: asString(store.email),
    website: asString(store.website),
    location_name: asString(store.location_name),
    address_line1: asString(store.address_line1),
    address_line2: asString(store.address_line2),
    city: asString(store.city),
    region: asString(store.region),
    country: asString(store.country),
    postal_code: asString(store.postal_code),
    full_address: asString(store.full_address) ?? buildFullAddress({
      location_name: asString(store.location_name),
      address_line1: asString(store.address_line1),
      address_line2: asString(store.address_line2),
      city: asString(store.city),
      region: asString(store.region),
      country: asString(store.country),
      postal_code: asString(store.postal_code),
    }),
    lat: asNumber(store.lat),
    lng: asNumber(store.lng),
    google_place_id: asString(store.google_place_id),
    logo_url: logoUrl,
    cover_image: directCoverImage,
    owner_user_id: asString(store.owner_user_id),
    created_by: asString(store.created_by),
    is_featured: asBoolean(store.is_featured),
    is_active: asBoolean(store.is_active, true),
    is_top_brand: asBoolean(store.is_top_brand),
    sort_order: asNumber(store.sort_order),
    store_type: asString(store.store_type),
    booking_enabled: asBoolean(store.booking_enabled),
    avg_duration_minutes: asNumber(store.avg_duration_minutes),
    max_bookings_per_slot: asNumber(store.max_bookings_per_slot),
    advance_booking_days: asNumber(store.advance_booking_days),
    modification_available: asBoolean(store.modification_available),
    modification_cutoff_minutes: asNumber(store.modification_cutoff_minutes),
    cancellation_available: asBoolean(store.cancellation_available),
    cancellation_cutoff_minutes: asNumber(store.cancellation_cutoff_minutes),
    cover_charge_enabled: asBoolean(store.cover_charge_enabled),
    cover_charge_amount: asNumber(store.cover_charge_amount),
    booking_terms: asStringArray(store.booking_terms),
    pickup_basic_enabled: asBoolean(store.pickup_basic_enabled),
    pickup_mode: asString(store.pickup_mode),
    supports_time_slots: asBoolean(store.supports_time_slots),
    slot_duration_minutes: asNumber(store.slot_duration_minutes),
    slot_buffer_minutes: asNumber(store.slot_buffer_minutes),
    slot_advance_days: asNumber(store.slot_advance_days),
    slot_max_per_window: asNumber(store.slot_max_per_window),
    is_advertised: asBoolean(store.is_advertised),
    ad_priority: asNumber(store.ad_priority),
    ad_starts_at: asString(store.ad_starts_at),
    ad_ends_at: asString(store.ad_ends_at),
    ad_badge_text: asString(store.ad_badge_text),
    created_at: asString(store.created_at),
    updated_at: asString(store.updated_at),
    tags: tagsByType(tags, "tag"),
    facilities: tagsByType(tags, "facility"),
    highlights: tagsByType(tags, "highlight"),
    worth_visit: tagsByType(tags, "worth_visit"),
    mood_tags: tagsByType(tags, "mood"),
    social_links: normalizedSocialLinks,
    hours: serializeOpeningHoursForUi(normalizedOpeningHours),
    opening_hours: normalizedOpeningHours,
    offers: normalizeOffers(offers),
    subscription: normalizeSubscription(subscriptions),
    payment_details: normalizePaymentDetails(paymentDetails),
    gallery_urls: normalizedMedia.gallery,
    cover_image_url: coverImageUrl,
    cover_media_url: coverMediaUrl,
    cover_media_type: coverMediaType,
    instagram: normalizedSocialLinks.instagram,
    facebook: normalizedSocialLinks.facebook,
    tiktok: normalizedSocialLinks.tiktok,
    maps: normalizedSocialLinks.maps,
  };
}

export async function fetchStoreDetail(storeId: string) {
  const [
    storeResult,
    tagsResult,
    socialResult,
    openingHoursResult,
    mediaResult,
    offersResult,
    subscriptionsResult,
    paymentDetailsResult,
  ] =
    await Promise.all([
      supabaseBrowser.from("stores").select("*").eq("id", storeId).single(),
      supabaseBrowser.from("store_tags").select("*").eq("store_id", storeId),
      supabaseBrowser.from("store_social_links").select("*").eq("store_id", storeId),
      supabaseBrowser.from("store_opening_hours").select("*").eq("store_id", storeId),
      supabaseBrowser.from("store_media_assets").select("*").eq("store_id", storeId),
      supabaseBrowser.from("store_offers").select("*").eq("store_id", storeId),
      supabaseBrowser.from("store_subscriptions").select("*").eq("store_id", storeId),
      supabaseBrowser
        .from("store_payment_details")
        .select("*")
        .eq("store_id", storeId)
        .maybeSingle(),
    ]);

  if (storeResult.error) throw storeResult.error;
  if (!storeResult.data) throw new Error("Store not found");
  if (tagsResult.error) throw tagsResult.error;
  if (socialResult.error) throw socialResult.error;
  if (openingHoursResult.error) throw openingHoursResult.error;
  if (mediaResult.error) throw mediaResult.error;
  if (offersResult.error) throw offersResult.error;
  if (subscriptionsResult.error) throw subscriptionsResult.error;
  if (paymentDetailsResult.error) throw paymentDetailsResult.error;

  return normalizeStore({
    store: storeResult.data,
    tags: tagsResult.data || [],
    socialLinks: socialResult.data || [],
    openingHours: openingHoursResult.data || [],
    media: mediaResult.data || [],
    offers: offersResult.data || [],
    subscriptions: subscriptionsResult.data || [],
    paymentDetails: paymentDetailsResult.data,
  });
}

export function buildStorePayload(store: Partial<StoreFlatRecord> & Record<string, unknown>) {
  const payload: Record<string, unknown> = {};
  const assign = (key: string, value: unknown) => {
    if (!hasValue(value) && typeof value !== "boolean") return;
    payload[key] = value;
  };

  assign("id", store.id);
  assign("name", asString(store.name));
  assign("slug", asString(store.slug));
  assign("description", asString(store.description));
  assign("category", asString(store.category));
  assign("subcategory", asString(store.subcategory));
  assign("phone", asString(store.phone));
  assign("whatsapp", asString(store.whatsapp));
  assign("email", asString(store.email));
  assign("website", asString(store.website));
  assign("location_name", asString(store.location_name));
  assign("address_line1", asString(store.address_line1));
  assign("address_line2", asString(store.address_line2));
  assign("city", asString(store.city));
  assign("region", asString(store.region));
  assign("country", asString(store.country));
  assign("postal_code", asString(store.postal_code));
  assign("full_address", buildFullAddress(store));
  assign("lat", asNumber(store.lat));
  assign("lng", asNumber(store.lng));
  assign("google_place_id", asString(store.google_place_id));
  assign("logo_url", asString(store.logo_url));
  assign("cover_image", asString(store.cover_image));
  assign("owner_user_id", asString(store.owner_user_id));
  assign("created_by", asString(store.created_by));
  assign("is_featured", typeof store.is_featured === "boolean" ? store.is_featured : undefined);
  assign("is_active", typeof store.is_active === "boolean" ? store.is_active : undefined);
  assign("is_top_brand", typeof store.is_top_brand === "boolean" ? store.is_top_brand : undefined);
  assign("sort_order", asNumber(store.sort_order));
  assign("store_type", asString(store.store_type));
  assign("booking_enabled", typeof store.booking_enabled === "boolean" ? store.booking_enabled : undefined);
  assign("avg_duration_minutes", asNumber(store.avg_duration_minutes));
  assign("max_bookings_per_slot", asNumber(store.max_bookings_per_slot));
  assign("advance_booking_days", asNumber(store.advance_booking_days));
  assign(
    "modification_available",
    typeof store.modification_available === "boolean" ? store.modification_available : undefined
  );
  assign("modification_cutoff_minutes", asNumber(store.modification_cutoff_minutes));
  assign(
    "cancellation_available",
    typeof store.cancellation_available === "boolean" ? store.cancellation_available : undefined
  );
  assign("cancellation_cutoff_minutes", asNumber(store.cancellation_cutoff_minutes));
  assign(
    "cover_charge_enabled",
    typeof store.cover_charge_enabled === "boolean" ? store.cover_charge_enabled : undefined
  );
  assign("cover_charge_amount", asNumber(store.cover_charge_amount));
  if (Array.isArray(store.booking_terms)) payload.booking_terms = asStringArray(store.booking_terms);
  assign(
    "pickup_basic_enabled",
    typeof store.pickup_basic_enabled === "boolean" ? store.pickup_basic_enabled : undefined
  );
  assign("pickup_mode", asString(store.pickup_mode));
  assign(
    "supports_time_slots",
    typeof store.supports_time_slots === "boolean" ? store.supports_time_slots : undefined
  );
  assign("slot_duration_minutes", asNumber(store.slot_duration_minutes));
  assign("slot_buffer_minutes", asNumber(store.slot_buffer_minutes));
  assign("slot_advance_days", asNumber(store.slot_advance_days));
  assign("slot_max_per_window", asNumber(store.slot_max_per_window));
  assign("is_advertised", typeof store.is_advertised === "boolean" ? store.is_advertised : undefined);
  assign("ad_priority", asNumber(store.ad_priority));
  assign("ad_starts_at", asString(store.ad_starts_at));
  assign("ad_ends_at", asString(store.ad_ends_at));
  assign("ad_badge_text", asString(store.ad_badge_text));

  return payload;
}

function buildStoreTagRows(storeId: string, input: StoreRelationsInput) {
  const groups = [
    { type: "tag", values: input.tags || [] },
    { type: "facility", values: input.facilities || [] },
    { type: "highlight", values: input.highlights || [] },
    { type: "worth_visit", values: input.worth_visit || [] },
    { type: "mood", values: input.mood_tags || [] },
  ];

  return groups.flatMap((group) =>
    group.values
      .map((value) => asString(value))
      .filter((value): value is string => Boolean(value))
      .map((value, index) => ({
        store_id: storeId,
        tag_type: group.type,
        tag_value: value,
        sort_order: index,
      }))
  );
}

function buildStoreSocialRows(storeId: string, socialLinks: StoreRelationsInput["social_links"]) {
  return Object.entries(socialLinks || {})
    .map(([platform, url]) => ({ platform: asString(platform), url: asString(url) }))
    .filter((entry): entry is { platform: string; url: string } => Boolean(entry.platform && entry.url))
    .map((entry, index) => ({
      store_id: storeId,
      platform: entry.platform,
      url: entry.url,
      sort_order: index,
    }));
}

function buildStoreOpeningHoursRows(
  storeId: string,
  openingHours: StoreRelationsInput["opening_hours"]
) {
  return STORE_DAY_NAMES.map((day) => {
    const value = openingHours?.[day] || openingHours?.[day.toLowerCase()] || {
      open: "",
      close: "",
      closed: false,
    };

    return {
      store_id: storeId,
      day_of_week: dayValueFromName(day),
      open_time: value.closed ? null : asString(value.open),
      close_time: value.closed ? null : asString(value.close),
      is_closed: Boolean(value.closed || (!value.open && !value.close)),
    };
  }).filter((row) => row.day_of_week !== null);
}

function buildStoreOfferRows(storeId: string, offers: StoreRelationsInput["offers"]) {
  return (offers || [])
    .filter((offer) => hasValue(offer?.title))
    .map((offer) => ({
      store_id: storeId,
      title: asString(offer.title),
      description: asString(offer.description),
      badge_text: asString(offer.badge_text),
      offer_type: asString(offer.offer_type),
      discount_value: asNumber(offer.discount_value),
      min_spend: asNumber(offer.min_spend),
      start_at: asString(offer.start_at),
      end_at: asString(offer.end_at),
      is_active: offer.is_active !== false,
      metadata: offer.metadata && typeof offer.metadata === "object" ? offer.metadata : null,
    }));
}

function buildStoreSubscriptionRows(
  storeId: string,
  subscription: StoreRelationsInput["subscription"]
) {
  if (!subscription || !hasValue(subscription.plan_code)) return [];

  return [
    {
      store_id: storeId,
      plan_code: asString(subscription.plan_code),
      status: asString(subscription.status),
      pickup_premium_enabled: Boolean(subscription.pickup_premium_enabled),
      starts_at: asString(subscription.starts_at),
      expires_at: asString(subscription.expires_at),
    },
  ];
}

function buildStoreMediaRows(storeId: string, input: StoreRelationsInput) {
  const createMediaRow = (
    assetType: "logo" | "cover_image" | "cover_video" | "gallery",
    value: string,
    sortOrder: number
  ) => {
    const filePath = extractStoreStoragePath(value) || asString(value);
    if (!filePath) return null;

    const canonicalUrl = buildStorePublicUrl(filePath, value) || value;
    const normalizedPath = extractStoreStoragePath(canonicalUrl) || filePath;

    if (!normalizedPath.includes(`/${storeId}/`)) {
      console.warn("[storeAdmin] media path does not match store id", {
        storeId,
        assetType,
        value,
        normalizedPath,
      });
    }

    return {
      store_id: storeId,
      asset_type: assetType,
      file_url: canonicalUrl,
      file_path: normalizedPath,
      sort_order: sortOrder,
      is_active: true,
    };
  };

  return [
    ...(input.logo_url
      ? [createMediaRow("logo", input.logo_url, 0)].filter(
          (row): row is NonNullable<ReturnType<typeof createMediaRow>> => Boolean(row)
        )
      : []),
    ...(input.cover_image_url
      ? [createMediaRow("cover_image", input.cover_image_url, 0)].filter(
          (row): row is NonNullable<ReturnType<typeof createMediaRow>> => Boolean(row)
        )
      : []),
    ...(input.cover_video_url
      ? [createMediaRow("cover_video", input.cover_video_url, 0)].filter(
          (row): row is NonNullable<ReturnType<typeof createMediaRow>> => Boolean(row)
        )
      : []),
    ...(input.gallery_urls || [])
      .map((url) => asString(url))
      .filter((url): url is string => Boolean(url))
      .map((url, index) => createMediaRow("gallery", url, index))
      .filter((row): row is NonNullable<ReturnType<typeof createMediaRow>> => Boolean(row)),
  ];
}

async function replaceStoreRows(table: string, storeId: string, rows: Record<string, unknown>[]) {
  const { error: deleteError } = await supabaseBrowser.from(table).delete().eq("store_id", storeId);
  if (deleteError) throw deleteError;
  if (!rows.length) return;

  const { error: insertError } = await supabaseBrowser.from(table).insert(rows);
  if (insertError) throw insertError;
}

function buildStorePaymentDetailsRow(
  storeId: string,
  paymentDetails: StoreRelationsInput["payment_details"]
) {
  if (!paymentDetails || !hasValue(paymentDetails.legal_business_name)) return null;

  return {
    store_id: storeId,
    legal_business_name: asString(paymentDetails.legal_business_name),
    display_name_on_invoice: asString(paymentDetails.display_name_on_invoice),
    payout_method: asString(paymentDetails.payout_method),
    beneficiary_name: asString(paymentDetails.beneficiary_name),
    bank_name: asString(paymentDetails.bank_name),
    account_number: asString(paymentDetails.account_number),
    ifsc: asString(paymentDetails.ifsc),
    iban: asString(paymentDetails.iban),
    swift: asString(paymentDetails.swift),
    payout_upi_id: asString(paymentDetails.payout_upi_id),
    settlement_cycle: asString(paymentDetails.settlement_cycle),
    commission_percent: asNumber(paymentDetails.commission_percent),
    currency: asString(paymentDetails.currency),
    tax_id_label: asString(paymentDetails.tax_id_label),
    tax_id_value: asString(paymentDetails.tax_id_value),
    billing_email: asString(paymentDetails.billing_email),
    billing_phone: asString(paymentDetails.billing_phone),
    kyc_status: asString(paymentDetails.kyc_status),
    notes: asString(paymentDetails.notes),
    payment_details:
      paymentDetails.payment_details && typeof paymentDetails.payment_details === "object"
        ? paymentDetails.payment_details
        : {},
  };
}

export async function upsertStorePaymentDetails(
  storeId: string,
  paymentDetails: StoreRelationsInput["payment_details"]
) {
  const row = buildStorePaymentDetailsRow(storeId, paymentDetails);
  if (!row) {
    const { error } = await supabaseBrowser
      .from("store_payment_details")
      .delete()
      .eq("store_id", storeId);
    if (error) throw error;
    return;
  }

  const { error } = await supabaseBrowser
    .from("store_payment_details")
    .upsert(row, { onConflict: "store_id" });

  if (error) throw error;
}

export async function upsertStoreMember(storeId: string, userId: string, role = "manager") {
  const { error } = await supabaseBrowser.from("store_members").upsert(
    {
      store_id: storeId,
      user_id: userId,
      role,
    },
    { onConflict: "store_id,user_id" }
  );

  if (error) throw error;
}

export async function replaceStoreRelations(storeId: string, input: StoreRelationsInput) {
  const tasks: Promise<void>[] = [];

  if ("tags" in input || "facilities" in input || "highlights" in input || "worth_visit" in input || "mood_tags" in input) {
    tasks.push(replaceStoreRows("store_tags", storeId, buildStoreTagRows(storeId, input)));
  }

  if ("social_links" in input) {
    tasks.push(
      replaceStoreRows("store_social_links", storeId, buildStoreSocialRows(storeId, input.social_links))
    );
  }

  if ("opening_hours" in input) {
    tasks.push(
      replaceStoreRows(
        "store_opening_hours",
        storeId,
        buildStoreOpeningHoursRows(storeId, input.opening_hours)
      )
    );
  }

  if ("offers" in input) {
    tasks.push(replaceStoreRows("store_offers", storeId, buildStoreOfferRows(storeId, input.offers)));
  }

  if ("subscription" in input) {
    tasks.push(
      replaceStoreRows(
        "store_subscriptions",
        storeId,
        buildStoreSubscriptionRows(storeId, input.subscription)
      )
    );
  }

  if ("gallery_urls" in input || "logo_url" in input || "cover_image_url" in input || "cover_video_url" in input) {
    tasks.push(replaceStoreRows("store_media_assets", storeId, buildStoreMediaRows(storeId, input)));
  }

  await Promise.all(tasks);
}

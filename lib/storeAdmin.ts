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
  gallery_urls?: string[];
  cover_video_url?: string | null;
};

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
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

function normalizeMedia(rows: DatabaseRow[]) {
  const sorted = [...(rows || [])].sort(
    (left, right) => (asNumber(left.sort_order) ?? 0) - (asNumber(right.sort_order) ?? 0)
  );
  const byType = (type: string) =>
    sorted
      .filter((row) => asString(row.asset_type) === type && asBoolean(row.is_active, true))
      .map((row) => asString(row.file_url))
      .filter((value): value is string => Boolean(value));

  const coverVideo = byType("cover_video")[0] ?? null;
  const gallery = byType("gallery");

  return {
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

function normalizeStore({ store, tags = [], socialLinks = [], openingHours = [], media = [], offers = [], subscriptions = [] }: NormalizeParams): StoreFlatRecord {
  const normalizedOpeningHours = normalizeOpeningHours(openingHours);
  const normalizedSocialLinks = normalizeSocialLinks(socialLinks);
  const normalizedMedia = normalizeMedia(media);
  const directCoverImage = asString(store.cover_image);
  const coverImageUrl = directCoverImage;
  const coverMediaUrl = normalizedMedia.coverVideo || directCoverImage;
  const coverMediaType = normalizedMedia.coverVideo ? "video" : directCoverImage ? "image" : null;

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
    logo_url: asString(store.logo_url),
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
  const [storeResult, tagsResult, socialResult, openingHoursResult, mediaResult, offersResult, subscriptionsResult] =
    await Promise.all([
      supabaseBrowser.from("stores").select("*").eq("id", storeId).single(),
      supabaseBrowser.from("store_tags").select("*").eq("store_id", storeId),
      supabaseBrowser.from("store_social_links").select("*").eq("store_id", storeId),
      supabaseBrowser.from("store_opening_hours").select("*").eq("store_id", storeId),
      supabaseBrowser.from("store_media_assets").select("*").eq("store_id", storeId),
      supabaseBrowser.from("store_offers").select("*").eq("store_id", storeId),
      supabaseBrowser.from("store_subscriptions").select("*").eq("store_id", storeId),
    ]);

  if (storeResult.error) throw storeResult.error;
  if (!storeResult.data) throw new Error("Store not found");
  if (tagsResult.error) throw tagsResult.error;
  if (socialResult.error) throw socialResult.error;
  if (openingHoursResult.error) throw openingHoursResult.error;
  if (mediaResult.error) throw mediaResult.error;
  if (offersResult.error) throw offersResult.error;
  if (subscriptionsResult.error) throw subscriptionsResult.error;

  return normalizeStore({
    store: storeResult.data,
    tags: tagsResult.data || [],
    socialLinks: socialResult.data || [],
    openingHours: openingHoursResult.data || [],
    media: mediaResult.data || [],
    offers: offersResult.data || [],
    subscriptions: subscriptionsResult.data || [],
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

export async function replaceStoreRelations(storeId: string, input: StoreRelationsInput) {
  const operations: PromiseLike<{ error: Error | null }>[] = [];

  if (input.tags || input.facilities || input.highlights || input.worth_visit || input.mood_tags) {
    operations.push(
      supabaseBrowser.from("store_tags").delete().eq("store_id", storeId).then(async ({ error }) => {
        if (error) return { error };

        const rows = [
          ...(input.tags ?? []).map((tag, index) => ({
            store_id: storeId,
            tag_type: "tag",
            tag_value: tag,
            sort_order: index,
          })),
          ...(input.facilities ?? []).map((tag, index) => ({
            store_id: storeId,
            tag_type: "facility",
            tag_value: tag,
            sort_order: index,
          })),
          ...(input.highlights ?? []).map((tag, index) => ({
            store_id: storeId,
            tag_type: "highlight",
            tag_value: tag,
            sort_order: index,
          })),
          ...(input.worth_visit ?? []).map((tag, index) => ({
            store_id: storeId,
            tag_type: "worth_visit",
            tag_value: tag,
            sort_order: index,
          })),
          ...(input.mood_tags ?? []).map((tag, index) => ({
            store_id: storeId,
            tag_type: "mood",
            tag_value: tag,
            sort_order: index,
          })),
        ].filter((row) => hasValue(row.tag_value));

        if (!rows.length) return { error: null };
        const { error: insertError } = await supabaseBrowser.from("store_tags").insert(rows);
        return { error: insertError };
      })
    );
  }

  if (input.social_links) {
    operations.push(
      supabaseBrowser.from("store_social_links").delete().eq("store_id", storeId).then(async ({ error }) => {
        if (error) return { error };
        const rows = Object.entries(input.social_links || {})
          .filter(([, url]) => hasValue(url))
          .map(([platform, url], index) => ({
            store_id: storeId,
            platform,
            url,
            sort_order: index,
          }));
        if (!rows.length) return { error: null };
        const { error: insertError } = await supabaseBrowser.from("store_social_links").insert(rows);
        return { error: insertError };
      })
    );
  }

  if (input.opening_hours) {
    operations.push(
      supabaseBrowser.from("store_opening_hours").delete().eq("store_id", storeId).then(async ({ error }) => {
        if (error) return { error };

        const rows = STORE_DAY_NAMES.map((day) => {
          const value = input.opening_hours?.[day] || input.opening_hours?.[day.toLowerCase()] || {
            open: "",
            close: "",
            closed: false,
          };
          return {
            store_id: storeId,
            day_of_week: dayValueFromName(day),
            open_time: value.closed ? null : value.open || null,
            close_time: value.closed ? null : value.close || null,
            is_closed: !!value.closed || (!value.open && !value.close),
          };
        }).filter((row) => row.day_of_week !== null);

        if (!rows.length) return { error: null };
        const { error: insertError } = await supabaseBrowser.from("store_opening_hours").insert(rows);
        return { error: insertError };
      })
    );
  }

  if (input.offers) {
    operations.push(
      supabaseBrowser.from("store_offers").delete().eq("store_id", storeId).then(async ({ error }) => {
        if (error) return { error };

        const rows = (input.offers || [])
          .filter((offer) => hasValue(offer.title))
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
            is_active: typeof offer.is_active === "boolean" ? offer.is_active : true,
            metadata: offer.metadata ?? null,
          }));

        if (!rows.length) return { error: null };
        const { error: insertError } = await supabaseBrowser.from("store_offers").insert(rows);
        return { error: insertError };
      })
    );
  }

  if (input.subscription !== undefined) {
    operations.push(
      supabaseBrowser.from("store_subscriptions").delete().eq("store_id", storeId).then(async ({ error }) => {
        if (error) return { error };
        if (!input.subscription || !hasValue(input.subscription.plan_code)) return { error: null };
        const { error: insertError } = await supabaseBrowser.from("store_subscriptions").insert({
          store_id: storeId,
          plan_code: asString(input.subscription.plan_code),
          status: asString(input.subscription.status),
          pickup_premium_enabled: !!input.subscription.pickup_premium_enabled,
          starts_at: asString(input.subscription.starts_at),
          expires_at: asString(input.subscription.expires_at),
        });
        return { error: insertError };
      })
    );
  }

  if (input.gallery_urls !== undefined || input.cover_video_url !== undefined) {
    operations.push(
      supabaseBrowser.from("store_media_assets").delete().eq("store_id", storeId).then(async ({ error }) => {
        if (error) return { error };

        const rows = [
          ...(input.cover_video_url
            ? [
                {
                  store_id: storeId,
                  asset_type: "cover_video",
                  file_url: input.cover_video_url,
                  file_path: null,
                  sort_order: 0,
                  is_active: true,
                },
              ]
            : []),
          ...((input.gallery_urls || []).map((url, index) => ({
            store_id: storeId,
            asset_type: "gallery",
            file_url: url,
            file_path: null,
            sort_order: index,
            is_active: true,
          })) || []),
        ];

        if (!rows.length) return { error: null };
        const { error: insertError } = await supabaseBrowser.from("store_media_assets").insert(rows);
        return { error: insertError };
      })
    );
  }

  const results = await Promise.all(operations);
  const firstError = results.find((result) => result.error)?.error;
  if (firstError) throw firstError;
}

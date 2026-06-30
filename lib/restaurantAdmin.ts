import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { supabaseBrowserSecond } from "@/lib/supabaseBrowserSecond";

export const RESTAURANT_STORAGE_BUCKET = "restaurant";
export const RESTAURANT_STORAGE_PREFIX = "restaurant";

export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type DayName = (typeof DAY_NAMES)[number];

export type DayHours = {
  open: string;
  close: string;
  closed: boolean;
};

export type RestaurantOfferInput = {
  title: string;
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

export type RestaurantSubscriptionInput = {
  plan_code?: string | null;
  status?: string | null;
  unlock_all?: boolean;
  time_slot_enabled?: boolean;
  repeat_rewards_enabled?: boolean;
  dish_discounts_enabled?: boolean;
  starts_at?: string | null;
  expires_at?: string | null;
};

export function formatDateTimeLocal(value: Date = new Date()) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function getOfferDateMinimum(startAt?: string | null) {
  const now = formatDateTimeLocal();
  if (!startAt) return now;
  return startAt > now ? startAt : now;
}

export function validateRestaurantOffers(offers: RestaurantOfferInput[] | undefined) {
  const now = Date.now();

  for (const [index, offer] of (offers || []).entries()) {
    const title = asString(offer?.title);
    const startAt = asString(offer?.start_at);
    const endAt = asString(offer?.end_at);
    const discountValue = asNumber(offer?.discount_value);
    const hasAnyContent = Boolean(
      title || offer?.description || offer?.badge_text || offer?.offer_type || discountValue !== null || offer?.min_spend !== null || startAt || endAt
    );

    if (!hasAnyContent) continue;

    if (!title) {
      return `Offer ${index + 1}: title is required.`;
    }

    if (discountValue !== null && discountValue < 0) {
      return `Offer ${index + 1}: flat amount cannot be negative.`;
    }

    if (startAt) {
      const parsedStart = new Date(startAt);
      if (Number.isNaN(parsedStart.getTime())) {
        return `Offer ${index + 1}: start date is invalid.`;
      }
      if (parsedStart.getTime() < now) {
        return `Offer ${index + 1}: start date cannot be in the past.`;
      }
    }

    if (endAt) {
      const parsedEnd = new Date(endAt);
      if (Number.isNaN(parsedEnd.getTime())) {
        return `Offer ${index + 1}: end date is invalid.`;
      }
      if (parsedEnd.getTime() < now) {
        return `Offer ${index + 1}: end date cannot be in the past.`;
      }
    }

    if (startAt && endAt) {
      const parsedStart = new Date(startAt);
      const parsedEnd = new Date(endAt);
      if (parsedEnd.getTime() <= parsedStart.getTime()) {
        return `Offer ${index + 1}: end date must be later than start date.`;
      }
    }
  }

  return null;
}

export function validateRestaurantAdvertising(input: {
  ad_starts_at?: string | null;
  ad_ends_at?: string | null;
}) {
  const now = Date.now();
  const startAt = asString(input.ad_starts_at);
  const endAt = asString(input.ad_ends_at);

  if (startAt) {
    const parsedStart = new Date(startAt);
    if (Number.isNaN(parsedStart.getTime())) {
      return "Advertising start date is invalid.";
    }
    if (parsedStart.getTime() < now) {
      return "Advertising start date cannot be in the past.";
    }
  }

  if (endAt) {
    const parsedEnd = new Date(endAt);
    if (Number.isNaN(parsedEnd.getTime())) {
      return "Advertising end date is invalid.";
    }
    if (parsedEnd.getTime() < now) {
      return "Advertising end date cannot be in the past.";
    }
  }

  if (startAt && endAt) {
    const parsedStart = new Date(startAt);
    const parsedEnd = new Date(endAt);
    if (parsedEnd.getTime() <= parsedStart.getTime()) {
      return "Advertising end date must be later than start date.";
    }
  }

  return null;
}

export type MerchantType = "Verified" | "Preferred" | "Unclaimed";

export const MERCHANT_TYPE_OPTIONS: { value: MerchantType | ""; label: string; defaultMdr: number | null }[] = [
  { value: "", label: "Select merchant type", defaultMdr: null },
  { value: "Verified", label: "Verified", defaultMdr: 2.5 },
  { value: "Preferred", label: "Preferred", defaultMdr: 3.5 },
  { value: "Unclaimed", label: "Unclaimed", defaultMdr: null },
];

export type RestaurantFlatRecord = {
  id: string;
  name: string;
  phone: string | null;
  area: string | null;
  city: string | null;
  full_address: string | null;
  slug: string | null;
  cover_image: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  cost_for_two: number | null;
  is_active: boolean;
  owner_user_id: string | null;
  is_pure_veg: boolean;
  booking_enabled: boolean;
  merchant_type: MerchantType | null;
  mdr_rate: number | null;
  avg_duration_minutes: number | null;
  max_bookings_per_slot: number | null;
  advance_booking_days: number | null;
  modification_available: boolean;
  modification_cutoff_minutes: number | null;
  cancellation_available: boolean;
  cancellation_cutoff_minutes: number | null;
  cover_charge_enabled: boolean;
  cover_charge_amount: number | null;
  created_at: string | null;
  updated_at: string | null;
  is_advertised: boolean;
  ad_priority: number | null;
  ad_starts_at: string | null;
  ad_ends_at: string | null;
  ad_badge_text: string | null;
  booking_terms: string[] | null;
  on_boarded: boolean;
  created_creds: boolean;
  cuisines: string[];
  facilities: string[];
  highlights: string[];
  worth_visit: string[];
  mood_tags: string[];
  food_images: string[];
  ambience_images: string[];
  menu: string[];
  opening_hours: Record<string, DayHours>;
  offers: RestaurantOfferInput[];
  offer: RestaurantOfferInput | null;
  subscription: RestaurantSubscriptionInput | null;
  subscribed: boolean;
  subscribed_plan: string | null;
  unlock_all: boolean;
  time_slot_enabled: boolean;
  repeat_rewards_enabled: boolean;
  dish_discounts_enabled: boolean;
  rating: number | null;
  food_rating: number | null;
  service_rating: number | null;
  ambience_rating: number | null;
  drinks_rating: number | null;
  crowd_rating: number | null;
  total_ratings: number;
  reviews: Record<string, unknown>[];
};

type DatabaseRow = Record<string, unknown>;

type NormalizeParams = {
  restaurant: DatabaseRow;
  tags?: DatabaseRow[];
  media?: DatabaseRow[];
  openingHours?: DatabaseRow[];
  offers?: DatabaseRow[];
  subscriptions?: DatabaseRow[];
  reviews?: DatabaseRow[];
};

type RestaurantRelationsInput = {
  cuisines?: string[];
  facilities?: string[];
  highlights?: string[];
  worth_visit?: string[];
  mood_tags?: string[];
  food_images?: string[];
  ambience_images?: string[];
  menu?: string[];
  opening_hours?: Record<string, DayHours>;
  offers?: RestaurantOfferInput[];
  subscription?: RestaurantSubscriptionInput | null;
};

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toDateTimeLocal(value: unknown): string | null {
  const raw = asString(value);
  if (!raw) return null;

  // Already in datetime-local format (or with seconds) from previous edits.
  const directMatch = raw.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
  if (directMatch?.[1]) return directMatch[1];

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;

  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  return local;
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asNumberFromKeys(row: DatabaseRow, keys: string[]): number | null {
  for (const key of keys) {
    const value = asNumber(row?.[key]);
    if (value !== null) return value;
  }
  return null;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function hasValue(value: unknown) {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => asString(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function average(values: Array<number | null>): number | null {
  const valid = values.filter((value): value is number => typeof value === "number");
  if (!valid.length) return null;
  const total = valid.reduce((sum, value) => sum + value, 0);
  return Number((total / valid.length).toFixed(1));
}

function extractReviewValue(review: DatabaseRow, keys: string[]): number | null {
  for (const key of keys) {
    const value = asNumber(review?.[key]);
    if (value !== null) return value;
  }
  return null;
}

function computeReviewSummary(reviews: DatabaseRow[]) {
  const normalizedReviews = Array.isArray(reviews) ? reviews : [];
  const foodValues = normalizedReviews.map((review) =>
    extractReviewValue(review, ["food_rating", "food"])
  );
  const serviceValues = normalizedReviews.map((review) =>
    extractReviewValue(review, ["service_rating", "service"])
  );
  const ambienceValues = normalizedReviews.map((review) =>
    extractReviewValue(review, ["ambience_rating", "ambience"])
  );
  const drinksValues = normalizedReviews.map((review) =>
    extractReviewValue(review, ["drinks_rating", "drinks"])
  );
  const crowdValues = normalizedReviews.map((review) =>
    extractReviewValue(review, ["crowd_rating", "crowd"])
  );

  const overallValues = normalizedReviews.map((review) => {
    const direct = extractReviewValue(review, ["rating", "overall_rating", "overall"]);
    if (direct !== null) return direct;

    const fallback = average([
      extractReviewValue(review, ["food_rating", "food"]),
      extractReviewValue(review, ["service_rating", "service"]),
      extractReviewValue(review, ["ambience_rating", "ambience"]),
      extractReviewValue(review, ["drinks_rating", "drinks"]),
      extractReviewValue(review, ["crowd_rating", "crowd"]),
    ]);

    return fallback;
  });

  return {
    rating: average(overallValues),
    food_rating: average(foodValues),
    service_rating: average(serviceValues),
    ambience_rating: average(ambienceValues),
    drinks_rating: average(drinksValues),
    crowd_rating: average(crowdValues),
    total_ratings: normalizedReviews.length,
  };
}

function dayNameFromValue(dayOfWeek: unknown): DayName | null {
  if (typeof dayOfWeek === "string") {
    const normalized = dayOfWeek.trim().toLowerCase();
    const numericDay = Number(normalized);
    if (Number.isFinite(numericDay)) {
      if (numericDay >= 1 && numericDay <= 7) return DAY_NAMES[numericDay - 1];
      if (numericDay === 0) return "Sunday";
    }
    const match = DAY_NAMES.find((day) => day.toLowerCase() === normalized);
    if (match) return match;

    const aliases: Record<string, DayName> = {
      mon: "Monday",
      tue: "Tuesday",
      tues: "Tuesday",
      wed: "Wednesday",
      thu: "Thursday",
      thur: "Thursday",
      thurs: "Thursday",
      fri: "Friday",
      sat: "Saturday",
      sun: "Sunday",
    };
    if (aliases[normalized]) return aliases[normalized];
  }

  if (typeof dayOfWeek === "number" && Number.isFinite(dayOfWeek)) {
    if (dayOfWeek >= 1 && dayOfWeek <= 7) return DAY_NAMES[dayOfWeek - 1];
    if (dayOfWeek === 0) return "Sunday";
  }

  return null;
}

function emptyOpeningHours(): Record<string, DayHours> {
  return DAY_NAMES.reduce<Record<string, DayHours>>((accumulator, day) => {
    accumulator[day] = { open: "", close: "", closed: false };
    accumulator[day.toLowerCase()] = accumulator[day];
    return accumulator;
  }, {});
}

function normalizeTimeForHourSlot(value: unknown): string {
  const raw = asString(value);
  if (!raw) return "";

  // Supports DB time formats like HH:mm:ss or HH:mm.
  const hhmmMatch = raw.match(/^(\d{2}):(\d{2})/);
  if (hhmmMatch) return `${hhmmMatch[1]}:${hhmmMatch[2]}`;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`;
}

function normalizeOpeningHours(rows: DatabaseRow[]): Record<string, DayHours> {
  const result = emptyOpeningHours();

  for (const row of rows || []) {
    const dayName = dayNameFromValue(row?.day_of_week);
    if (!dayName) continue;

    const normalized: DayHours = {
      open: normalizeTimeForHourSlot(row?.open_time),
      close: normalizeTimeForHourSlot(row?.close_time),
      closed: Boolean(row?.is_closed),
    };

    result[dayName] = normalized;
    result[dayName.toLowerCase()] = normalized;
  }

  return result;
}

function sortByOrder(rows: DatabaseRow[]) {
  return [...(rows || [])].sort((left, right) => {
    const leftOrder = asNumber(left?.sort_order) ?? 0;
    const rightOrder = asNumber(right?.sort_order) ?? 0;
    return leftOrder - rightOrder;
  });
}

function tagValues(rows: DatabaseRow[], tagType: string): string[] {
  return sortByOrder(rows)
    .filter((row) => row?.tag_type === tagType)
    .map((row) => asString(row?.tag_value))
    .filter((value): value is string => Boolean(value));
}

function mediaUrls(rows: DatabaseRow[], assetType: string): string[] {
  return sortByOrder(rows)
    .filter((row) => row?.asset_type === assetType && row?.is_active !== false)
    .map((row) => asString(row?.file_url))
    .filter((value): value is string => Boolean(value));
}

function normalizeOfferRow(row: DatabaseRow): RestaurantOfferInput {
  const metadata =
    row?.metadata && typeof row.metadata === "object"
      ? (row.metadata as Record<string, unknown>)
      : null;
  const uiOfferType = typeof metadata?.offer_type_ui === "string" ? metadata.offer_type_ui : null;
  const normalizedOfferType = (() => {
    const rawOfferType = asString(row?.offer_type);
    if (rawOfferType === "PERCENTAGE" || rawOfferType === "PERCENT") return "percentage";
    if (rawOfferType === "FLAT") return "flat";
    if (rawOfferType === "CASHBACK") return "cover_discount";
    return rawOfferType;
  })();

  return {
    title: asString(row?.title) ?? "",
    description: asString(row?.description),
    badge_text: asString(row?.badge_text),
    offer_type: uiOfferType || normalizedOfferType,
    discount_value: asNumber(row?.discount_value),
    min_spend: asNumber(row?.min_spend),
    start_at: toDateTimeLocal(row?.start_at),
    end_at: toDateTimeLocal(row?.end_at),
    is_active: row?.is_active !== false,
    metadata,
  };
}

function pickActiveSubscription(rows: DatabaseRow[]): RestaurantSubscriptionInput | null {
  const sorted = [...(rows || [])].sort((left, right) => {
    const leftValue = left?.starts_at || left?.created_at || "";
    const rightValue = right?.starts_at || right?.created_at || "";
    return String(rightValue).localeCompare(String(leftValue));
  });

  const active =
    sorted.find((row) => String(row?.status || "").toLowerCase() === "active") || sorted[0];

  if (!active) return null;

  return {
    plan_code: asString(active?.plan_code),
    status: asString(active?.status),
    unlock_all: asBoolean(active?.unlock_all),
    time_slot_enabled: asBoolean(active?.time_slot_enabled),
    repeat_rewards_enabled: asBoolean(active?.repeat_rewards_enabled),
    dish_discounts_enabled: asBoolean(active?.dish_discounts_enabled),
    starts_at: toDateTimeLocal(active?.starts_at),
    expires_at: toDateTimeLocal(active?.expires_at),
  };
}

export function normalizeRestaurantRecord({
  restaurant,
  tags = [],
  media = [],
  openingHours = [],
  offers = [],
  subscriptions = [],
  reviews = [],
}: NormalizeParams): RestaurantFlatRecord {
  const normalizedSubscription = pickActiveSubscription(subscriptions);
  const normalizedOffers = sortByOrder(offers).map(normalizeOfferRow);
  const ratings = computeReviewSummary(reviews);
  const restaurantRow = restaurant as DatabaseRow;

  return {
    id: String(restaurant?.id || ""),
    name: asString(restaurant?.name) ?? "",
    phone: asString(restaurant?.phone),
    area: asString(restaurant?.area),
    city: asString(restaurant?.city),
    full_address: asString(restaurant?.full_address),
    slug: asString(restaurant?.slug),
    cover_image: asString(restaurant?.cover_image),
    latitude: asNumber(restaurant?.latitude),
    longitude: asNumber(restaurant?.longitude),
    description: asString(restaurant?.description),
    cost_for_two: asNumber(restaurant?.cost_for_two),
    is_active: restaurant?.is_active !== false,
    owner_user_id: asString(restaurant?.owner_user_id),
    is_pure_veg: asBoolean(restaurant?.is_pure_veg),
    booking_enabled: restaurant?.booking_enabled !== false,
    avg_duration_minutes: asNumber(restaurant?.avg_duration_minutes),
    max_bookings_per_slot: asNumberFromKeys(restaurantRow, ["max_bookings_per_slot", "max_booking_per_slot"]),
    advance_booking_days: asNumber(restaurant?.advance_booking_days),
    modification_available: asBoolean(restaurant?.modification_available),
    modification_cutoff_minutes: asNumberFromKeys(restaurantRow, ["modification_cutoff_minutes", "modification_cutoff"]),
    cancellation_available: asBoolean(restaurant?.cancellation_available),
    cancellation_cutoff_minutes: asNumberFromKeys(restaurantRow, ["cancellation_cutoff_minutes", "cancellation_cutoff"]),
    cover_charge_enabled: asBoolean(restaurant?.cover_charge_enabled),
    cover_charge_amount: asNumberFromKeys(restaurantRow, ["cover_charge_amount", "cover_amount"]),
    created_at: asString(restaurant?.created_at),
    updated_at: asString(restaurant?.updated_at),
    is_advertised: asBoolean(restaurant?.is_advertised),
    on_boarded: restaurant?.on_boarded === true,
    created_creds: restaurant?.created_creds === true,
    ad_priority: asNumber(restaurant?.ad_priority),
    ad_starts_at: toDateTimeLocal(restaurant?.ad_starts_at),
    ad_ends_at: toDateTimeLocal(restaurant?.ad_ends_at),
    ad_badge_text: asString(restaurant?.ad_badge_text),
    booking_terms: asStringArray(restaurant?.booking_terms),
    cuisines: tagValues(tags, "cuisine"),
    facilities: tagValues(tags, "facility"),
    highlights: tagValues(tags, "highlight"),
    worth_visit: tagValues(tags, "worth_visit"),
    mood_tags: tagValues(tags, "mood"),
    food_images: mediaUrls(media, "food"),
    ambience_images: mediaUrls(media, "ambience"),
    menu: mediaUrls(media, "menu"),
    opening_hours: normalizeOpeningHours(openingHours),
    offers: normalizedOffers,
    offer:
      normalizedOffers.find((entry) => entry.is_active !== false) ??
      normalizedOffers[0] ??
      null,
    subscription: normalizedSubscription,
    subscribed: Boolean(
      normalizedSubscription?.plan_code &&
        String(normalizedSubscription.status || "").toLowerCase() !== "inactive"
    ),
    subscribed_plan: normalizedSubscription?.plan_code ?? null,
    unlock_all: Boolean(normalizedSubscription?.unlock_all),
    time_slot_enabled: Boolean(normalizedSubscription?.time_slot_enabled),
    repeat_rewards_enabled: Boolean(normalizedSubscription?.repeat_rewards_enabled),
    dish_discounts_enabled: Boolean(normalizedSubscription?.dish_discounts_enabled),
    rating: ratings.rating,
    food_rating: ratings.food_rating,
    service_rating: ratings.service_rating,
    ambience_rating: ratings.ambience_rating,
    drinks_rating: ratings.drinks_rating,
    crowd_rating: ratings.crowd_rating,
    total_ratings: ratings.total_ratings,
    reviews: Array.isArray(reviews) ? reviews : [],
    merchant_type: (asString(restaurant?.merchant_type) as MerchantType | null) ?? null,
    mdr_rate: asNumber(restaurant?.mdr_rate),
  };
}

// ---------------------------------------------------------------------------
// Second-DB fetch (mirrors fetchRestaurantDetail but uses supabaseBrowserSecond)
// ---------------------------------------------------------------------------
async function fetchRestaurantDetailFromSecond(
  restaurantId: string
): Promise<RestaurantFlatRecord | null> {
  try {
    const [restaurantResult, tagsResult, mediaResult, openingHoursResult, offersResult, subscriptionsResult, reviewsResult] =
      await Promise.all([
        supabaseBrowserSecond.from("restaurants").select("*").eq("id", restaurantId).single(),
        supabaseBrowserSecond.from("restaurant_tags").select("*").eq("restaurant_id", restaurantId),
        supabaseBrowserSecond
          .from("restaurant_media_assets")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .order("sort_order", { ascending: true }),
        supabaseBrowserSecond
          .from("restaurant_opening_hours")
          .select("*")
          .eq("restaurant_id", restaurantId),
        supabaseBrowserSecond
          .from("restaurant_offers")
          .select("*")
          .eq("restaurant_id", restaurantId),
        supabaseBrowserSecond
          .from("restaurant_subscriptions")
          .select("*")
          .eq("restaurant_id", restaurantId),
        supabaseBrowserSecond.from("restaurant_reviews").select("*").eq("restaurant_id", restaurantId),
      ]);

    if (restaurantResult.error || !restaurantResult.data) return null;

    return normalizeRestaurantRecord({
      restaurant: restaurantResult.data,
      tags: tagsResult.data || [],
      media: mediaResult.data || [],
      openingHours: openingHoursResult.data || [],
      offers: offersResult.data || [],
      subscriptions: subscriptionsResult.data || [],
      reviews: reviewsResult.data || [],
    });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Smart merge: combine primary + secondary into a single authoritative record.
// Rules:
//  • Images/arrays: union of both, deduplicated, preserving primary order first.
//  • Scalar fields:  primary value wins unless it is null / empty string,
//                    in which case the secondary value fills in the gap.
//  • updated_at / created_at: kept from primary (source of truth for timestamps).
// ---------------------------------------------------------------------------
function uniqueStrings(a: string[], b: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const url of [...a, ...b]) {
    if (url && !seen.has(url)) {
      seen.add(url);
      result.push(url);
    }
  }
  return result;
}

function mergeScalar<T>(primary: T, secondary: T): T {
  if (primary !== null && primary !== undefined && primary !== "") return primary;
  return secondary;
}

export function mergeRestaurantRecords(
  primary: RestaurantFlatRecord,
  secondary: RestaurantFlatRecord
): RestaurantFlatRecord {
  const mergedFoodImages = uniqueStrings(primary.food_images, secondary.food_images);
  const mergedAmbienceImages = uniqueStrings(primary.ambience_images, secondary.ambience_images);
  const mergedMenuImages = uniqueStrings(primary.menu, secondary.menu);

  // Tag arrays: union
  const mergedCuisines = uniqueStrings(primary.cuisines, secondary.cuisines);
  const mergedFacilities = uniqueStrings(primary.facilities, secondary.facilities);
  const mergedHighlights = uniqueStrings(primary.highlights, secondary.highlights);
  const mergedWorthVisit = uniqueStrings(primary.worth_visit, secondary.worth_visit);
  const mergedMoodTags = uniqueStrings(primary.mood_tags, secondary.mood_tags);

  // Scalar fields: primary wins unless null/empty
  const merged: RestaurantFlatRecord = {
    ...primary,
    // Scalar overrides from secondary when primary is missing data
    phone: mergeScalar(primary.phone, secondary.phone),
    area: mergeScalar(primary.area, secondary.area),
    city: mergeScalar(primary.city, secondary.city),
    full_address: mergeScalar(primary.full_address, secondary.full_address),
    slug: mergeScalar(primary.slug, secondary.slug),
    cover_image: mergeScalar(primary.cover_image, secondary.cover_image),
    latitude: mergeScalar(primary.latitude, secondary.latitude),
    longitude: mergeScalar(primary.longitude, secondary.longitude),
    description: mergeScalar(primary.description, secondary.description),
    cost_for_two: mergeScalar(primary.cost_for_two, secondary.cost_for_two),
    owner_user_id: mergeScalar(primary.owner_user_id, secondary.owner_user_id),
    avg_duration_minutes: mergeScalar(primary.avg_duration_minutes, secondary.avg_duration_minutes),
    max_bookings_per_slot: mergeScalar(primary.max_bookings_per_slot, secondary.max_bookings_per_slot),
    advance_booking_days: mergeScalar(primary.advance_booking_days, secondary.advance_booking_days),
    modification_cutoff_minutes: mergeScalar(primary.modification_cutoff_minutes, secondary.modification_cutoff_minutes),
    cancellation_cutoff_minutes: mergeScalar(primary.cancellation_cutoff_minutes, secondary.cancellation_cutoff_minutes),
    cover_charge_amount: mergeScalar(primary.cover_charge_amount, secondary.cover_charge_amount),
    ad_priority: mergeScalar(primary.ad_priority, secondary.ad_priority),
    ad_starts_at: mergeScalar(primary.ad_starts_at, secondary.ad_starts_at),
    ad_ends_at: mergeScalar(primary.ad_ends_at, secondary.ad_ends_at),
    ad_badge_text: mergeScalar(primary.ad_badge_text, secondary.ad_badge_text),
    merchant_type: mergeScalar(primary.merchant_type, secondary.merchant_type),
    mdr_rate: mergeScalar(primary.mdr_rate, secondary.mdr_rate),
    booking_terms: primary.booking_terms?.length ? primary.booking_terms : secondary.booking_terms,

    // Boolean: primary wins (already has default false, so only override if primary is false and secondary is true)
    is_active: primary.is_active || secondary.is_active,
    is_advertised: primary.is_advertised || secondary.is_advertised,
    is_pure_veg: primary.is_pure_veg || secondary.is_pure_veg,
    booking_enabled: primary.booking_enabled || secondary.booking_enabled,
    modification_available: primary.modification_available || secondary.modification_available,
    cancellation_available: primary.cancellation_available || secondary.cancellation_available,
    cover_charge_enabled: primary.cover_charge_enabled || secondary.cover_charge_enabled,
    on_boarded: primary.on_boarded || secondary.on_boarded,
    created_creds: primary.created_creds || secondary.created_creds,

    // Media: combined unique lists
    food_images: mergedFoodImages,
    ambience_images: mergedAmbienceImages,
    menu: mergedMenuImages,
    cover_image: mergeScalar(primary.cover_image, secondary.cover_image) ||
      mergedFoodImages[0] || mergedAmbienceImages[0] || null,

    // Tags: unioned
    cuisines: mergedCuisines,
    facilities: mergedFacilities,
    highlights: mergedHighlights,
    worth_visit: mergedWorthVisit,
    mood_tags: mergedMoodTags,

    // Offers: primary wins; if primary has none, use secondary
    offers: primary.offers.length ? primary.offers : secondary.offers,
    offer: primary.offer ?? secondary.offer,

    // Subscription: primary wins; if none, use secondary
    subscription: primary.subscription ?? secondary.subscription,
    subscribed: primary.subscribed || secondary.subscribed,
    subscribed_plan: mergeScalar(primary.subscribed_plan, secondary.subscribed_plan),
    unlock_all: primary.unlock_all || secondary.unlock_all,
    time_slot_enabled: primary.time_slot_enabled || secondary.time_slot_enabled,
    repeat_rewards_enabled: primary.repeat_rewards_enabled || secondary.repeat_rewards_enabled,
    dish_discounts_enabled: primary.dish_discounts_enabled || secondary.dish_discounts_enabled,

    // Reviews: combine unique entries by id
    reviews: mergeReviews(primary.reviews, secondary.reviews),

    // Opening hours: primary wins per-day, fallback to secondary for days with no data
    opening_hours: mergeOpeningHours(primary.opening_hours, secondary.opening_hours),
  };

  // Recompute the active offer reference after merge
  const activeOffer = merged.offers.find((o) => o.is_active !== false) ?? merged.offers[0] ?? null;
  merged.offer = activeOffer;

  return merged;
}

function mergeReviews(
  primary: Record<string, unknown>[],
  secondary: Record<string, unknown>[]
): Record<string, unknown>[] {
  const seen = new Set<string>();
  const result: Record<string, unknown>[] = [];
  for (const review of [...primary, ...secondary]) {
    const id = String(review?.id || review?.review_id || "");
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);
    result.push(review);
  }
  return result;
}

function mergeOpeningHours(
  primary: Record<string, DayHours>,
  secondary: Record<string, DayHours>
): Record<string, DayHours> {
  const merged: Record<string, DayHours> = { ...primary };
  for (const day of DAY_NAMES) {
    const primaryDay = primary[day] || primary[day.toLowerCase()];
    const secondaryDay = secondary[day] || secondary[day.toLowerCase()];
    if (!primaryDay && secondaryDay) {
      merged[day] = secondaryDay;
      merged[day.toLowerCase()] = secondaryDay;
    } else if (primaryDay && secondaryDay) {
      // If primary day has no times but secondary does, use secondary times
      const hasNoTimes = !primaryDay.open && !primaryDay.close;
      if (hasNoTimes && (secondaryDay.open || secondaryDay.close)) {
        merged[day] = secondaryDay;
        merged[day.toLowerCase()] = secondaryDay;
      }
    }
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Backfill primary DB with any extra data found in secondary.
// Only called when a real difference was detected.
// ---------------------------------------------------------------------------
async function backfillPrimaryFromMerge(
  restaurantId: string,
  merged: RestaurantFlatRecord,
  primary: RestaurantFlatRecord
) {
  try {
    // Check whether any images or scalar fields differ
    const imageDiff =
      merged.food_images.length !== primary.food_images.length ||
      merged.ambience_images.length !== primary.ambience_images.length ||
      merged.menu.length !== primary.menu.length;

    const scalarDiff =
      merged.phone !== primary.phone ||
      merged.area !== primary.area ||
      merged.city !== primary.city ||
      merged.description !== primary.description ||
      merged.cover_image !== primary.cover_image ||
      merged.slug !== primary.slug;

    const tagDiff =
      merged.cuisines.length !== primary.cuisines.length ||
      merged.facilities.length !== primary.facilities.length ||
      merged.highlights.length !== primary.highlights.length ||
      merged.worth_visit.length !== primary.worth_visit.length ||
      merged.mood_tags.length !== primary.mood_tags.length;

    if (!imageDiff && !scalarDiff && !tagDiff) return; // nothing new from secondary

    // We must run updates server-side because direct client-side writes to primary DB
    // (using supabaseBrowser) are blocked by RLS policies.
    // However, since backfillPrimaryFromMerge is executed inside fetchRestaurantDetailMerged (which runs during render/initial fetch),
    // we should execute it asynchronously and call our server-side API or check if we can obtain a token.
    // If this runs on the server (SSR), it can use supabaseAdmin directly!
    // Let's check if window is defined to determine if we are in the browser:
    const isBrowser = typeof window !== "undefined";

    if (!isBrowser) {
      // Server-side (SSR / API route context): We can write directly to primary using supabaseAdmin!
      const { supabaseAdmin } = await import("@/lib/supabaseAdmin");
      if (scalarDiff) {
        const basePayload = buildRestaurantBasePayload(merged);
        await supabaseAdmin
          .from("restaurants")
          .update(basePayload)
          .eq("id", restaurantId);
      }

      if (imageDiff || tagDiff) {
        const relationsPayload = {
          cuisines: merged.cuisines,
          facilities: merged.facilities,
          highlights: merged.highlights,
          worth_visit: merged.worth_visit,
          mood_tags: merged.mood_tags,
          food_images: merged.food_images,
          ambience_images: merged.ambience_images,
          menu: merged.menu,
          offers: merged.offers,
          subscription: merged.subscription,
        };

        const replaceAdminRows = async (table: string, rows: Record<string, unknown>[]) => {
          await supabaseAdmin.from(table).delete().eq("restaurant_id", restaurantId);
          if (rows.length > 0) {
            await supabaseAdmin.from(table).insert(rows);
          }
        };

        await Promise.all([
          replaceAdminRows("restaurant_tags", buildTagRows(restaurantId, relationsPayload)),
          replaceAdminRows("restaurant_media_assets", buildMediaRows(restaurantId, relationsPayload)),
          replaceAdminRows("restaurant_offers", buildOfferRows(restaurantId, relationsPayload.offers)),
          replaceAdminRows("restaurant_subscriptions", buildSubscriptionRows(restaurantId, relationsPayload.subscription)),
          replaceAdminRows("restaurant_opening_hours", buildOpeningHoursRows(restaurantId, merged.opening_hours)),
        ]);
      }
    } else {
      // Browser-side: Fetch the token and call our API route (which uses supabaseAdmin under the hood)
      const { getTokenClient } = await import("@/lib/getTokenClient");
      const token = await getTokenClient();
      if (!token) return;

      const basePayload = scalarDiff ? buildRestaurantBasePayload(merged) : undefined;
      const relationsPayload = (imageDiff || tagDiff) ? {
        cuisines: merged.cuisines,
        facilities: merged.facilities,
        highlights: merged.highlights,
        worth_visit: merged.worth_visit,
        mood_tags: merged.mood_tags,
        food_images: merged.food_images,
        ambience_images: merged.ambience_images,
        menu: merged.menu,
        offers: merged.offers,
        subscription: merged.subscription,
      } : undefined;

      const relationsRows = relationsPayload ? {
        tags: buildTagRows(restaurantId, relationsPayload),
        media: buildMediaRows(restaurantId, relationsPayload),
        offers: buildOfferRows(restaurantId, relationsPayload.offers),
        subscription: buildSubscriptionRows(restaurantId, relationsPayload.subscription),
        opening_hours: merged.opening_hours ? buildOpeningHoursRows(restaurantId, merged.opening_hours) : undefined,
      } : undefined;

      // Note: We need a server-side endpoint on the primary DB to write these changes.
      // Our PATCH route /api/restaurants/[id] currently updates the SECOND database.
      // Let's create/use a dedicated sync endpoint or update our API.
      // Wait, we can also perform a PATCH request to our own API if we want it to write to BOTH,
      // or we can write a dedicated endpoint for primary database sync.
      // Let's make a local PATCH request to our API, but wait! The API route /api/restaurants/[id] PATCH currently writes to supabaseAdminSecond.
      // Let's modify /api/restaurants/[id]/route.ts PATCH to write to BOTH databases!
      // This is a much cleaner solution. Let's send the PATCH request to /api/restaurants/[id].
      await fetch(`/api/restaurants/${restaurantId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          basePayload,
          relations: relationsRows,
          syncPrimaryOnly: true, // We will instruct the API to write to the primary DB
        }),
      });
    }
  } catch (err) {
    console.error("[restaurantAdmin] backfill-primary error", err);
  }
}

// ---------------------------------------------------------------------------
// Public merged fetch — use this in the detail page instead of fetchRestaurantDetail.
// Fetches both DBs, merges, backfills primary if secondary had extra data.
// ---------------------------------------------------------------------------
export async function fetchRestaurantDetailMerged(restaurantId: string): Promise<RestaurantFlatRecord> {
  const [primary, secondary] = await Promise.all([
    fetchRestaurantDetail(restaurantId),
    fetchRestaurantDetailFromSecond(restaurantId),
  ]);

  if (!secondary) return primary; // second DB unavailable or no record

  const merged = mergeRestaurantRecords(primary, secondary);

  // Fire-and-forget: backfill primary if secondary contributed extra data
  void backfillPrimaryFromMerge(restaurantId, merged, primary);

  return merged;
}

export async function fetchRestaurantsPage(params: {
  page: number;
  limit: number;
  searchTerm?: string;
}) {
  const { page, limit, searchTerm } = params;
  let query = supabaseBrowser
    .from("restaurants")
    .select("*", { count: "exact" })
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (searchTerm) {
    query = query.or(
      `name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,area.ilike.%${searchTerm}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const restaurants = data || [];
  const ids = restaurants.map((restaurant) => restaurant.id).filter(Boolean);

  let reviews: DatabaseRow[] = [];
  if (ids.length > 0) {
    const reviewResult = await supabaseBrowser
      .from("restaurant_reviews")
      .select("*")
      .in("restaurant_id", ids);

    if (reviewResult.error) throw reviewResult.error;
    reviews = reviewResult.data || [];
  }

  const reviewsByRestaurant = new Map<string, DatabaseRow[]>();
  for (const review of reviews) {
    const restaurantId = String(review?.restaurant_id || "");
    if (!restaurantId) continue;
    const current = reviewsByRestaurant.get(restaurantId) || [];
    current.push(review);
    reviewsByRestaurant.set(restaurantId, current);
  }

  return {
    data: restaurants.map((restaurant) =>
      normalizeRestaurantRecord({
        restaurant,
        reviews: reviewsByRestaurant.get(String(restaurant.id)) || [],
      })
    ),
    count: count || 0,
  };
}

export async function fetchRestaurantDetail(restaurantId: string) {
  const [restaurantResult, tagsResult, mediaResult, openingHoursResult, offersResult, subscriptionsResult, reviewsResult] =
    await Promise.all([
      supabaseBrowser.from("restaurants").select("*").eq("id", restaurantId).single(),
      supabaseBrowser.from("restaurant_tags").select("*").eq("restaurant_id", restaurantId),
      supabaseBrowser
        .from("restaurant_media_assets")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("sort_order", { ascending: true }),
      supabaseBrowser
        .from("restaurant_opening_hours")
        .select("*")
        .eq("restaurant_id", restaurantId),
      supabaseBrowser
        .from("restaurant_offers")
        .select("*")
        .eq("restaurant_id", restaurantId),
      supabaseBrowser
        .from("restaurant_subscriptions")
        .select("*")
        .eq("restaurant_id", restaurantId),
      supabaseBrowser.from("restaurant_reviews").select("*").eq("restaurant_id", restaurantId),
    ]);

  if (restaurantResult.error) throw restaurantResult.error;
  if (tagsResult.error) throw tagsResult.error;
  if (mediaResult.error) throw mediaResult.error;
  if (openingHoursResult.error) throw openingHoursResult.error;
  if (offersResult.error) throw offersResult.error;
  if (subscriptionsResult.error) throw subscriptionsResult.error;
  if (reviewsResult.error) throw reviewsResult.error;

  return normalizeRestaurantRecord({
    restaurant: restaurantResult.data,
    tags: tagsResult.data || [],
    media: mediaResult.data || [],
    openingHours: openingHoursResult.data || [],
    offers: offersResult.data || [],
    subscriptions: subscriptionsResult.data || [],
    reviews: reviewsResult.data || [],
  });
}

export function extractStoragePath(publicUrl: string): string | null {
  if (!publicUrl) return null;

  const objectPublicMatch = publicUrl.match(/\/object\/public\/[^/]+\/(.+)$/);
  if (objectPublicMatch?.[1]) return objectPublicMatch[1];

  const bucketMatch = publicUrl.match(/\/restaurant\/(.+)$/);
  return bucketMatch?.[1] ?? null;
}

export function buildRestaurantStoragePath(
  restaurantId: string,
  assetType: "food" | "ambience" | "menu",
  fileName: string
) {
  const extension = fileName.split(".").pop() || "jpg";
  const random = Math.random().toString(36).slice(2, 9);
  return `${RESTAURANT_STORAGE_PREFIX}/${assetType}/${restaurantId}/${Date.now()}-${random}.${extension}`;
}

export async function uploadRestaurantImages(
  restaurantId: string,
  files: File[],
  assetType: "food" | "ambience" | "menu"
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
          const path = buildRestaurantStoragePath(restaurantId, assetType, file.name);

          const { error } = await supabaseBrowser.storage
            .from(RESTAURANT_STORAGE_BUCKET)
            .upload(path, file);

          if (error) throw error;
          uploadedPaths.push(path);

          const { data } = supabaseBrowser.storage
            .from(RESTAURANT_STORAGE_BUCKET)
            .getPublicUrl(path);

          urls[fileIndex] = data.publicUrl;
        })
      );
    }

    return urls.filter(Boolean);
  } catch (error) {
    if (uploadedPaths.length > 0) {
      const { error: cleanupError } = await supabaseBrowser.storage
        .from(RESTAURANT_STORAGE_BUCKET)
        .remove(uploadedPaths);

      if (cleanupError) {
        console.error("[restaurantAdmin] cleanup upload error", cleanupError);
      }
    }
    throw error;
  }
}

export async function deleteRestaurantImages(publicUrls: string[]) {
  const paths = publicUrls
    .map((url) => extractStoragePath(url))
    .filter((value): value is string => Boolean(value));

  if (!paths.length) return;

  const { error } = await supabaseBrowser.storage
    .from(RESTAURANT_STORAGE_BUCKET)
    .remove(paths);

  if (error) throw error;

  // Mirror deletion to the second Supabase (non-blocking).
  supabaseBrowserSecond.storage
    .from(RESTAURANT_STORAGE_BUCKET)
    .remove(paths)
    .then(({ error: secondError }) => {
      if (secondError) {
        console.error("[restaurantAdmin] second-db delete images error", secondError);
      }
    });
}

export function buildRestaurantBasePayload(input: Partial<RestaurantFlatRecord>) {
  const modificationCutoff = input.modification_available
    ? asNumber(input.modification_cutoff_minutes)
    : null;
  const cancellationCutoff = input.cancellation_available
    ? asNumber(input.cancellation_cutoff_minutes)
    : null;
  const coverChargeAmount = input.cover_charge_enabled
    ? asNumber(input.cover_charge_amount)
    : null;

  return {
    name: asString(input.name) ?? "",
    phone: asString(input.phone),
    area: asString(input.area),
    city: asString(input.city),
    full_address: asString(input.full_address),
    slug: asString(input.slug),
    cover_image: asString(input.cover_image),
    latitude: asNumber(input.latitude),
    longitude: asNumber(input.longitude),
    description: asString(input.description),
    cost_for_two: asNumber(input.cost_for_two),
    is_active: input.is_active !== false,
    owner_user_id: asString(input.owner_user_id),
    is_pure_veg: Boolean(input.is_pure_veg),
    booking_enabled: input.booking_enabled !== false,
    avg_duration_minutes: asNumber(input.avg_duration_minutes),
    max_bookings_per_slot: asNumber(input.max_bookings_per_slot),
    advance_booking_days: asNumber(input.advance_booking_days),
    modification_available: Boolean(input.modification_available),
    modification_cutoff_minutes: modificationCutoff,
    cancellation_available: Boolean(input.cancellation_available),
    cancellation_cutoff_minutes: cancellationCutoff,
    cover_charge_enabled: Boolean(input.cover_charge_enabled),
    cover_charge_amount: coverChargeAmount,
    on_boarded: Boolean(input.on_boarded),
    is_advertised: Boolean(input.is_advertised),
    ad_priority: asNumber(input.ad_priority),
    ad_starts_at: asString(input.ad_starts_at),
    ad_ends_at: asString(input.ad_ends_at),
    ad_badge_text: asString(input.ad_badge_text),
    booking_terms: input.booking_terms && input.booking_terms.length ? input.booking_terms : null,
    merchant_type: asString(input.merchant_type),
    mdr_rate: asNumber(input.mdr_rate),
  };
}

export function buildRestaurantInsertPayload(input: Partial<RestaurantFlatRecord>) {
  const payload: Record<string, unknown> = {
    name: asString(input.name) ?? "",
    is_active: input.is_active !== false,
    is_pure_veg: Boolean(input.is_pure_veg),
    booking_enabled: input.booking_enabled !== false,
    modification_available: Boolean(input.modification_available),
    cancellation_available: Boolean(input.cancellation_available),
    cover_charge_enabled: Boolean(input.cover_charge_enabled),
    is_advertised: Boolean(input.is_advertised),
    on_boarded: Boolean(input.on_boarded),
  };

  const optionalValues: Record<string, unknown> = {
    phone: asString(input.phone),
    area: asString(input.area),
    city: asString(input.city),
    full_address: asString(input.full_address),
    slug: asString(input.slug),
    cover_image: asString(input.cover_image),
    latitude: asNumber(input.latitude),
    longitude: asNumber(input.longitude),
    description: asString(input.description),
    cost_for_two: asNumber(input.cost_for_two),
    owner_user_id: asString(input.owner_user_id),
    avg_duration_minutes: asNumber(input.avg_duration_minutes),
    max_bookings_per_slot: asNumber(input.max_bookings_per_slot),
    advance_booking_days: asNumber(input.advance_booking_days),
    modification_cutoff_minutes: input.modification_available ? asNumber(input.modification_cutoff_minutes) : null,
    cancellation_cutoff_minutes: input.cancellation_available ? asNumber(input.cancellation_cutoff_minutes) : null,
    cover_charge_amount: input.cover_charge_enabled ? asNumber(input.cover_charge_amount) : null,
    ad_priority: asNumber(input.ad_priority),
    ad_starts_at: asString(input.ad_starts_at),
    ad_ends_at: asString(input.ad_ends_at),
    ad_badge_text: asString(input.ad_badge_text),
    booking_terms: Array.isArray(input.booking_terms) ? input.booking_terms : undefined,
    merchant_type: asString(input.merchant_type),
    mdr_rate: asNumber(input.mdr_rate),
  };

  for (const [key, value] of Object.entries(optionalValues)) {
    if (hasValue(value)) {
      payload[key] = value;
    }
  }

  return payload;
}

export function buildTagRows(restaurantId: string, input: RestaurantRelationsInput) {
  const groups = [
    { type: "cuisine", values: input.cuisines || [] },
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
        restaurant_id: restaurantId,
        tag_type: group.type,
        tag_value: value,
        sort_order: index,
      }))
  );
}

export function buildMediaRows(restaurantId: string, input: RestaurantRelationsInput) {
  const groups = [
    { type: "food", values: input.food_images || [] },
    { type: "ambience", values: input.ambience_images || [] },
    { type: "menu", values: input.menu || [] },
  ];

  return groups.flatMap((group) =>
    group.values
      .map((fileUrl) => asString(fileUrl))
      .filter((fileUrl): fileUrl is string => Boolean(fileUrl))
      .map((fileUrl, index) => ({
        restaurant_id: restaurantId,
        asset_type: group.type,
        file_url: fileUrl,
        file_path: extractStoragePath(fileUrl),
        sort_order: index,
        is_active: true,
      }))
  );
}

export function buildOpeningHoursRows(
  restaurantId: string,
  openingHours: Record<string, DayHours> | undefined
) {
  const dayIndexMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  return DAY_NAMES.map((day) => {
    const entry = openingHours?.[day] || openingHours?.[day.toLowerCase()] || {
      open: "",
      close: "",
      closed: false,
    };

    return {
      restaurant_id: restaurantId,
      day_of_week: dayIndexMap[day.toLowerCase()],
      open_time: entry.closed ? null : asString(entry.open),
      close_time: entry.closed ? null : asString(entry.close),
      is_closed: Boolean(entry.closed || (!entry.open && !entry.close)),
    };
  });
}

function normalizeMetadata(value: unknown) {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return { note: value };
    }
  }
  if (typeof value === "object") return value as Record<string, unknown>;
  return null;
}

export function buildOfferRows(restaurantId: string, offers: RestaurantOfferInput[] | undefined) {
  return (offers || [])
    .filter((offer) => asString(offer?.title))
    .map((offer) => ({
      restaurant_id: restaurantId,
      title: asString(offer.title) ?? "",
      description: asString(offer.description),
      badge_text: asString(offer.badge_text),
      offer_type:
        (() => {
          const offerType = asString(offer.offer_type)?.toLowerCase();
          if (offerType === "percentage" || offerType === "percent") return "percentage";
          if (offerType === "flat") return "flat";
          if (offerType === "cashback" || offerType === "cover_discount") return "cover_discount";
          return offerType;
        })(),
      discount_value: asNumber(offer.discount_value),
      min_spend: asNumber(offer.min_spend),
      start_at: asString(offer.start_at),
      end_at: asString(offer.end_at),
      is_active: offer.is_active !== false,
      metadata: (() => {
        const metadata = { ...(normalizeMetadata(offer.metadata) || {}) };
        const offerType = asString(offer.offer_type);
        if (offerType && offerType.toLowerCase() === "cover_discount") {
          metadata.offer_type_ui = "cover_discount";
        } else {
          delete metadata.offer_type_ui;
        }
        return metadata;
      })(),
    }));
}

export function buildSubscriptionRows(
  restaurantId: string,
  subscription: RestaurantSubscriptionInput | null | undefined
) {
  if (!subscription?.plan_code && !subscription?.status) return [];

  return [
    {
      restaurant_id: restaurantId,
      plan_code: asString(subscription.plan_code),
      status: asString(subscription.status) ?? "active",
      unlock_all: Boolean(subscription.unlock_all),
      time_slot_enabled: Boolean(subscription.time_slot_enabled),
      repeat_rewards_enabled: Boolean(subscription.repeat_rewards_enabled),
      dish_discounts_enabled: Boolean(subscription.dish_discounts_enabled),
      starts_at: asString(subscription.starts_at),
      expires_at: asString(subscription.expires_at),
    },
  ];
}

async function replaceRows(table: string, restaurantId: string, rows: Record<string, unknown>[]) {
  const { error: deleteError } = await supabaseBrowser
    .from(table)
    .delete()
    .eq("restaurant_id", restaurantId);

  if (deleteError) {
    throw new Error(`Failed to clear ${table}: ${deleteError.message || JSON.stringify(deleteError)}`);
  }
  if (!rows.length) return;

  const { error: insertError } = await supabaseBrowser.from(table).insert(rows);
  if (insertError) {
    throw new Error(`Failed to insert into ${table}: ${insertError.message || JSON.stringify(insertError)}`);
  }
}


export async function replaceRestaurantRelations(
  restaurantId: string,
  input: RestaurantRelationsInput
) {
  const tasks: Promise<void>[] = [
    replaceRows("restaurant_tags", restaurantId, buildTagRows(restaurantId, input)),
    replaceRows("restaurant_media_assets", restaurantId, buildMediaRows(restaurantId, input)),
    replaceRows("restaurant_offers", restaurantId, buildOfferRows(restaurantId, input.offers)),
    replaceRows(
      "restaurant_subscriptions",
      restaurantId,
      buildSubscriptionRows(restaurantId, input.subscription)
    ),
  ];

  if (input.opening_hours && Object.keys(input.opening_hours).length > 0) {
    tasks.push(
      replaceRows(
        "restaurant_opening_hours",
        restaurantId,
        buildOpeningHoursRows(restaurantId, input.opening_hours)
      )
    );
  }

  await Promise.all(tasks);
}

/**
 * Update the restaurants row in the primary DB only.
 * Second-DB sync is handled server-side via PATCH /api/restaurants/[id].
 */
export async function updateRestaurantBothDBs(
  restaurantId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const { error } = await supabaseBrowser
    .from("restaurants")
    .update(payload)
    .eq("id", restaurantId);

  if (error) throw error;
}

/**
 * @deprecated Use updateRestaurantBothDBs instead.
 * Kept for any external callers; delegates to the parallel version.
 */
export async function mirrorRestaurantUpdate(
  restaurantId: string,
  payload: Record<string, unknown>
) {
  await updateRestaurantBothDBs(restaurantId, payload);
}

import { supabaseBrowser } from "@/lib/supabaseBrowser";

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
  };
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
  const urls: string[] = [];
  const uploadedPaths: string[] = [];

  try {
    for (const file of files) {
      const path = buildRestaurantStoragePath(restaurantId, assetType, file.name);

      const { error } = await supabaseBrowser.storage
        .from(RESTAURANT_STORAGE_BUCKET)
        .upload(path, file);

      if (error) throw error;
      uploadedPaths.push(path);

      const { data } = supabaseBrowser.storage
        .from(RESTAURANT_STORAGE_BUCKET)
        .getPublicUrl(path);

      urls.push(data.publicUrl);
    }

    return urls;
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
    is_advertised: Boolean(input.is_advertised),
    ad_priority: asNumber(input.ad_priority),
    ad_starts_at: asString(input.ad_starts_at),
    ad_ends_at: asString(input.ad_ends_at),
    ad_badge_text: asString(input.ad_badge_text),
    booking_terms: input.booking_terms && input.booking_terms.length ? input.booking_terms : null,
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
  };

  for (const [key, value] of Object.entries(optionalValues)) {
    if (hasValue(value)) {
      payload[key] = value;
    }
  }

  return payload;
}

function buildTagRows(restaurantId: string, input: RestaurantRelationsInput) {
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

function buildMediaRows(restaurantId: string, input: RestaurantRelationsInput) {
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

function buildOpeningHoursRows(
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

function buildOfferRows(restaurantId: string, offers: RestaurantOfferInput[] | undefined) {
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

function buildSubscriptionRows(
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

  if (deleteError) throw deleteError;
  if (!rows.length) return;

  const { error: insertError } = await supabaseBrowser.from(table).insert(rows);
  if (insertError) throw insertError;
}

export async function replaceRestaurantRelations(
  restaurantId: string,
  input: RestaurantRelationsInput
) {
  await Promise.all([
    replaceRows("restaurant_tags", restaurantId, buildTagRows(restaurantId, input)),
    replaceRows("restaurant_media_assets", restaurantId, buildMediaRows(restaurantId, input)),
    replaceRows(
      "restaurant_opening_hours",
      restaurantId,
      buildOpeningHoursRows(restaurantId, input.opening_hours)
    ),
    replaceRows("restaurant_offers", restaurantId, buildOfferRows(restaurantId, input.offers)),
    replaceRows(
      "restaurant_subscriptions",
      restaurantId,
      buildSubscriptionRows(restaurantId, input.subscription)
    ),
  ]);
}

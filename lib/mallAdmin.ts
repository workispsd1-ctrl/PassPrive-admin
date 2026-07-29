import { supabaseBrowser } from "@/lib/supabaseBrowser";

export type MallRecord = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  logo_url: string | null;
  cover_image: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address_line1: string | null;
  address_line2: string | null;
  location_name: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;
  full_address: string | null;
  lat: number | null;
  lng: number | null;
  google_place_id: string | null;
  total_floors: number | null;
  parking_available: boolean;
  opening_hours: unknown;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number | null;
  created_at?: string;
  updated_at?: string;
};

export type MallStoreInfo = {
  id: string;
  name: string;
  category: string | null;
  logo_url: string | null;
  cover_image: string | null;
  city: string | null;
};

export type MallStoreLink = {
  id: string;
  mall_id: string;
  store_id: string;
  floor: string | null;
  unit_number: string | null;
  sort_order: number | null;
  store?: MallStoreInfo | null;
};

export function slugifyMall(text: string) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function asNum(v: unknown): number | null {
  const num = Number(v);
  return Number.isFinite(num) ? num : null;
}

function asStr(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : v == null ? "" : String(v);
  return s ? s : null;
}

export function emptyMall(): Partial<MallRecord> {
  return {
    name: "",
    slug: "",
    description: "",
    logo_url: null,
    cover_image: null,
    phone: "",
    email: "",
    website: "",
    address_line1: "",
    address_line2: "",
    location_name: "",
    city: "",
    region: "",
    postal_code: "",
    country: "Mauritius",
    lat: null,
    lng: null,
    google_place_id: "",
    total_floors: null,
    parking_available: false,
    is_active: true,
    is_featured: false,
    sort_order: null,
  };
}

export async function fetchMalls(): Promise<MallRecord[]> {
  const { data, error } = await supabaseBrowser
    .from("malls")
    .select("*")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as MallRecord[];
}

export async function fetchMallById(id: string): Promise<MallRecord | null> {
  const { data, error } = await supabaseBrowser.from("malls").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as MallRecord) || null;
}

export async function fetchMallStoreCounts(mallIds: string[]): Promise<Record<string, number>> {
  if (!mallIds.length) return {};
  const { data, error } = await supabaseBrowser.from("mall_stores").select("mall_id").in("mall_id", mallIds);
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of data || []) counts[(row as { mall_id: string }).mall_id] = (counts[(row as { mall_id: string }).mall_id] || 0) + 1;
  return counts;
}

export async function fetchMallStores(mallId: string): Promise<MallStoreLink[]> {
  const { data, error } = await supabaseBrowser
    .from("mall_stores")
    .select("id, mall_id, store_id, floor, unit_number, sort_order, store:stores(id, name, category, logo_url, cover_image, city)")
    .eq("mall_id", mallId)
    .order("sort_order", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data || []) as unknown as MallStoreLink[];
}

export function buildMallPayload(mall: Partial<MallRecord>) {
  const fullAddress =
    asStr(mall.full_address) ??
    ([mall.address_line1, mall.location_name, mall.city, mall.region, mall.country].filter(Boolean).join(", ") || null);
  return {
    name: asStr(mall.name) ?? "",
    slug: asStr(mall.slug) ?? slugifyMall(String(mall.name || "")),
    description: asStr(mall.description),
    logo_url: mall.logo_url ?? null,
    cover_image: mall.cover_image ?? null,
    phone: asStr(mall.phone),
    email: asStr(mall.email),
    website: asStr(mall.website),
    address_line1: asStr(mall.address_line1),
    address_line2: asStr(mall.address_line2),
    location_name: asStr(mall.location_name),
    city: asStr(mall.city),
    region: asStr(mall.region),
    postal_code: asStr(mall.postal_code),
    country: asStr(mall.country) ?? "Mauritius",
    full_address: fullAddress,
    lat: asNum(mall.lat),
    lng: asNum(mall.lng),
    google_place_id: asStr(mall.google_place_id),
    total_floors: asNum(mall.total_floors),
    parking_available: !!mall.parking_available,
    is_active: mall.is_active !== false,
    is_featured: !!mall.is_featured,
    sort_order: asNum(mall.sort_order),
  };
}

export async function createMall(mall: Partial<MallRecord>): Promise<string> {
  const { data, error } = await supabaseBrowser.from("malls").insert(buildMallPayload(mall)).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function updateMall(id: string, mall: Partial<MallRecord>): Promise<void> {
  const { error } = await supabaseBrowser.from("malls").update(buildMallPayload(mall)).eq("id", id);
  if (error) throw error;
}

export async function deleteMall(id: string): Promise<void> {
  const { error } = await supabaseBrowser.from("malls").delete().eq("id", id);
  if (error) throw error;
}

export async function addStoreToMall(
  mallId: string,
  storeId: string,
  extra?: { floor?: string | null; unit_number?: string | null; sort_order?: number | null }
): Promise<void> {
  const { error } = await supabaseBrowser.from("mall_stores").upsert(
    {
      mall_id: mallId,
      store_id: storeId,
      floor: extra?.floor ?? null,
      unit_number: extra?.unit_number ?? null,
      sort_order: extra?.sort_order ?? null,
    },
    { onConflict: "mall_id,store_id" }
  );
  if (error) throw error;
}

export async function updateMallStoreLink(
  linkId: string,
  patch: { floor?: string | null; unit_number?: string | null; sort_order?: number | null }
): Promise<void> {
  const { error } = await supabaseBrowser.from("mall_stores").update(patch).eq("id", linkId);
  if (error) throw error;
}

export async function removeStoreFromMall(mallId: string, storeId: string): Promise<void> {
  const { error } = await supabaseBrowser.from("mall_stores").delete().eq("mall_id", mallId).eq("store_id", storeId);
  if (error) throw error;
}

export async function searchStoresForMall(term: string, limit = 25): Promise<MallStoreInfo[]> {
  let q = supabaseBrowser
    .from("stores")
    .select("id, name, category, logo_url, cover_image, city")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(limit);
  const t = term.trim();
  if (t) q = q.ilike("name", `%${t}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as MallStoreInfo[];
}

export async function uploadMallImage(mallKey: string, kind: "logo" | "cover", file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${kind}/${mallKey}-${Date.now()}.${ext}`;
  const { error } = await supabaseBrowser.storage.from("malls").upload(path, file, { upsert: true });
  if (error) throw error;
  return supabaseBrowser.storage.from("malls").getPublicUrl(path).data.publicUrl;
}

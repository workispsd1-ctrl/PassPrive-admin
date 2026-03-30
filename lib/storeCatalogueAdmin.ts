import axios from "axios";

import { getTokenClient } from "@/lib/getTokenClient";

export type StoreType = "PRODUCT" | "SERVICE";
export type CatalogueItemType = "PRODUCT" | "SERVICE";

export type AdminCatalogueItem = {
  id?: string;
  clientId?: string;
  category_id?: string;
  title: string;
  description?: string | null;
  price?: number | null;
  image_url?: string | null;
  sku?: string | null;
  sort_order: number;
  is_available: boolean;
  item_type: CatalogueItemType;
  is_billable: boolean;
  duration_minutes?: number | null;
  supports_slot_booking: boolean;
};

export type AdminCatalogueCategory = {
  id?: string;
  clientId?: string;
  title: string;
  starting_from?: number | null;
  enabled: boolean;
  sort_order: number;
  items: AdminCatalogueItem[];
};

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeArray(payload: unknown) {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];

  const keys = ["items", "data", "results", "categories"];
  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key] as unknown[];
  }

  return [];
}

function normalizeObject(payload: unknown) {
  if (!isRecord(payload)) return null;

  const keys = ["item", "data", "result", "category"];
  for (const key of keys) {
    if (isRecord(payload[key])) return payload[key] as Record<string, unknown>;
  }

  return payload;
}

async function getAuthHeaders() {
  const token = await getTokenClient();
  if (!token) {
    throw new Error("Not logged in. Please login again as admin or superadmin.");
  }

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function fetchStoreCatalogueAdmin(storeId: string) {
  const headers = await getAuthHeaders();

  const [categoriesResponse, itemsResponse] = await Promise.all([
    axios.get(`${API_BASE}/api/store-catalogue/stores/${storeId}/categories`, { headers }),
    axios.get(`${API_BASE}/api/store-catalogue/stores/${storeId}/items`, { headers }),
  ]);

  const categories = normalizeArray(categoriesResponse.data)
    .map((row) => normalizeObject(row))
    .filter(Boolean) as Record<string, unknown>[];

  const items = normalizeArray(itemsResponse.data)
    .map((row) => normalizeObject(row))
    .filter(Boolean) as Record<string, unknown>[];

  return categories
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
    .map((category) => ({
      id: String(category.id),
      title: String(category.title ?? ""),
      starting_from:
        category.starting_from === null || category.starting_from === undefined
          ? null
          : Number(category.starting_from),
      enabled: Boolean(category.enabled ?? true),
      sort_order: Number(category.sort_order ?? 0),
      items: items
        .filter((item) => String(item.category_id ?? "") === String(category.id))
        .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
        .map((item) => ({
          id: String(item.id),
          category_id: String(item.category_id ?? ""),
          title: String(item.title ?? ""),
          description: typeof item.description === "string" ? item.description : "",
          price:
            item.price === null || item.price === undefined ? null : Number(item.price),
          image_url: typeof item.image_url === "string" ? item.image_url : null,
          sku: typeof item.sku === "string" ? item.sku : "",
          sort_order: Number(item.sort_order ?? 0),
          is_available: Boolean(item.is_available ?? true),
          item_type: String(item.item_type ?? "PRODUCT") as CatalogueItemType,
          is_billable: Boolean(item.is_billable ?? false),
          duration_minutes:
            item.duration_minutes === null || item.duration_minutes === undefined
              ? null
              : Number(item.duration_minutes),
          supports_slot_booking: Boolean(item.supports_slot_booking ?? false),
        })),
    }));
}

export async function syncStoreCatalogueAdmin(args: {
  storeId: string;
  categories: AdminCatalogueCategory[];
  deletedCategoryIds: string[];
  deletedItemIds: string[];
}) {
  const { storeId, categories, deletedCategoryIds, deletedItemIds } = args;
  const headers = await getAuthHeaders();

  for (const itemId of deletedItemIds) {
    await axios.delete(`${API_BASE}/api/store-catalogue/items/${itemId}`, { headers });
  }

  for (const categoryId of deletedCategoryIds) {
    await axios.delete(`${API_BASE}/api/store-catalogue/categories/${categoryId}`, { headers });
  }

  const categoryIdMap = new Map<string, string>();

  for (const category of categories.sort((a, b) => a.sort_order - b.sort_order)) {
    const payload = {
      store_id: storeId,
      title: category.title,
      starting_from: category.starting_from ?? null,
      enabled: category.enabled,
      sort_order: category.sort_order,
    };

    if (category.id) {
      await axios.put(
        `${API_BASE}/api/store-catalogue/categories/${category.id}`,
        payload,
        { headers }
      );
      categoryIdMap.set(category.id, category.id);
    } else {
      const response = await axios.post(`${API_BASE}/api/store-catalogue/categories`, payload, {
        headers,
      });
      const created = normalizeObject(response.data);
      const createdId = created?.id ? String(created.id) : "";
      if (!createdId) throw new Error("Category created without id.");
      if (category.clientId) categoryIdMap.set(category.clientId, createdId);
    }
  }

  for (const category of categories.sort((a, b) => a.sort_order - b.sort_order)) {
    const resolvedCategoryId =
      category.id ||
      (category.clientId ? categoryIdMap.get(category.clientId) : undefined);

    if (!resolvedCategoryId) {
      throw new Error(`Missing category id for ${category.title}.`);
    }

    for (const item of category.items.sort((a, b) => a.sort_order - b.sort_order)) {
      const payload = {
        store_id: storeId,
        category_id: resolvedCategoryId,
        title: item.title,
        description: item.description?.trim() || null,
        price: item.price ?? null,
        image_url: item.image_url?.trim() || null,
        sku: item.sku?.trim() || null,
        sort_order: item.sort_order,
        is_available: item.is_available,
        item_type: item.item_type,
        is_billable: item.is_billable,
        duration_minutes: item.duration_minutes ?? null,
        supports_slot_booking: item.supports_slot_booking,
      };

      if (item.id) {
        await axios.put(`${API_BASE}/api/store-catalogue/items/${item.id}`, payload, {
          headers,
        });
      } else {
        await axios.post(`${API_BASE}/api/store-catalogue/items`, payload, { headers });
      }
    }
  }
}

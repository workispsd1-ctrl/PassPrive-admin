import { supabaseBrowser } from "@/lib/supabaseBrowser";

export type StoreTypeOption = "PRODUCT" | "SERVICE";

type CategoryRow = {
  title?: string | null;
};

export function getCategorySourceTable(storeType: StoreTypeOption) {
  return storeType === "SERVICE" ? "service_categories" : "store_mood_categories";
}

export function getCategorySourceEmptyLabel(storeType: StoreTypeOption) {
  return storeType === "SERVICE"
    ? "No service categories found"
    : "No store mood categories found";
}

export function getCategorySelectLabel(storeType: StoreTypeOption) {
  return storeType === "SERVICE" ? "Select service categories" : "Select categories";
}

export async function fetchCategoryOptions(storeType: StoreTypeOption) {
  const { data, error } = await supabaseBrowser
    .from(getCategorySourceTable(storeType))
    .select("title")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (error) throw error;

  return Array.from(
    new Set(
      ((data as CategoryRow[] | null) || [])
        .map((item) => (typeof item?.title === "string" ? item.title.trim() : ""))
        .filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right));
}

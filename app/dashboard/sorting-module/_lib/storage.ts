import { Screen } from "../_components/ScreenDetailDialog";

const STORAGE_KEY = "sorting_module_screens";

export function loadScreens(): Screen[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveScreens(screens: Screen[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(screens));
}

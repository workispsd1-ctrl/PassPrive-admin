export const inputClass =
  "border border-gray-300 focus:border-gray-400 focus:ring-0";

export const PRIMARY_BTN = "bg-indigo-600 text-white hover:bg-indigo-700";
export const PRIMARY_BTN_OUTLINE =
  "border-indigo-200 text-indigo-700 hover:bg-indigo-50";

export const ICON_INDIGO = "text-indigo-600";

export const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const DEFAULT_CATALOGUE_PRESETS: Array<{
  title: string;
  starting_from: string;
}> = [
  { title: "New Arrivals", starting_from: "" },
  { title: "Hot Drops", starting_from: "" },
  { title: "Mens Wear", starting_from: "" },
  { title: "Women Wear", starting_from: "" },
  { title: "Kids Wear", starting_from: "" },
  { title: "Sneakers", starting_from: "" },
  { title: "Accessories", starting_from: "" },
  { title: "Home & Living", starting_from: "" },
];

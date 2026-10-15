export const MAURITIUS_TZ = "Indian/Mauritius";

const MAURITIUS_OFFSET_MS = 4 * 60 * 60 * 1000;
const NAIVE_INPUT = /^(\d{4}-\d{2}-\d{2})(T(\d{2}:\d{2})(:\d{2}(\.\d+)?)?)?$/;

export function mauritiusInputToIso(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim();
  const match = raw.match(NAIVE_INPUT);
  if (!match) {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  const time = match[3] ? `${match[3]}${match[4] ?? ":00"}` : "00:00:00";
  const parsed = new Date(`${match[1]}T${time}+04:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function isoToMauritiusInput(value: unknown, kind: "datetime" | "date" = "datetime"): string {
  if (typeof value !== "string" || !value.trim()) return "";
  const raw = value.trim();
  const naive = raw.match(NAIVE_INPUT);
  if (naive) return kind === "date" ? naive[1] : `${naive[1]}T${naive[3] ?? "00:00"}`;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  const shifted = new Date(parsed.getTime() + MAURITIUS_OFFSET_MS).toISOString();
  return kind === "date" ? shifted.slice(0, 10) : shifted.slice(0, 16);
}

export function mauritiusNowInput(date: Date = new Date()): string {
  return new Date(date.getTime() + MAURITIUS_OFFSET_MS).toISOString().slice(0, 16);
}

export function mauritiusDateAtCurrentTimeIso(day: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  return mauritiusInputToIso(`${day}T${mauritiusNowInput().slice(11, 16)}`);
}

export function formatMauritius(value: unknown, options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" }) {
  if (typeof value !== "string" || !value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("en-GB", { ...options, timeZone: MAURITIUS_TZ });
}

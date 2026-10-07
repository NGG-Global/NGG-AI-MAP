import type { Locale } from "@/domain/shared/enums";

const localeTag: Record<Locale, string> = { he: "he-IL", en: "en-GB" };

export function formatNumber(value: number, locale: Locale, fractionDigits = 0): string {
  return new Intl.NumberFormat(localeTag[locale], {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatScore(value: number | null | undefined, locale: Locale, digits = 1): string {
  if (value == null || Number.isNaN(value)) return "—";
  return formatNumber(value, locale, digits);
}

export function formatPercent(value: number | null | undefined, locale: Locale, digits = 0): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${formatNumber(value, locale, digits)}%`;
}

export function formatDate(value: Date | string | null | undefined, locale: Locale, opts?: Intl.DateTimeFormatOptions): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(localeTag[locale], opts ?? { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function formatMonth(value: Date | string | null | undefined, locale: Locale): string {
  return formatDate(value, locale, { month: "short", year: "numeric" });
}

export function formatDateTime(value: Date | string | null | undefined, locale: Locale): string {
  return formatDate(value, locale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Formats a delta with an explicit sign; callers wrap it in <bdi dir="ltr">. */
export function formatDelta(delta: number | null | undefined, locale: Locale, digits = 1): string {
  if (delta == null || Number.isNaN(delta)) return "—";
  const abs = formatNumber(Math.abs(delta), locale, digits);
  if (Math.abs(delta) < 0.05) return abs;
  return delta > 0 ? `+${abs}` : `−${abs}`;
}

export function toDateInputValue(value: Date | null | undefined): string {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

/** Consonant transliteration so Hebrew client names still produce a readable Latin identifier. */
const HEBREW_TO_LATIN: Record<string, string> = {
  א: "a", ב: "b", ג: "g", ד: "d", ה: "h", ו: "v", ז: "z", ח: "ch", ט: "t", י: "y", כ: "k", ך: "k", ל: "l", מ: "m", ם: "m",
  נ: "n", ן: "n", ס: "s", ע: "a", פ: "p", ף: "f", צ: "tz", ץ: "tz", ק: "k", ר: "r", ש: "sh", ת: "t",
};

/** Lowercase Latin letters, digits and single hyphens; at most 60 characters. Never throws. */
export function slugify(input: string): string {
  return input
    .replace(/[\u0590-\u05FF]/g, (ch) => HEBREW_TO_LATIN[ch] ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

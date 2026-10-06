import type { Locale } from "./enums";

/** Hebrew is required; English is optional and falls back to Hebrew. */
export interface LocalizedText {
  he: string;
  en?: string;
}

export function lt(text: LocalizedText | string | null | undefined, locale: Locale): string {
  if (text == null) return "";
  if (typeof text === "string") return text;
  if (locale === "en" && text.en) return text.en;
  return text.he;
}

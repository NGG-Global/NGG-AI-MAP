import type { Locale } from "@/domain/shared/enums";
import { he, type Dictionary } from "./he";
import { en } from "./en";

const dictionaries: Record<Locale, Dictionary> = { he, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? he;
}

export function dirFor(locale: Locale): "rtl" | "ltr" {
  return locale === "he" ? "rtl" : "ltr";
}

export type { Dictionary };

/** Fills `{name}` placeholders in a dictionary template. Dictionaries are plain data so they can cross the server/client boundary. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}

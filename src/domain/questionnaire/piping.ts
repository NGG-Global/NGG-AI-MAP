import { lt, type LocalizedText } from "@/domain/shared/localized";
import type { Locale } from "@/domain/shared/enums";
import type { QuestionnaireDefinition } from "./definition";

/**
 * Piped values in respondent-facing copy (Master Questionnaire Copy §5, §8):
 * {{primary_ai_tool}} — the respondent's main AI tool; {{org_name}}; {{minutes}}.
 * When a value cannot be resolved the item's fallback wording is used instead.
 */

export const PRIMARY_TOOL_QUESTION = "USE_03";
export const TOOLS_QUESTION = "USE_02";
/** Options that name a specific product; categories ("internal AI tool") are not piped into S-TIAS. */
export const SPECIFIC_TOOL_VALUES = new Set(["chatgpt", "claude", "gemini", "copilot"]);

export interface PipingContext {
  primaryAiTool?: string;
  orgName?: string;
  minutes?: number;
}

/** Resolves the primary tool: the USE_03 answer, or the single specific tool selected in USE_02. */
export function resolvePrimaryTool(def: QuestionnaireDefinition, answers: Record<string, unknown>, locale: Locale): string | undefined {
  const tools = def.sections.flatMap((s) => s.questions).find((q) => q.canonicalId === TOOLS_QUESTION);
  const labelOf = (value: string) => lt(tools?.options?.find((o) => o.value === value)?.label, locale) || undefined;
  const primary = answers[PRIMARY_TOOL_QUESTION];
  if (typeof primary === "string" && SPECIFIC_TOOL_VALUES.has(primary)) return labelOf(primary);
  const selected = Array.isArray(answers[TOOLS_QUESTION]) ? (answers[TOOLS_QUESTION] as string[]) : [];
  if (selected.length === 1 && SPECIFIC_TOOL_VALUES.has(selected[0]!)) return labelOf(selected[0]!);
  return undefined;
}

const TOKEN = /\{\{(\w+)\}\}/g;

function fill(text: string, ctx: PipingContext): { text: string; complete: boolean } {
  let complete = true;
  const out = text.replace(TOKEN, (_, key: string) => {
    const value = key === "primary_ai_tool" ? ctx.primaryAiTool : key === "org_name" ? ctx.orgName : key === "minutes" ? (ctx.minutes != null ? String(ctx.minutes) : undefined) : undefined;
    if (value == null || value === "") {
      complete = false;
      return "";
    }
    return value;
  });
  return { text: out, complete };
}

/** Localises and fills a text; returns the fallback when any token is unresolved. */
export function pipe(text: LocalizedText | undefined, fallback: LocalizedText | undefined, locale: Locale, ctx: PipingContext): string {
  if (!text) return "";
  const filled = fill(lt(text, locale), ctx);
  if (filled.complete || !fallback) return filled.text;
  return fill(lt(fallback, locale), ctx).text;
}

/** For builder previews: shows the token in brackets so editors see where values are inserted. */
export function previewText(text: LocalizedText | undefined, locale: Locale): string {
  return lt(text, locale).replace(TOKEN, (_, key: string) => `[${key}]`);
}

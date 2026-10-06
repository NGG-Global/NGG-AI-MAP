import type { Audience, SegmentKey } from "@/domain/shared/enums";
import { SECONDS_PER_QUESTION } from "./library";
import type { DisplayRule, QuestionDefinition, QuestionnaireDefinition, SectionDefinition } from "./definition";
import type { MetricConfig } from "@/domain/measurement/config";
import type { ResponseValue } from "@/server/db/schema";

/* ------------------------------------------------------------- routing */

export interface RoutingContext {
  /** Respondent attributes (segment keys). */
  attributes: Partial<Record<SegmentKey, string | boolean>>;
  /** Answers given so far, by canonical question id. `null` = prefer not to answer. */
  answers: Record<string, ResponseValue | undefined>;
}

function resolveField(field: string, ctx: RoutingContext): unknown {
  if (field.startsWith("attr:")) return ctx.attributes[field.slice(5) as SegmentKey];
  if (field.startsWith("q:")) return ctx.answers[field.slice(2)];
  return undefined;
}

function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (value == null) return [];
  return [String(value)];
}

export function evaluateRule(rule: DisplayRule, ctx: RoutingContext): boolean {
  const actual = resolveField(rule.field, ctx);
  switch (rule.operator) {
    case "truthy":
      return actual === true || actual === "yes" || actual === "true";
    case "falsy":
      return !(actual === true || actual === "yes" || actual === "true");
    case "eq":
      return asList(actual).includes(String(rule.value));
    case "neq":
      // An unanswered field does not equal the value, so the rule passes.
      return !asList(actual).includes(String(rule.value));
    case "in":
      return asList(actual).some((v) => asList(rule.value).includes(v));
    case "not_in":
      return !asList(actual).some((v) => asList(rule.value).includes(v));
  }
}

/** All rules must hold (AND). No rules = always shown. */
export function rulesPass(rules: DisplayRule[] | undefined, ctx: RoutingContext): boolean {
  return (rules ?? []).every((rule) => evaluateRule(rule, ctx));
}

export function audienceMatches(audience: Audience | undefined, isManager: boolean | undefined): boolean {
  if (!audience || audience === "all") return true;
  if (audience === "managers") return isManager === true;
  return isManager !== true;
}

function isManagerOf(ctx: RoutingContext): boolean | undefined {
  const attr = ctx.attributes.is_manager;
  if (attr === true || attr === "true" || attr === "yes") return true;
  if (attr === false || attr === "false" || attr === "no") return false;
  return undefined;
}

export function isSectionVisible(section: SectionDefinition, ctx: RoutingContext): boolean {
  return audienceMatches(section.audience, isManagerOf(ctx)) && rulesPass(section.displayRules, ctx);
}

export function isQuestionVisible(section: SectionDefinition, question: QuestionDefinition, ctx: RoutingContext): boolean {
  if (!isSectionVisible(section, ctx)) return false;
  return audienceMatches(question.audience, isManagerOf(ctx)) && rulesPass(question.displayRules, ctx);
}

/** The ordered list of sections (with visible questions) a respondent will actually see. */
export function routeQuestionnaire(def: QuestionnaireDefinition, ctx: RoutingContext): Array<{ section: SectionDefinition; questions: QuestionDefinition[] }> {
  return def.sections
    .filter((section) => isSectionVisible(section, ctx))
    .map((section) => ({ section, questions: section.questions.filter((q) => isQuestionVisible(section, q, ctx)) }))
    .filter((entry) => entry.questions.length > 0);
}

/* ------------------------------------------------------------- summary */

export interface QuestionnaireSummary {
  totalQuestions: number;
  employeeQuestions: number;
  managerQuestions: number;
  validatedItems: number;
  nggItems: number;
  customItems: number;
  estimatedMinutesEmployee: number;
  estimatedMinutesManager: number;
  sections: number;
  placeholderWordingItems: number;
}

const PERSONAS: Record<"employee" | "manager", RoutingContext> = {
  employee: { attributes: { is_manager: false }, answers: { ctx_is_manager: "no", ctx_ai_use_30d: "weekly" } },
  manager: { attributes: { is_manager: true }, answers: { ctx_is_manager: "yes", ctx_ai_use_30d: "weekly" } },
};

export function summarizeQuestionnaire(def: QuestionnaireDefinition): QuestionnaireSummary {
  const all = def.sections.flatMap((s) => s.questions);
  const count = (persona: RoutingContext) => routeQuestionnaire(def, persona).reduce((n, e) => n + e.questions.length, 0);
  const minutes = (persona: RoutingContext) =>
    Math.max(
      1,
      Math.round(
        routeQuestionnaire(def, persona)
          .flatMap((e) => e.questions)
          .reduce((sec, q) => sec + (SECONDS_PER_QUESTION[q.type] ?? 10), 0) / 60,
      ),
    );
  return {
    totalQuestions: all.length,
    employeeQuestions: count(PERSONAS.employee),
    managerQuestions: count(PERSONAS.manager),
    validatedItems: all.filter((q) => q.sourceType === "validated").length,
    nggItems: all.filter((q) => q.sourceType === "ngg_measure").length,
    customItems: all.filter((q) => q.sourceType === "client_custom").length,
    estimatedMinutesEmployee: minutes(PERSONAS.employee),
    estimatedMinutesManager: minutes(PERSONAS.manager),
    sections: def.sections.length,
    placeholderWordingItems: all.filter((q) => q.wordingStatus === "placeholder").length,
  };
}

export const PREVIEW_PERSONAS = {
  employee: PERSONAS.employee,
  manager: PERSONAS.manager,
  non_ai_user: { attributes: { is_manager: false }, answers: { ctx_is_manager: "no", ctx_ai_use_30d: "none" } } satisfies RoutingContext,
};
export type PreviewPersona = keyof typeof PREVIEW_PERSONAS;

/* -------------------------------------------------------------- locking */

export class LockedItemError extends Error {
  constructor(canonicalId: string) {
    super(`locked_item:${canonicalId}`);
    this.name = "LockedItemError";
  }
}

export function assertEditable(question: QuestionDefinition): void {
  if (question.locked) throw new LockedItemError(question.canonicalId);
}

/**
 * Creates a client-custom copy of a question. The copy is detached from the validated scale:
 * new canonical id, no metric link, not locked, provenance kept in `derivedFromCanonicalId` (spec §11).
 */
export function createCustomCopy(question: QuestionDefinition, newId: string): QuestionDefinition {
  return {
    ...question,
    id: newId,
    canonicalId: `custom:${newId}`,
    version: "1.0",
    sourceType: "client_custom",
    locked: false,
    metricId: undefined,
    reverseCoded: false,
    derivedFromCanonicalId: question.canonicalId,
    wordingStatus: "final",
  };
}

/* ------------------------------------------------------------ versioning */

export function nextVersionLabel(current: string, kind: "minor" | "major" = "minor"): string {
  const [majorRaw, minorRaw] = current.split(".");
  const major = Number(majorRaw ?? "1") || 1;
  const minor = Number(minorRaw ?? "0") || 0;
  return kind === "major" ? `${major + 1}.0` : `${major}.${minor + 1}`;
}

/* ---------------------------------------------------------- comparability */

export interface QuestionDiff {
  added: QuestionDefinition[];
  removed: QuestionDefinition[];
  /** Same canonical id, different wording/scale (only possible for non-locked items). */
  modified: Array<{ before: QuestionDefinition; after: QuestionDefinition }>;
  unchanged: number;
}

export interface MetricComparability {
  metricId: string;
  baselineItems: number;
  sharedItems: number;
  /** full = all baseline items present, partial = some, none = metric unavailable for comparison. */
  level: "full" | "partial" | "none";
}

export interface Comparability {
  percent: number;
  diff: QuestionDiff;
  metrics: MetricComparability[];
  /** Metrics that are no longer fully comparable with the baseline. */
  affectedMetricIds: string[];
}

function comparableKey(q: QuestionDefinition): string {
  // Items compare when wording and scale are identical; option values matter for choice items.
  return JSON.stringify({ text: q.text, scale: q.scale, options: q.options?.map((o) => o.value), type: q.type, reverseCoded: q.reverseCoded });
}

export function diffQuestionnaires(baseline: QuestionnaireDefinition, current: QuestionnaireDefinition): QuestionDiff {
  const base = new Map(baseline.sections.flatMap((s) => s.questions).map((q) => [q.canonicalId, q]));
  const cur = new Map(current.sections.flatMap((s) => s.questions).map((q) => [q.canonicalId, q]));
  const added: QuestionDefinition[] = [];
  const removed: QuestionDefinition[] = [];
  const modified: QuestionDiff["modified"] = [];
  let unchanged = 0;
  for (const [id, q] of cur) {
    const before = base.get(id);
    if (!before) added.push(q);
    else if (comparableKey(before) !== comparableKey(q)) modified.push({ before, after: q });
    else unchanged += 1;
  }
  for (const [id, q] of base) if (!cur.has(id)) removed.push(q);
  return { added, removed, modified, unchanged };
}

/**
 * Comparability is measured on the baseline's metric items: how many of the baseline items that feed
 * each metric are still present and unchanged. Custom questions never count (spec §15, §27).
 */
export function computeComparability(baseline: QuestionnaireDefinition, current: QuestionnaireDefinition, metrics: MetricConfig[]): Comparability {
  const diff = diffQuestionnaires(baseline, current);
  const baseItems = new Set(baseline.sections.flatMap((s) => s.questions).filter((q) => q.sourceType !== "client_custom").map((q) => q.canonicalId));
  const comparableItems = new Set(
    current.sections
      .flatMap((s) => s.questions)
      .filter((q) => baseItems.has(q.canonicalId) && !diff.modified.some((m) => m.after.canonicalId === q.canonicalId))
      .map((q) => q.canonicalId),
  );
  const metricRows: MetricComparability[] = [];
  for (const metric of metrics) {
    const items = metric.pair ? [metric.pair.managerItemId, metric.pair.employeeItemId] : metric.itemCanonicalIds;
    const baselineItems = items.filter((id) => baseItems.has(id));
    if (baselineItems.length === 0) continue;
    const sharedItems = baselineItems.filter((id) => comparableItems.has(id)).length;
    metricRows.push({
      metricId: metric.id,
      baselineItems: baselineItems.length,
      sharedItems,
      level: sharedItems === baselineItems.length ? "full" : sharedItems === 0 ? "none" : "partial",
    });
  }
  const percent = baseItems.size === 0 ? 100 : Math.round((comparableItems.size / baseItems.size) * 100);
  return {
    percent,
    diff,
    metrics: metricRows,
    affectedMetricIds: metricRows.filter((m) => m.level !== "full").map((m) => m.metricId),
  };
}

/** Sections that were part of the baseline but are missing now (for the "removed since T0" warning). */
export function removedSections(baseline: QuestionnaireDefinition, current: QuestionnaireDefinition): SectionDefinition[] {
  const keys = new Set(current.sections.map((s) => s.key));
  return baseline.sections.filter((s) => !keys.has(s.key));
}

import { z } from "zod";
import { AUDIENCES, QUESTION_TYPES, RESEARCH_STATUSES, SOURCE_TYPES } from "@/domain/shared/enums";

/**
 * A questionnaire version is a self-contained JSON document. Once a wave is published with it,
 * the document is frozen (spec §38). Everything the survey runtime, the measurement engine and the
 * comparability calculation need is inside this document, so a wave never depends on mutable library rows.
 */

export const localizedTextSchema = z.object({
  he: z.string(),
  en: z.string().optional(),
});

export const displayRuleOperatorSchema = z.enum(["eq", "neq", "in", "not_in", "truthy", "falsy"]);
export type DisplayRuleOperator = z.infer<typeof displayRuleOperatorSchema>;

/**
 * `field` is either `attr:<segment key>` (respondent attribute, e.g. `attr:is_manager`) or
 * `q:<canonical question id>` (an earlier answer, e.g. `q:ctx_ai_use_30d`).
 */
export const displayRuleSchema = z.object({
  field: z.string().min(1),
  operator: displayRuleOperatorSchema,
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).optional(),
});
export type DisplayRule = z.infer<typeof displayRuleSchema>;

export const choiceOptionSchema = z.object({
  value: z.string().min(1),
  label: localizedTextSchema,
  /** Optional numeric weight used by scoring for single-choice items (e.g. usage frequency). */
  score: z.number().optional(),
});
export type ChoiceOption = z.infer<typeof choiceOptionSchema>;

export const scaleSchema = z.object({
  min: z.number().int(),
  max: z.number().int(),
  labels: z.array(localizedTextSchema).optional(),
});
export type Scale = z.infer<typeof scaleSchema>;

export const questionDefinitionSchema = z.object({
  /** Instance id inside this definition. */
  id: z.string().min(1),
  /** Stable id across versions and waves (library canonical id or `custom:<uuid>`). */
  canonicalId: z.string().min(1),
  version: z.string().min(1),
  type: z.enum(QUESTION_TYPES),
  sourceType: z.enum(SOURCE_TYPES),
  /** Validated items are locked: text, scale and scoring cannot change. */
  locked: z.boolean(),
  text: localizedTextSchema,
  helpText: localizedTextSchema.optional(),
  options: z.array(choiceOptionSchema).optional(),
  scale: scaleSchema.optional(),
  matrixRows: z.array(z.object({ key: z.string(), label: localizedTextSchema })).optional(),
  matrixColumns: z.array(choiceOptionSchema).optional(),
  required: z.boolean(),
  allowPreferNotToAnswer: z.boolean().default(true),
  audience: z.enum(AUDIENCES).optional(),
  reverseCoded: z.boolean().default(false),
  /** Metric this item feeds; custom questions never feed validated metrics. */
  metricId: z.string().optional(),
  /** Set on custom copies of library items: the canonical id they were derived from. */
  derivedFromCanonicalId: z.string().optional(),
  displayRules: z.array(displayRuleSchema).default([]),
  /** Wording provenance flag for the methodology page and builder notices. */
  wordingStatus: z.enum(["final", "placeholder", "illustrative"]).default("final"),
});
export type QuestionDefinition = z.infer<typeof questionDefinitionSchema>;

export const sectionDefinitionSchema = z.object({
  id: z.string().min(1),
  /** Library section key (stable), or `custom:<uuid>` for client sections. */
  key: z.string().min(1),
  templateVersion: z.string().optional(),
  title: localizedTextSchema,
  /** Optional respondent-facing label override (spec §11 "Change visual label"). */
  displayTitle: localizedTextSchema.optional(),
  description: localizedTextSchema,
  clientNote: localizedTextSchema.optional(),
  sourceType: z.enum(SOURCE_TYPES),
  researchStatus: z.enum(RESEARCH_STATUSES),
  audience: z.enum(AUDIENCES),
  recommendedCore: z.boolean().default(false),
  longitudinalCore: z.boolean().default(false),
  required: z.boolean().default(true),
  allowPreferNotToAnswer: z.boolean().default(true),
  displayRules: z.array(displayRuleSchema).default([]),
  questions: z.array(questionDefinitionSchema),
});
export type SectionDefinition = z.infer<typeof sectionDefinitionSchema>;

export const questionnaireDefinitionSchema = z.object({
  schemaVersion: z.literal(1),
  title: localizedTextSchema,
  intro: localizedTextSchema.optional(),
  privacyNote: localizedTextSchema.optional(),
  sections: z.array(sectionDefinitionSchema),
});
export type QuestionnaireDefinition = z.infer<typeof questionnaireDefinitionSchema>;

export function parseDefinition(input: unknown): QuestionnaireDefinition {
  return questionnaireDefinitionSchema.parse(input);
}

export function allQuestions(def: QuestionnaireDefinition): Array<{ section: SectionDefinition; question: QuestionDefinition }> {
  return def.sections.flatMap((section) => section.questions.map((question) => ({ section, question })));
}

export function findQuestion(def: QuestionnaireDefinition, canonicalId: string): QuestionDefinition | undefined {
  for (const s of def.sections) {
    const q = s.questions.find((x) => x.canonicalId === canonicalId);
    if (q) return q;
  }
  return undefined;
}

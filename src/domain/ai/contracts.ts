import { z } from "zod";

/**
 * Structured contracts between the backend and any AI provider (spec §29, §55).
 * Everything the model returns is validated against these schemas before it is stored.
 */

export const evidenceRefSchema = z.object({
  metricId: z.string(),
  waveCode: z.string(),
  score: z.number().nullable(),
  delta: z.number().nullable().optional(),
  n: z.number(),
  segment: z.string().optional(),
});
export type EvidenceRef = z.infer<typeof evidenceRefSchema>;

export const executiveSummarySchema = z.object({
  summary: z.string().min(1),
  currentState: z.string().min(1),
  biggestChange: z.string().min(1),
  primaryRisk: z.string().min(1),
  recommendedPriority: z.string().min(1),
  keyChanges: z.array(z.object({ text: z.string(), metricIds: z.array(z.string()) })),
  risks: z.array(z.object({ text: z.string(), metricIds: z.array(z.string()) })),
  opportunities: z.array(z.object({ text: z.string(), metricIds: z.array(z.string()) })),
  insufficientEvidence: z.boolean().default(false),
});
export type ExecutiveSummary = z.infer<typeof executiveSummarySchema>;

export const metricChangeExplanationSchema = z.object({
  metricId: z.string(),
  whatChanged: z.string(),
  relatedChanges: z.array(z.object({ metricId: z.string(), text: z.string() })),
  canConclude: z.array(z.string()),
  cannotConclude: z.array(z.string()),
  insufficientEvidence: z.boolean().default(false),
});
export type MetricChangeExplanation = z.infer<typeof metricChangeExplanationSchema>;

export const goalSuggestionSchema = z.object({
  title: z.string().min(1),
  rationale: z.string().min(1),
  relatedMetrics: z.array(z.string()).min(1),
  recommendedActions: z.array(z.string()).min(1),
  successEvidence: z.array(z.string()),
  suggestedReviewPeriod: z.string(),
});
export const goalSuggestionsSchema = z.object({
  goals: z.array(goalSuggestionSchema).min(1).max(3),
  insufficientEvidence: z.boolean().default(false),
});
export type GoalSuggestions = z.infer<typeof goalSuggestionsSchema>;

export const openTextThemesSchema = z.object({
  themes: z.array(
    z.object({
      theme: z.string(),
      frequency: z.number().int().min(0),
      representativeParaphrases: z.array(z.string()),
    }),
  ),
  responseCount: z.number().int(),
  insufficientEvidence: z.boolean().default(false),
});
export type OpenTextThemes = z.infer<typeof openTextThemesSchema>;

/* ----------------------------------------------------------- AI inputs */

export const metricPayloadSchema = z.object({
  metricId: z.string(),
  name: z.string(),
  score: z.number().nullable(),
  scaleMin: z.number(),
  scaleMax: z.number(),
  n: z.number(),
  baselineScore: z.number().nullable(),
  delta: z.number().nullable(),
  comparable: z.boolean(),
  suppressed: z.boolean(),
});
export type MetricPayload = z.infer<typeof metricPayloadSchema>;

export const gapPayloadSchema = z.object({
  pairId: z.string(),
  name: z.string(),
  managerScore: z.number().nullable(),
  teamScore: z.number().nullable(),
  gap: z.number().nullable(),
  managerN: z.number(),
  teamN: z.number(),
});
export type GapPayload = z.infer<typeof gapPayloadSchema>;

/** Aggregated, privacy-filtered payload. This is the only thing a provider ever receives. */
export const analyticalPayloadSchema = z.object({
  clientLabel: z.string(),
  projectLabel: z.string(),
  locale: z.enum(["he", "en"]),
  waveCode: z.string(),
  baselineWaveCode: z.string().nullable(),
  respondentCount: z.number(),
  privacyThreshold: z.number(),
  metrics: z.array(metricPayloadSchema),
  gaps: z.array(gapPayloadSchema),
  barriers: z.array(z.object({ label: z.string(), share: z.number() })),
  qualitativeThemes: z.array(z.string()),
  openTextSamples: z.array(z.string()).default([]),
});
export type AnalyticalPayload = z.infer<typeof analyticalPayloadSchema>;

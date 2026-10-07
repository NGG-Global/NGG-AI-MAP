import { z } from "zod";
import { localizedTextSchema } from "@/domain/questionnaire/definition";

/**
 * Configuration-driven measurement (spec §21). A metric is computed from the items listed here;
 * changing items, scale or missing-data rules is a data change, not a code change.
 */
export const metricKindSchema = z.enum([
  /** Mean of Likert items on the item scale (1–5 / 1–7). */
  "scale_mean",
  /** Share of respondents whose single-choice answer is in `positiveValues` (0–100). */
  "share",
  /** Mean of per-respondent counts of selected options in a multi-select (breadth). */
  "breadth",
  /** Share of respondents (0–100) whose scale score for the items is at or above `threshold`. */
  "threshold_share",
]);

export const metricGroupSchema = z.enum([
  "core",
  "ai_literacy_dimension",
  "agentic_management_dimension",
  "enablement_dimension",
  "adoption",
  "impact",
  "manager_team_pair",
  "agentic_work_dimension",
  "adoption_funnel",
  "trust",
  "team_experience",
]);
export type MetricGroup = z.infer<typeof metricGroupSchema>;

export const metricConfigSchema = z.object({
  id: z.string().min(1),
  name: localizedTextSchema,
  shortName: localizedTextSchema.optional(),
  description: localizedTextSchema.optional(),
  kind: metricKindSchema,
  group: metricGroupSchema,
  /** Parent metric for dimension metrics (e.g. `gail_total`). */
  parentId: z.string().optional(),
  sourceType: z.enum(["validated", "ngg_measure", "client_custom"]),
  scaleMin: z.number(),
  scaleMax: z.number(),
  /** Canonical question ids feeding the metric. */
  itemCanonicalIds: z.array(z.string()),
  /** Canonical ids that are reverse coded for this metric (overrides item flag if listed). */
  reverseCodedIds: z.array(z.string()).default([]),
  /** Minimum share of items a respondent must answer to receive a score (default 0.5). */
  minAnsweredRatio: z.number().min(0).max(1).default(0.5),
  /** For `share` metrics: option values counted as positive. */
  positiveValues: z.array(z.string()).optional(),
  /** For `threshold_share`: minimum per-respondent mean counted as positive (e.g. 4 = "often"). */
  threshold: z.number().optional(),
  /** Higher is not automatically better (e.g. trust): deltas are shown without good/bad colouring. */
  neutralDirection: z.boolean().default(false),
  /** Whether this metric is presented in the core profile of the client dashboard. */
  coreProfile: z.boolean().default(false),
  /** Audience the metric is computed for (manager-only metrics are computed on managers). */
  audience: z.enum(["all", "managers", "employees"]).default("all"),
  /** Manager–team pairs: manager self-report item vs employee experience item (spec §25.2). */
  pair: z
    .object({
      managerItemId: z.string(),
      employeeItemId: z.string(),
    })
    .optional(),
});
export type MetricConfig = z.infer<typeof metricConfigSchema>;

export function parseMetricConfig(input: unknown): MetricConfig {
  return metricConfigSchema.parse(input);
}

/** Shares (0–100) are displayed as percentages rather than "x / max". */
export function isPercentMetric(metric: Pick<MetricConfig, "kind">): boolean {
  return metric.kind === "share" || metric.kind === "threshold_share";
}

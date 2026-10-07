import type { AnalyticalPayload, GapPayload, MetricPayload } from "./contracts";
import type { ComparedMetric, GapResult } from "@/domain/measurement/engine";
import { isPercentMetric, type MetricConfig } from "@/domain/measurement/config";
import { lt } from "@/domain/shared/localized";
import type { Locale } from "@/domain/shared/enums";

/**
 * Builds the only thing an AI provider ever sees: aggregated, suppressed, metric-level numbers.
 * No respondent ids, no raw answers, no identifiers. Open-text samples are redacted before inclusion.
 */
export interface PayloadInput {
  clientLabel: string;
  projectLabel: string;
  locale: Locale;
  waveCode: string;
  baselineWaveCode: string | null;
  respondentCount: number;
  privacyThreshold: number;
  metrics: MetricConfig[];
  compared: ComparedMetric[];
  gaps: GapResult[];
  barriers: Array<{ label: string; share: number }>;
  qualitativeThemes?: string[];
  openTextSamples?: string[];
}

export function buildAnalyticalPayload(input: PayloadInput): AnalyticalPayload {
  const metrics: MetricPayload[] = input.compared
    .map((c) => {
      const config = input.metrics.find((m) => m.id === c.metricId);
      if (!config) return null;
      return {
        metricId: c.metricId,
        name: lt(config.name, input.locale),
        score: c.current.suppressed ? null : c.current.score,
        scaleMin: config.scaleMin,
        scaleMax: config.scaleMax,
        n: c.current.n,
        baselineScore: c.comparable && c.baseline && !c.baseline.suppressed ? c.baseline.score : null,
        delta: c.comparable ? c.delta : null,
        comparable: c.comparable,
        suppressed: c.current.suppressed,
        coreProfile: config.coreProfile,
        neutralDirection: config.neutralDirection,
        percent: isPercentMetric(config),
      } satisfies MetricPayload;
    })
    .filter((m): m is MetricPayload => m != null);
  const gaps: GapPayload[] = input.gaps.map((g) => {
    const config = input.metrics.find((m) => m.id === g.pairId);
    return { pairId: g.pairId, name: config ? lt(config.name, input.locale) : g.pairId, managerScore: g.managerScore, teamScore: g.teamScore, gap: g.gap, managerN: g.managerN, teamN: g.teamN };
  });
  return {
    clientLabel: input.clientLabel,
    projectLabel: input.projectLabel,
    locale: input.locale,
    waveCode: input.waveCode,
    baselineWaveCode: input.baselineWaveCode,
    respondentCount: input.respondentCount,
    privacyThreshold: input.privacyThreshold,
    metrics,
    gaps,
    barriers: input.barriers,
    qualitativeThemes: input.qualitativeThemes ?? [],
    openTextSamples: (input.openTextSamples ?? []).map(redactPii),
  };
}

/** Conservative PII redaction for free text before any model call (spec §29.4). */
export function redactPii(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/(\+?\d[\d\s-]{7,}\d)/g, "[phone]")
    .replace(/https?:\/\/\S+/g, "[link]")
    .replace(/\b\d{9}\b/g, "[id]");
}

/** Metric ids the model may reference. Anything else in its output is a hallucination and is rejected. */
export function allowedMetricIds(payload: AnalyticalPayload): Set<string> {
  return new Set([...payload.metrics.map((m) => m.metricId), ...payload.gaps.map((g) => g.pairId)]);
}

/** True when the payload holds too little evidence for any interpretation. */
export function hasSufficientEvidence(payload: AnalyticalPayload): boolean {
  return payload.metrics.some((m) => !m.suppressed && m.score != null) && payload.respondentCount >= payload.privacyThreshold;
}

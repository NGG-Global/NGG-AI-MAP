import type { MetricConfig } from "./config";
import type { SegmentAttributes } from "./types";
import type { QuestionnaireDefinition, QuestionDefinition } from "@/domain/questionnaire/definition";
import type { SegmentKey } from "@/domain/shared/enums";

/**
 * Deterministic measurement engine (spec §21). Pure functions, no I/O, no LLM.
 * Input: respondents (segment attributes) + their answers + the frozen questionnaire definition
 * + metric configuration. Output: metric results per segment with privacy suppression applied.
 */

export type AnswerValue = number | string | string[] | Record<string, number> | null;

export interface RespondentRecord {
  id: string;
  attributes: SegmentAttributes;
  /** canonical question id → value; `null` = prefer not to answer (treated as missing). */
  answers: Record<string, AnswerValue | undefined>;
}

export interface SegmentRef {
  key: SegmentKey | "all";
  value: string;
}

export interface MetricResultRow {
  metricId: string;
  segment: SegmentRef;
  /** Null when suppressed or when no respondent qualified. */
  score: number | null;
  n: number;
  itemCount: number;
  suppressed: boolean;
}

export interface DistributionRow {
  itemCanonicalId: string;
  segment: SegmentRef;
  /** option value (or `row|column` for matrix) → share of respondents answering (0–100, one decimal). */
  buckets: Record<string, number>;
  n: number;
  suppressed: boolean;
}

export interface EngineOptions {
  privacyThreshold: number;
  /** Segment keys to break results down by (in addition to "all"). */
  segmentKeys?: SegmentKey[];
}

export const ALL: SegmentRef = { key: "all", value: "all" };

/* ------------------------------------------------------------ helpers */

function questionIndex(def: QuestionnaireDefinition): Map<string, QuestionDefinition> {
  return new Map(def.sections.flatMap((s) => s.questions.map((q) => [q.canonicalId, q] as const)));
}

/** Converts an answer into a numeric item score on the metric scale, applying option scores and reverse coding. */
export function itemScore(question: QuestionDefinition | undefined, value: AnswerValue | undefined, reverse: boolean, metric: MetricConfig): number | null {
  if (value == null || question == null) return null;
  let n: number | null = null;
  if (typeof value === "number") n = value;
  else if (typeof value === "string" && question.options) {
    const opt = question.options.find((o) => o.value === value);
    n = opt?.score ?? null;
  }
  if (n == null || Number.isNaN(n)) return null;
  if (reverse) n = metric.scaleMin + metric.scaleMax - n;
  return n;
}

function isManager(r: RespondentRecord): boolean | undefined {
  const v = r.attributes.is_manager;
  return typeof v === "boolean" ? v : undefined;
}

function inAudience(metric: MetricConfig, r: RespondentRecord): boolean {
  if (metric.audience === "managers") return isManager(r) === true;
  if (metric.audience === "employees") return isManager(r) === false;
  return true;
}

/** Per-respondent score for a scale metric: mean of answered items when enough items were answered. */
export function respondentScaleScore(metric: MetricConfig, questions: Map<string, QuestionDefinition>, r: RespondentRecord): number | null {
  const items = metric.pair ? [] : metric.itemCanonicalIds;
  const present = items.filter((id) => questions.has(id));
  if (present.length === 0) return null;
  const scores: number[] = [];
  for (const id of present) {
    const q = questions.get(id);
    const reverse = metric.reverseCodedIds.includes(id) || Boolean(q?.reverseCoded);
    const s = itemScore(q, r.answers[id], reverse, metric);
    if (s != null) scores.push(s);
  }
  if (scores.length === 0 || scores.length / present.length < metric.minAnsweredRatio) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function round(n: number | null, digits = 2): number | null {
  if (n == null) return null;
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/* ----------------------------------------------------------- segments */

export function segmentsFor(respondents: RespondentRecord[], keys: SegmentKey[]): SegmentRef[] {
  const out: SegmentRef[] = [ALL];
  for (const key of keys) {
    const values = new Set<string>();
    for (const r of respondents) {
      const v = r.attributes[key];
      if (v == null || v === "") continue;
      values.add(String(v));
    }
    for (const value of [...values].sort()) out.push({ key, value });
  }
  return out;
}

function inSegment(r: RespondentRecord, seg: SegmentRef): boolean {
  if (seg.key === "all") return true;
  const v = r.attributes[seg.key];
  return v != null && String(v) === seg.value;
}

/* -------------------------------------------------------------- engine */

/** Scores one metric for one segment. */
export function computeMetric(metric: MetricConfig, def: QuestionnaireDefinition, respondents: RespondentRecord[], seg: SegmentRef, threshold: number): MetricResultRow {
  const questions = questionIndex(def);
  const pool = respondents.filter((r) => inSegment(r, seg) && inAudience(metric, r));
  const presentItems = (metric.pair ? [metric.pair.managerItemId, metric.pair.employeeItemId] : metric.itemCanonicalIds).filter((id) => questions.has(id));
  let values: number[] = [];
  if (metric.kind === "scale_mean" && !metric.pair) {
    values = pool.map((r) => respondentScaleScore(metric, questions, r)).filter((v): v is number => v != null);
  } else if (metric.kind === "scale_mean" && metric.pair) {
    // A pair metric's own score is the employee-side experience; use `computeGap` for both sides.
    const q = questions.get(metric.pair.employeeItemId);
    values = pool.map((r) => itemScore(q, r.answers[metric.pair!.employeeItemId], false, metric)).filter((v): v is number => v != null);
  } else if (metric.kind === "share") {
    const id = metric.itemCanonicalIds[0]!;
    const answered = pool.filter((r) => r.answers[id] != null);
    values = answered.map((r) => {
      const v = r.answers[id];
      const list = Array.isArray(v) ? v : [String(v)];
      return list.some((x) => metric.positiveValues?.includes(x)) ? 100 : 0;
    });
  } else if (metric.kind === "threshold_share") {
    const threshold = metric.threshold ?? 4;
    values = pool
      .map((r) => respondentScaleScore({ ...metric, kind: "scale_mean" }, questions, r))
      .filter((v): v is number => v != null)
      .map((v) => (v >= threshold ? 100 : 0));
  } else if (metric.kind === "breadth") {
    const id = metric.itemCanonicalIds[0]!;
    values = pool.filter((r) => Array.isArray(r.answers[id])).map((r) => (r.answers[id] as string[]).length);
  }
  const n = values.length;
  const suppressed = n < threshold;
  return {
    metricId: metric.id,
    segment: seg,
    score: suppressed ? null : round(mean(values)),
    n: suppressed ? 0 : n,
    itemCount: presentItems.length,
    suppressed,
  };
}

/** Computes every metric for "all" and for each requested segment, with suppression applied. */
export function computeWave(def: QuestionnaireDefinition, metrics: MetricConfig[], respondents: RespondentRecord[], options: EngineOptions): MetricResultRow[] {
  const segs = segmentsFor(respondents, options.segmentKeys ?? []);
  const out: MetricResultRow[] = [];
  for (const metric of metrics) for (const seg of segs) out.push(computeMetric(metric, def, respondents, seg, options.privacyThreshold));
  return out;
}

/* ------------------------------------------------------- distributions */

export function computeDistribution(itemId: string, def: QuestionnaireDefinition, respondents: RespondentRecord[], seg: SegmentRef, threshold: number): DistributionRow | null {
  const q = questionIndex(def).get(itemId);
  if (!q) return null;
  const pool = respondents.filter((r) => inSegment(r, seg) && r.answers[itemId] != null);
  const n = pool.length;
  if (n < threshold) return { itemCanonicalId: itemId, segment: seg, buckets: {}, n: 0, suppressed: true };
  const counts = new Map<string, number>();
  const bump = (k: string) => counts.set(k, (counts.get(k) ?? 0) + 1);
  for (const r of pool) {
    const v = r.answers[itemId];
    if (Array.isArray(v)) v.forEach(bump);
    else if (typeof v === "object" && v !== null) {
      for (const [row, colIndex] of Object.entries(v)) {
        const col = q.matrixColumns?.[colIndex]?.value;
        if (col) bump(`${row}|${col}`);
      }
    } else bump(String(v));
  }
  const buckets: Record<string, number> = {};
  const keys = q.type === "matrix" ? (q.matrixRows ?? []).flatMap((row) => (q.matrixColumns ?? []).map((c) => `${row.key}|${c.value}`)) : (q.options ?? []).map((o) => o.value);
  for (const key of keys) buckets[key] = round(((counts.get(key) ?? 0) / n) * 100, 1) ?? 0;
  return { itemCanonicalId: itemId, segment: seg, buckets, n, suppressed: false };
}

/* ---------------------------------------------------------- comparison */

export interface ComparedMetric {
  metricId: string;
  current: MetricResultRow;
  baseline: MetricResultRow | null;
  delta: number | null;
  /** False when the baseline questionnaire does not carry all of the metric's items. */
  comparable: boolean;
}

/** Compares current vs baseline results for one segment. Never produces a delta for non-comparable metrics. */
export function compareWaves(current: MetricResultRow[], baseline: MetricResultRow[] | null, comparableMetricIds: Set<string> | null, seg: SegmentRef = ALL): ComparedMetric[] {
  const sameSeg = (r: MetricResultRow) => r.segment.key === seg.key && r.segment.value === seg.value;
  return current.filter(sameSeg).map((cur) => {
    const base = baseline?.find((b) => b.metricId === cur.metricId && sameSeg(b)) ?? null;
    const comparable = base != null && (comparableMetricIds == null || comparableMetricIds.has(cur.metricId));
    const delta = comparable && base && base.score != null && cur.score != null ? round(cur.score - base.score) : null;
    return { metricId: cur.metricId, current: cur, baseline: base, delta, comparable };
  });
}

/* --------------------------------------------------- manager–team gap */

export interface GapResult {
  pairId: string;
  managerScore: number | null;
  teamScore: number | null;
  /** team − managers: negative means employees experience less than managers report (spec §25.2). */
  gap: number | null;
  managerN: number;
  teamN: number;
  suppressed: boolean;
}

export function computeGap(metric: MetricConfig, def: QuestionnaireDefinition, respondents: RespondentRecord[], seg: SegmentRef, threshold: number): GapResult | null {
  if (!metric.pair) return null;
  const questions = questionIndex(def);
  const mq = questions.get(metric.pair.managerItemId);
  const eq = questions.get(metric.pair.employeeItemId);
  const managers = respondents.filter((r) => inSegment(r, seg) && isManager(r) === true).map((r) => itemScore(mq, r.answers[metric.pair!.managerItemId], false, metric)).filter((v): v is number => v != null);
  // Team experience: everyone who rated their own direct manager. Managers answer this too, about
  // their own manager (Master Questionnaire Copy §10), so the side is defined by the item, not the role.
  const team = respondents.filter((r) => inSegment(r, seg)).map((r) => itemScore(eq, r.answers[metric.pair!.employeeItemId], false, metric)).filter((v): v is number => v != null);
  const suppressed = managers.length < threshold || team.length < threshold;
  const managerScore = suppressed ? null : round(mean(managers));
  const teamScore = suppressed ? null : round(mean(team));
  return {
    pairId: metric.id,
    managerScore,
    teamScore,
    gap: managerScore != null && teamScore != null ? round(teamScore - managerScore) : null,
    managerN: suppressed ? 0 : managers.length,
    teamN: suppressed ? 0 : team.length,
    suppressed,
  };
}

/* ------------------------------------------------------------ item stats */

export interface ItemStat {
  canonicalId: string;
  score: number | null;
  n: number;
  suppressed: boolean;
}

/** Mean per item for a scale metric (strongest/weakest item views). */
export function computeItemStats(metric: MetricConfig, def: QuestionnaireDefinition, respondents: RespondentRecord[], seg: SegmentRef, threshold: number): ItemStat[] {
  const questions = questionIndex(def);
  const pool = respondents.filter((r) => inSegment(r, seg) && inAudience(metric, r));
  return metric.itemCanonicalIds
    .filter((id) => questions.has(id))
    .map((id) => {
      const q = questions.get(id);
      const reverse = metric.reverseCodedIds.includes(id) || Boolean(q?.reverseCoded);
      const values = pool.map((r) => itemScore(q, r.answers[id], reverse, metric)).filter((v): v is number => v != null);
      const suppressed = values.length < threshold;
      return { canonicalId: id, score: suppressed ? null : round(mean(values)), n: suppressed ? 0 : values.length, suppressed };
    });
}

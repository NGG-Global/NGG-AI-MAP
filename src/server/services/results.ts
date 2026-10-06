import { and, eq, inArray } from "drizzle-orm";
import {
  distributionResults,
  metricResults,
  questionnaireVersions,
  respondents,
  responses,
  waves,
  type Client,
  type DistributionResult,
  type MetricResult,
  type Wave,
} from "@/server/db/schema";
import { newId } from "@/lib/ids";
import {
  ALL,
  compareWaves,
  computeDistribution,
  computeGap,
  computeItemStats,
  computeWave,
  type ComparedMetric,
  type GapResult,
  type ItemStat,
  type RespondentRecord,
  type SegmentRef,
} from "@/domain/measurement/engine";
import { computeComparability } from "@/domain/questionnaire/logic";
import { DISTRIBUTION_ITEMS } from "@/domain/questionnaire/libraryContent";
import type { MetricConfig } from "@/domain/measurement/config";
import type { QuestionnaireDefinition } from "@/domain/questionnaire/definition";
import type { SegmentKey } from "@/domain/shared/enums";
import { NotFoundError } from "@/server/shared/errors";
import type { ServiceContext } from "./context";
import { requireProject } from "./access";
import { loadMetricConfigs } from "./library";
import { recordAudit } from "./audit";

const SEGMENT_KEYS: SegmentKey[] = ["department", "role_family", "is_manager", "seniority", "location"];

/* --------------------------------------------------------- computation */

/**
 * Runs the deterministic engine for a wave and caches the output. This is the ONLY place that reads
 * the `responses` table for analytics, and it requires NGG-side wave management rights.
 */
export async function computeWaveResults(ctx: ServiceContext, waveId: string): Promise<{ metrics: number; distributions: number }> {
  const [wave] = await ctx.db.select().from(waves).where(eq(waves.id, waveId)).limit(1);
  if (!wave) throw new NotFoundError("wave");
  const { client } = await requireProject(ctx, wave.projectId, "wave.manage");
  const bundle = await loadRespondentRecords(ctx, wave);
  if (!bundle) return { metrics: 0, distributions: 0 };
  const metrics = await loadMetricConfigs(ctx.db);
  const rows = computeWave(bundle.definition, metrics, bundle.records, { privacyThreshold: client.privacyThreshold, segmentKeys: SEGMENT_KEYS });
  const now = new Date();
  await ctx.db.delete(metricResults).where(eq(metricResults.waveId, waveId));
  if (rows.length) {
    await ctx.db.insert(metricResults).values(
      rows.map((r) => ({
        id: newId(),
        waveId,
        metricId: r.metricId,
        segmentKey: r.segment.key,
        segmentValue: r.segment.value,
        score: r.score,
        n: r.n,
        itemCount: r.itemCount,
        suppressed: r.suppressed,
        computedAt: now,
      })),
    );
  }
  const segs: SegmentRef[] = [ALL, ...SEGMENT_KEYS.flatMap((key) => [...new Set(bundle.records.map((r) => r.attributes[key]).filter((v) => v != null && v !== ""))].map((v) => ({ key, value: String(v) })))];
  const dist = DISTRIBUTION_ITEMS.flatMap((item) => segs.map((seg) => computeDistribution(item, bundle.definition, bundle.records, seg, client.privacyThreshold))).filter((d): d is NonNullable<typeof d> => d != null);
  await ctx.db.delete(distributionResults).where(eq(distributionResults.waveId, waveId));
  if (dist.length) {
    await ctx.db.insert(distributionResults).values(
      dist.map((d) => ({ id: newId(), waveId, itemCanonicalId: d.itemCanonicalId, segmentKey: d.segment.key, segmentValue: d.segment.value, buckets: d.buckets, n: d.n, suppressed: d.suppressed, computedAt: now })),
    );
  }
  await recordAudit(ctx, { action: "results.computed", entityType: "wave", entityId: waveId, clientId: client.id, projectId: wave.projectId, metadata: { metrics: rows.length, respondents: bundle.records.length } });
  return { metrics: rows.length, distributions: dist.length };
}

async function loadRespondentRecords(ctx: ServiceContext, wave: Wave): Promise<{ definition: QuestionnaireDefinition; records: RespondentRecord[] } | null> {
  if (!wave.questionnaireVersionId) return null;
  const [version] = await ctx.db.select().from(questionnaireVersions).where(eq(questionnaireVersions.id, wave.questionnaireVersionId)).limit(1);
  if (!version) return null;
  const people = await ctx.db.select().from(respondents).where(and(eq(respondents.waveId, wave.id), eq(respondents.status, "completed")));
  if (people.length === 0) return { definition: version.definition, records: [] };
  const answers = await ctx.db.select().from(responses).where(eq(responses.waveId, wave.id));
  const byRespondent = new Map<string, RespondentRecord["answers"]>();
  for (const a of answers) {
    const entry = byRespondent.get(a.respondentId) ?? {};
    entry[a.questionCanonicalId] = a.value;
    byRespondent.set(a.respondentId, entry);
  }
  return {
    definition: version.definition,
    records: people.map((p) => ({ id: p.id, attributes: p.segmentAttributes, answers: byRespondent.get(p.id) ?? {} })),
  };
}

/* ------------------------------------------------------------- reading */

export interface WaveResultsView {
  wave: Wave;
  baseline: Wave | null;
  client: Client;
  metrics: MetricConfig[];
  /** Compared metrics for the requested segment (deltas only when comparable). */
  compared: ComparedMetric[];
  comparableMetricIds: Set<string> | null;
  comparabilityPercent: number | null;
  gaps: GapResult[];
  distributions: DistributionResult[];
  baselineDistributions: DistributionResult[];
  respondentCount: number;
  segment: SegmentRef;
  /** Segment values available for filters (values that exist in the data, suppressed ones included). */
  segmentOptions: Record<string, string[]>;
  computedAt: Date | null;
}

function toRow(r: MetricResult) {
  return { metricId: r.metricId, segment: { key: r.segmentKey as SegmentRef["key"], value: r.segmentValue }, score: r.score, n: r.n, itemCount: r.itemCount, suppressed: r.suppressed };
}

/**
 * Aggregated results for dashboards (NGG and client). Reads only cached, suppressed aggregates —
 * never the `responses` table — so it is safe to call from client-facing code.
 */
export async function getWaveResults(ctx: ServiceContext, waveId: string, segment: SegmentRef = ALL): Promise<WaveResultsView> {
  const [wave] = await ctx.db.select().from(waves).where(eq(waves.id, waveId)).limit(1);
  if (!wave) throw new NotFoundError("wave");
  const { client } = await requireProject(ctx, wave.projectId, "results.view_aggregate");
  const metrics = await loadMetricConfigs(ctx.db);
  const baseline = wave.baselineWaveId ? ((await ctx.db.select().from(waves).where(eq(waves.id, wave.baselineWaveId)).limit(1))[0] ?? null) : null;
  const waveIds = [wave.id, ...(baseline ? [baseline.id] : [])];
  const [metricRows, distRows] = await Promise.all([
    ctx.db.select().from(metricResults).where(inArray(metricResults.waveId, waveIds)),
    ctx.db.select().from(distributionResults).where(and(inArray(distributionResults.waveId, waveIds), eq(distributionResults.segmentKey, segment.key), eq(distributionResults.segmentValue, segment.value))),
  ]);
  const current = metricRows.filter((r) => r.waveId === wave.id).map(toRow);
  const base = baseline ? metricRows.filter((r) => r.waveId === baseline.id).map(toRow) : null;

  let comparableMetricIds: Set<string> | null = null;
  let comparabilityPercent: number | null = null;
  if (baseline?.questionnaireVersionId && wave.questionnaireVersionId) {
    const versions = await ctx.db.select().from(questionnaireVersions).where(inArray(questionnaireVersions.id, [baseline.questionnaireVersionId, wave.questionnaireVersionId]));
    const bv = versions.find((v) => v.id === baseline.questionnaireVersionId);
    const cv = versions.find((v) => v.id === wave.questionnaireVersionId);
    if (bv && cv) {
      const comp = computeComparability(bv.definition, cv.definition, metrics);
      comparableMetricIds = new Set(comp.metrics.filter((m) => m.level === "full").map((m) => m.metricId));
      comparabilityPercent = comp.percent;
    }
  }
  const compared = compareWaves(current, base, comparableMetricIds, segment);
  const gaps = await computeGapsFor(ctx, wave, client, metrics, segment);
  const allRow = current.find((r) => r.segment.key === "all" && r.metricId === "ai_usage") ?? current.find((r) => r.segment.key === "all");
  const segmentOptions: Record<string, string[]> = {};
  for (const r of metricRows.filter((x) => x.waveId === wave.id && x.segmentKey !== "all")) {
    const list = segmentOptions[r.segmentKey] ?? [];
    if (!list.includes(r.segmentValue)) list.push(r.segmentValue);
    segmentOptions[r.segmentKey] = list;
  }
  return {
    wave,
    baseline,
    client,
    metrics,
    compared,
    comparableMetricIds,
    comparabilityPercent,
    gaps,
    distributions: distRows.filter((d) => d.waveId === wave.id),
    baselineDistributions: baseline ? distRows.filter((d) => d.waveId === baseline.id) : [],
    respondentCount: allRow?.n ?? 0,
    segment,
    segmentOptions,
    computedAt: metricRows.find((r) => r.waveId === wave.id)?.computedAt ?? null,
  };
}

/**
 * Gaps are computed on demand from the responses by the engine, but only through this service and
 * only ever as suppressed aggregates. Client users receive the same suppressed output.
 */
async function computeGapsFor(ctx: ServiceContext, wave: Wave, client: Client, metrics: MetricConfig[], segment: SegmentRef): Promise<GapResult[]> {
  const bundle = await loadRespondentRecords(ctx, wave);
  if (!bundle) return [];
  return metrics.filter((m) => m.pair).map((m) => computeGap(m, bundle.definition, bundle.records, segment, client.privacyThreshold)).filter((g): g is GapResult => g != null);
}

/** Strongest/weakest items for a metric (spec §26). Aggregated and suppressed. */
export async function getItemStats(ctx: ServiceContext, waveId: string, metricId: string, segment: SegmentRef = ALL): Promise<ItemStat[]> {
  const [wave] = await ctx.db.select().from(waves).where(eq(waves.id, waveId)).limit(1);
  if (!wave) throw new NotFoundError("wave");
  const { client } = await requireProject(ctx, wave.projectId, "results.view_aggregate");
  const metrics = await loadMetricConfigs(ctx.db);
  const metric = metrics.find((m) => m.id === metricId);
  const bundle = await loadRespondentRecords(ctx, wave);
  if (!metric || !bundle) return [];
  return computeItemStats(metric, bundle.definition, bundle.records, segment, client.privacyThreshold);
}

/** Waves of a project that have cached results, for selectors. */
export async function listComputedWaves(ctx: ServiceContext, projectId: string): Promise<Wave[]> {
  await requireProject(ctx, projectId, "results.view_aggregate");
  const rows = await ctx.db.select().from(waves).where(eq(waves.projectId, projectId)).orderBy(waves.createdAt);
  const computed = await ctx.db.select({ waveId: metricResults.waveId }).from(metricResults).where(inArray(metricResults.waveId, rows.map((r) => r.id).concat("-")));
  const ids = new Set(computed.map((c) => c.waveId));
  return rows.filter((r) => ids.has(r.id));
}

/** All waves' "all" results for one metric (trend lines, spec §27). */
export async function getMetricTrend(ctx: ServiceContext, projectId: string, metricId: string, segment: SegmentRef = ALL) {
  await requireProject(ctx, projectId, "results.view_aggregate");
  const projectWaves = await ctx.db.select().from(waves).where(eq(waves.projectId, projectId)).orderBy(waves.createdAt);
  if (projectWaves.length === 0) return [];
  const rows = await ctx.db
    .select()
    .from(metricResults)
    .where(and(inArray(metricResults.waveId, projectWaves.map((w) => w.id)), eq(metricResults.metricId, metricId), eq(metricResults.segmentKey, segment.key), eq(metricResults.segmentValue, segment.value)));
  return projectWaves.map((w) => {
    const r = rows.find((x) => x.waveId === w.id);
    return { wave: w, score: r?.suppressed ? null : (r?.score ?? null), n: r?.n ?? 0, suppressed: r?.suppressed ?? false, computed: Boolean(r) };
  });
}

/** One metric broken down by a segment key for the current and baseline wave (suppressed aggregates only). */
export async function getMetricBySegments(ctx: ServiceContext, waveId: string, metricId: string, segmentKey: SegmentKey) {
  const [wave] = await ctx.db.select().from(waves).where(eq(waves.id, waveId)).limit(1);
  if (!wave) throw new NotFoundError("wave");
  await requireProject(ctx, wave.projectId, "results.view_aggregate");
  const waveIds = [wave.id, ...(wave.baselineWaveId ? [wave.baselineWaveId] : [])];
  const rows = await ctx.db
    .select()
    .from(metricResults)
    .where(and(inArray(metricResults.waveId, waveIds), eq(metricResults.metricId, metricId), eq(metricResults.segmentKey, segmentKey)));
  const values = [...new Set(rows.map((r) => r.segmentValue))].sort();
  return values.map((value) => {
    const cur = rows.find((r) => r.waveId === wave.id && r.segmentValue === value);
    const base = wave.baselineWaveId ? rows.find((r) => r.waveId === wave.baselineWaveId && r.segmentValue === value) : undefined;
    const suppressed = !cur || cur.suppressed;
    const score = suppressed ? null : cur.score;
    const baselineScore = base && !base.suppressed ? base.score : null;
    return { value, score, n: suppressed ? 0 : cur.n, suppressed, baselineScore, delta: score != null && baselineScore != null ? Math.round((score - baselineScore) * 100) / 100 : null };
  });
}

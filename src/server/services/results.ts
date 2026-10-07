import { and, eq, inArray } from "drizzle-orm";
import {
  aggregateResults,
  clients,
  distributionResults,
  metricResults,
  projects,
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
import { recordAudit, recordSystemAudit } from "./audit";
import type { Db } from "@/server/db/connection";

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
  const result = await computeAndCache(ctx.db, wave, client);
  await recordAudit(ctx, { action: "results.computed", entityType: "wave", entityId: waveId, clientId: client.id, projectId: wave.projectId, metadata: result });
  return { metrics: result.metrics, distributions: result.distributions };
}

/** Used when the system closes a wave on its end date; no user is involved. */
export async function computeWaveResultsAsSystem(db: Db, wave: Wave): Promise<void> {
  const client = await clientOf(db, wave);
  if (!client) return;
  const result = await computeAndCache(db, wave, client);
  await recordSystemAudit(db, client.workspaceId, { actorLabel: "system", action: "results.computed", entityType: "wave", entityId: wave.id, clientId: client.id, projectId: wave.projectId, metadata: result });
}

async function clientOf(db: Db, wave: Wave): Promise<Client | null> {
  const [row] = await db.select({ client: clients }).from(projects).innerJoin(clients, eq(clients.id, projects.clientId)).where(eq(projects.id, wave.projectId)).limit(1);
  return row?.client ?? null;
}

/**
 * Computes every cached aggregate for a wave: metric scores, answer distributions, manager–team gaps
 * and per-item stats, all suppressed below the client's threshold.
 */
async function computeAndCache(db: Db, wave: Wave, client: Client): Promise<{ metrics: number; distributions: number; aggregates: number; respondents: number }> {
  const waveId = wave.id;
  const bundle = await loadRespondentRecords(db, wave);
  if (!bundle) return { metrics: 0, distributions: 0, aggregates: 0, respondents: 0 };
  const metrics = await loadMetricConfigs(db);
  const rows = computeWave(bundle.definition, metrics, bundle.records, { privacyThreshold: client.privacyThreshold, segmentKeys: SEGMENT_KEYS });
  const now = new Date();
  await db.delete(metricResults).where(eq(metricResults.waveId, waveId));
  if (rows.length) {
    await db.insert(metricResults).values(
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
  await db.delete(distributionResults).where(eq(distributionResults.waveId, waveId));
  if (dist.length) {
    await db.insert(distributionResults).values(
      dist.map((d) => ({ id: newId(), waveId, itemCanonicalId: d.itemCanonicalId, segmentKey: d.segment.key, segmentValue: d.segment.value, buckets: d.buckets, n: d.n, suppressed: d.suppressed, computedAt: now })),
    );
  }
  const aggregates: Array<typeof aggregateResults.$inferInsert> = [];
  for (const seg of segs) {
    for (const metric of metrics) {
      if (metric.pair) {
        const gap = computeGap(metric, bundle.definition, bundle.records, seg, client.privacyThreshold);
        if (gap) aggregates.push({ id: newId(), waveId, kind: "gap", metricId: metric.id, segmentKey: seg.key, segmentValue: seg.value, payload: gap, computedAt: now });
      } else if (metric.kind === "scale_mean") {
        const stats = computeItemStats(metric, bundle.definition, bundle.records, seg, client.privacyThreshold);
        if (stats.length) aggregates.push({ id: newId(), waveId, kind: "item_stats", metricId: metric.id, segmentKey: seg.key, segmentValue: seg.value, payload: stats, computedAt: now });
      }
    }
  }
  await db.delete(aggregateResults).where(eq(aggregateResults.waveId, waveId));
  for (let i = 0; i < aggregates.length; i += 500) await db.insert(aggregateResults).values(aggregates.slice(i, i + 500));
  return { metrics: rows.length, distributions: dist.length, aggregates: aggregates.length, respondents: bundle.records.length };
}

async function loadRespondentRecords(db: Db, wave: Wave): Promise<{ definition: QuestionnaireDefinition; records: RespondentRecord[] } | null> {
  if (!wave.questionnaireVersionId) return null;
  const [version] = await db.select().from(questionnaireVersions).where(eq(questionnaireVersions.id, wave.questionnaireVersionId)).limit(1);
  if (!version) return null;
  const people = await db.select().from(respondents).where(and(eq(respondents.waveId, wave.id), eq(respondents.status, "completed")));
  if (people.length === 0) return { definition: version.definition, records: [] };
  const answers = await db.select().from(responses).where(eq(responses.waveId, wave.id));
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
  // Clients see final results only; a wave that is still collecting is visible to NGG alone.
  if (ctx.actor.kind === "client" && wave.status !== "closed") throw new NotFoundError("wave");
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
 * Gaps and item stats come from the aggregate cache written when results are computed. Only NGG wave
 * managers looking at a wave that is still collecting get a live computation; clients never trigger a
 * read of `responses` (a closed wave without a cache, e.g. computed before the cache existed, is
 * backfilled once by the system).
 */
async function readAggregates(ctx: ServiceContext, wave: Wave, client: Client, kind: "gap" | "item_stats", segment: SegmentRef, metricId?: string) {
  const where = [eq(aggregateResults.waveId, wave.id), eq(aggregateResults.kind, kind), eq(aggregateResults.segmentKey, segment.key), eq(aggregateResults.segmentValue, segment.value)];
  if (metricId) where.push(eq(aggregateResults.metricId, metricId));
  const cached = await ctx.db.select().from(aggregateResults).where(and(...where));
  if (cached.length) return cached;
  const live = wave.status !== "closed" && ctx.actor.kind === "ngg" && (await canManageWave(ctx, wave));
  const [anyCache] = await ctx.db.select({ id: aggregateResults.id }).from(aggregateResults).where(eq(aggregateResults.waveId, wave.id)).limit(1);
  if (wave.status === "closed" && !anyCache) {
    await computeAndCache(ctx.db, wave, client);
    return ctx.db.select().from(aggregateResults).where(and(...where));
  }
  if (!live) return [];
  const bundle = await loadRespondentRecords(ctx.db, wave);
  if (!bundle) return [];
  const metrics = (await loadMetricConfigs(ctx.db)).filter((m) => (!metricId || m.id === metricId) && (kind === "gap" ? m.pair : !m.pair && m.kind === "scale_mean"));
  return metrics.flatMap((m) => {
    const payload = kind === "gap" ? computeGap(m, bundle.definition, bundle.records, segment, client.privacyThreshold) : computeItemStats(m, bundle.definition, bundle.records, segment, client.privacyThreshold);
    return payload ? [{ metricId: m.id, payload }] : [];
  });
}

async function canManageWave(ctx: ServiceContext, wave: Wave): Promise<boolean> {
  try {
    await requireProject(ctx, wave.projectId, "wave.manage");
    return true;
  } catch {
    return false;
  }
}

async function computeGapsFor(ctx: ServiceContext, wave: Wave, client: Client, metrics: MetricConfig[], segment: SegmentRef): Promise<GapResult[]> {
  const order = new Map(metrics.map((m, i) => [m.id, i]));
  const rows = await readAggregates(ctx, wave, client, "gap", segment);
  return rows
    .map((r) => r.payload as GapResult)
    .filter((g) => order.has(g.pairId))
    .sort((a, b) => (order.get(a.pairId) ?? 0) - (order.get(b.pairId) ?? 0));
}

/** Strongest/weakest items for a metric (spec §26). Aggregated and suppressed. */
export async function getItemStats(ctx: ServiceContext, waveId: string, metricId: string, segment: SegmentRef = ALL): Promise<ItemStat[]> {
  const [wave] = await ctx.db.select().from(waves).where(eq(waves.id, waveId)).limit(1);
  if (!wave) throw new NotFoundError("wave");
  const { client } = await requireProject(ctx, wave.projectId, "results.view_aggregate");
  if (ctx.actor.kind === "client" && wave.status !== "closed") throw new NotFoundError("wave");
  const rows = await readAggregates(ctx, wave, client, "item_stats", segment, metricId);
  return (rows[0]?.payload as ItemStat[] | undefined) ?? [];
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
  return projectWaves.filter((w) => ctx.actor.kind === "ngg" || w.status === "closed").map((w) => {
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

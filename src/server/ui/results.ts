import "server-only";
import { listWaves } from "@/server/services/waves";
import { getWaveResults, type WaveResultsView } from "@/server/services/results";
import { computeComparability } from "@/domain/questionnaire/logic";
import { questionnaireVersions } from "@/server/db/schema";
import { inArray } from "drizzle-orm";
import type { ServiceContext } from "@/server/services/context";
import type { SegmentRef } from "@/domain/measurement/engine";
import type { QuestionnaireDefinition } from "@/domain/questionnaire/definition";
import type { SegmentKey } from "@/domain/shared/enums";

const SEGMENT_KEYS: SegmentKey[] = ["department", "role_family", "is_manager", "seniority", "location"];

export function parseSegment(raw: string | string[] | undefined): SegmentRef {
  if (typeof raw !== "string" || !raw.includes(":")) return { key: "all", value: "all" };
  const [key, ...rest] = raw.split(":");
  const value = rest.join(":");
  if (!SEGMENT_KEYS.includes(key as SegmentKey) || !value) return { key: "all", value: "all" };
  return { key: key as SegmentKey, value };
}

export function segmentParam(seg: SegmentRef): string {
  return seg.key === "all" ? "" : `${seg.key}:${seg.value}`;
}

export interface ResultsPageData {
  waves: Awaited<ReturnType<typeof listWaves>>;
  selected: Awaited<ReturnType<typeof listWaves>>[number] | null;
  view: WaveResultsView | null;
  definition: QuestionnaireDefinition | null;
  /** Items shared with the baseline per metric (for the partial-comparability note). */
  partial: Record<string, { shared: number; total: number }>;
}

/** Shared loader for the NGG results tab and the client dashboard. */
export async function loadResultsPage(ctx: ServiceContext, projectId: string, waveParam: string | undefined, segment: SegmentRef): Promise<ResultsPageData> {
  const waves = await listWaves(ctx, projectId);
  // Clients see closed waves only; NGG also sees the wave that is still collecting.
  const candidates = waves.filter((w) => w.status === "closed" || (w.status === "open" && ctx.actor.kind === "ngg"));
  const selected = (waveParam ? candidates.find((w) => w.id === waveParam) : undefined) ?? [...candidates].reverse()[0] ?? null;
  if (!selected) return { waves, selected: null, view: null, definition: null, partial: {} };
  const view = await getWaveResults(ctx, selected.id, segment);
  const definition = selected.version?.definition ?? null;
  const partial: Record<string, { shared: number; total: number }> = {};
  if (view.baseline?.questionnaireVersionId && selected.questionnaireVersionId) {
    const versions = await ctx.db.select().from(questionnaireVersions).where(inArray(questionnaireVersions.id, [view.baseline.questionnaireVersionId, selected.questionnaireVersionId]));
    const bv = versions.find((v) => v.id === view.baseline!.questionnaireVersionId);
    const cv = versions.find((v) => v.id === selected.questionnaireVersionId);
    if (bv && cv) for (const m of computeComparability(bv.definition, cv.definition, view.metrics).metrics) partial[m.metricId] = { shared: m.sharedItems, total: m.baselineItems };
  }
  return { waves, selected, view, definition, partial };
}

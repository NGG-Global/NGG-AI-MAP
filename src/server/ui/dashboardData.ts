import "server-only";
import { loadResultsPage, parseSegment, segmentParam, type ResultsPageData } from "./results";
import { listProjectInsights } from "@/server/services/insights";
import { goalMeasurement, listGoals } from "@/server/services/goals";
import { listVisibleProjects } from "@/server/services/access";
import type { DashboardContext } from "./dashboard";
import type { Insight, Goal, Project } from "@/server/db/schema";
import type { SegmentRef } from "@/domain/measurement/engine";

export interface DashboardData extends ResultsPageData {
  segment: SegmentRef;
  insights: Insight[];
  executiveSummary: Insight | null;
  goals: Array<{ goal: Goal; measurement: Awaited<ReturnType<typeof goalMeasurement>> }>;
  projects: Project[];
  /** Builds a link to the same dashboard page with different wave/segment. */
  href: (page: string, patch?: { wave?: string; seg?: SegmentRef; extra?: Record<string, string> }) => string;
}

/** Everything the executive dashboard needs for one project. Reads cached aggregates and published items only. */
export async function loadDashboardData(d: DashboardContext, sp: Record<string, string | string[] | undefined>): Promise<DashboardData> {
  const segment = parseSegment(sp.seg);
  const waveParam = typeof sp.wave === "string" ? sp.wave : undefined;
  const [results, insights, goals, projects] = await Promise.all([
    loadResultsPage(d.ctx, d.project.id, waveParam, segment),
    listProjectInsights(d.ctx, d.project.id, { publishedOnly: true }),
    listGoals(d.ctx, d.project.id),
    listVisibleProjects(d.ctx, d.client.id),
  ]);
  const goalRows = await Promise.all(goals.filter((g) => g.publishedToClient && g.approvalState === "approved").map(async (goal) => ({ goal, measurement: await goalMeasurement(d.ctx, goal) })));
  const executiveSummary = insights.find((i) => i.type === "executive_summary" && i.waveId === results.selected?.id) ?? null;
  const href: DashboardData["href"] = (page, patch = {}) => {
    const params = new URLSearchParams();
    const wave = patch.wave ?? results.selected?.id;
    if (wave && waveParam) params.set("wave", wave);
    else if (patch.wave) params.set("wave", patch.wave);
    const seg = patch.seg ?? segment;
    if (segmentParam(seg)) params.set("seg", segmentParam(seg));
    for (const [k, v] of Object.entries(patch.extra ?? {})) params.set(k, v);
    const qs = params.toString();
    return `/dashboard/${d.project.id}/${page}${qs ? `?${qs}` : ""}`;
  };
  return { ...results, segment, insights, executiveSummary, goals: goalRows, projects, href };
}

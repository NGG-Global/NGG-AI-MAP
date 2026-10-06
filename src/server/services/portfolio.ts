import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { clients, goals, insights, respondents, users, waves, type Client, type Project, type Wave } from "@/server/db/schema";
import type { ServiceContext } from "./context";
import { assertWorkspace, listVisibleProjects } from "./access";

export interface PortfolioRow {
  client: Client;
  project: Project;
  managerName: string | null;
  currentWave: Wave | null;
  completed: number;
  invited: number;
  responseRate: number | null;
  dashboardUsers: number;
  pendingInsights: number;
  nextFollowUpAt: Date | null;
}

export interface AttentionItem {
  kind: "low_response" | "insight_pending" | "follow_up_due" | "no_access" | "draft" | "wave_ending";
  clientId: string;
  clientName: string;
  projectId: string;
  value?: number;
}

export interface PortfolioOverview {
  rows: PortfolioRow[];
  attention: AttentionItem[];
  kpis: {
    activeClients: number;
    activeSurveys: number;
    responsesThisMonth: number;
    followUpsDue: number;
    openGoals: number;
    requiringAttention: number;
    northStarPercent: number | null;
  };
}

const LOW_RESPONSE_THRESHOLD = 40;

/** Portfolio overview for the NGG side (spec §7). Scoped to the projects the actor may see. */
export async function getPortfolioOverview(ctx: ServiceContext): Promise<PortfolioOverview> {
  assertWorkspace(ctx, "workspace.view_portfolio");
  const visibleProjects = await listVisibleProjects(ctx);
  if (visibleProjects.length === 0) {
    return {
      rows: [],
      attention: [],
      kpis: { activeClients: 0, activeSurveys: 0, responsesThisMonth: 0, followUpsDue: 0, openGoals: 0, requiringAttention: 0, northStarPercent: null },
    };
  }
  const projectIds = visibleProjects.map((p) => p.id);
  const clientIds = [...new Set(visibleProjects.map((p) => p.clientId))];

  const [clientRows, waveRows, managerRows, userCounts, insightCounts, goalCounts, respondentCounts] = await Promise.all([
    ctx.db.select().from(clients).where(inArray(clients.id, clientIds)),
    ctx.db.select().from(waves).where(inArray(waves.projectId, projectIds)).orderBy(desc(waves.createdAt)),
    ctx.db.select({ id: users.id, name: users.name }).from(users).where(eq(users.kind, "ngg")),
    ctx.db
      .select({ clientId: users.clientId, n: count() })
      .from(users)
      .where(and(eq(users.kind, "client"), eq(users.status, "active"), inArray(users.clientId, clientIds)))
      .groupBy(users.clientId),
    ctx.db
      .select({ projectId: insights.projectId, n: count() })
      .from(insights)
      .where(and(inArray(insights.projectId, projectIds), eq(insights.status, "draft")))
      .groupBy(insights.projectId),
    ctx.db
      .select({ projectId: goals.projectId, n: count() })
      .from(goals)
      .where(and(inArray(goals.projectId, projectIds), inArray(goals.status, ["active", "in_progress", "review"])))
      .groupBy(goals.projectId),
    ctx.db
      .select({ waveId: respondents.waveId, status: respondents.status, n: count() })
      .from(respondents)
      .groupBy(respondents.waveId, respondents.status),
  ]);

  const clientById = new Map(clientRows.map((c) => [c.id, c]));
  const managerById = new Map(managerRows.map((m) => [m.id, m.name]));
  const usersByClient = new Map(userCounts.map((u) => [u.clientId, Number(u.n)]));
  const insightsByProject = new Map(insightCounts.map((i) => [i.projectId, Number(i.n)]));
  const goalsByProject = new Map(goalCounts.map((g) => [g.projectId, Number(g.n)]));
  const completedByWave = new Map<string, number>();
  for (const r of respondentCounts) {
    if (r.status === "completed") completedByWave.set(r.waveId, Number(r.n));
  }

  const now = new Date();
  const rows: PortfolioRow[] = [];
  const attention: AttentionItem[] = [];

  for (const project of visibleProjects) {
    const client = clientById.get(project.clientId);
    if (!client || client.status !== "active") continue;
    const projectWaves = waveRows.filter((w) => w.projectId === project.id);
    const currentWave = pickCurrentWave(projectWaves);
    const completed = currentWave ? (completedByWave.get(currentWave.id) ?? 0) : 0;
    const invited = currentWave?.invitedCount ?? 0;
    const responseRate = currentWave && invited > 0 ? Math.round((completed / invited) * 100) : null;
    const dashboardUsers = usersByClient.get(client.id) ?? 0;
    const pendingInsights = insightsByProject.get(project.id) ?? 0;
    rows.push({
      client,
      project,
      managerName: project.managerUserId ? (managerById.get(project.managerUserId) ?? null) : null,
      currentWave,
      completed,
      invited,
      responseRate,
      dashboardUsers,
      pendingInsights,
      nextFollowUpAt: project.nextFollowUpAt,
    });

    const base = { clientId: client.id, clientName: client.name, projectId: project.id };
    if (currentWave?.status === "open" && responseRate != null && responseRate < LOW_RESPONSE_THRESHOLD) {
      attention.push({ ...base, kind: "low_response", value: responseRate });
    }
    if (currentWave?.status === "open" && currentWave.endAt) {
      const days = Math.ceil((currentWave.endAt.getTime() - now.getTime()) / 86_400_000);
      if (days >= 0 && days <= 7) attention.push({ ...base, kind: "wave_ending", value: days });
    }
    if (pendingInsights > 0) attention.push({ ...base, kind: "insight_pending", value: pendingInsights });
    if (project.nextFollowUpAt && project.nextFollowUpAt <= now && !projectWaves.some((w) => w.status === "draft" || w.status === "scheduled")) {
      attention.push({ ...base, kind: "follow_up_due" });
    }
    if (!currentWave) attention.push({ ...base, kind: "draft" });
    else if (currentWave.status === "closed" && dashboardUsers === 0) attention.push({ ...base, kind: "no_access" });
  }

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [responsesThisMonth] = await ctx.db
    .select({ n: count() })
    .from(respondents)
    .innerJoin(waves, eq(waves.id, respondents.waveId))
    .where(and(inArray(waves.projectId, projectIds), eq(respondents.status, "completed"), gte(respondents.completedAt, monthStart)));

  const activeClients = new Set(rows.map((r) => r.client.id)).size;
  const activeSurveys = rows.filter((r) => r.currentWave?.status === "open").length;
  const followUpsDue = attention.filter((a) => a.kind === "follow_up_due").length;
  const openGoals = [...goalsByProject.values()].reduce((a, b) => a + b, 0);
  const projectsWithTwoWaves = visibleProjects.filter((p) => waveRows.filter((w) => w.projectId === p.id && w.status === "closed").length >= 2).length;
  const northStarPercent = rows.length ? Math.round((projectsWithTwoWaves / rows.length) * 100) : null;

  // Keep the attention panel focused: one most important item per project, most urgent first.
  const priority: AttentionItem["kind"][] = ["low_response", "wave_ending", "insight_pending", "follow_up_due", "no_access", "draft"];
  const seen = new Set<string>();
  const focused = attention
    .sort((a, b) => priority.indexOf(a.kind) - priority.indexOf(b.kind))
    .filter((a) => (seen.has(a.projectId) ? false : (seen.add(a.projectId), true)));

  return {
    rows,
    attention: focused,
    kpis: {
      activeClients,
      activeSurveys,
      responsesThisMonth: Number(responsesThisMonth?.n ?? 0),
      followUpsDue,
      openGoals,
      requiringAttention: focused.filter((a) => a.kind !== "draft").length,
      northStarPercent,
    },
  };
}

/** Open wave first, then scheduled, then the most recently closed. */
export function pickCurrentWave(projectWaves: Wave[]): Wave | null {
  return (
    projectWaves.find((w) => w.status === "open") ??
    projectWaves.find((w) => w.status === "scheduled") ??
    projectWaves.filter((w) => w.status === "closed").sort((a, b) => (b.closedAt?.getTime() ?? 0) - (a.closedAt?.getTime() ?? 0))[0] ??
    projectWaves.find((w) => w.status === "draft") ??
    null
  );
}

/** Lightweight per-project summary used by the client workspace header. */
export async function getProjectSummary(ctx: ServiceContext, projectId: string) {
  const projectWaves = await ctx.db.select().from(waves).where(eq(waves.projectId, projectId)).orderBy(waves.createdAt);
  const counts = projectWaves.length
    ? await ctx.db
        .select({ waveId: respondents.waveId, status: respondents.status, n: count() })
        .from(respondents)
        .where(inArray(respondents.waveId, projectWaves.map((w) => w.id)))
        .groupBy(respondents.waveId, respondents.status)
    : [];
  const byWave = new Map<string, { started: number; completed: number }>();
  for (const c of counts) {
    const entry = byWave.get(c.waveId) ?? { started: 0, completed: 0 };
    if (c.status === "completed") entry.completed += Number(c.n);
    if (c.status === "started") entry.started += Number(c.n);
    byWave.set(c.waveId, entry);
  }
  const current = pickCurrentWave(projectWaves);
  const closed = projectWaves.filter((w) => w.status === "closed");
  const managerCount = current
    ? Number(
        (
          await ctx.db
            .select({ n: count() })
            .from(respondents)
            .where(and(eq(respondents.waveId, current.id), eq(respondents.status, "completed"), sql`(${respondents.segmentAttributes}->>'is_manager') = 'true'`))
        )[0]?.n ?? 0,
      )
    : 0;
  return {
    waves: projectWaves.map((w) => ({ ...w, counts: byWave.get(w.id) ?? { started: 0, completed: 0 } })),
    currentWave: current,
    lastClosedWave: closed[closed.length - 1] ?? null,
    currentCompleted: current ? (byWave.get(current.id)?.completed ?? 0) : 0,
    currentManagers: managerCount,
  };
}

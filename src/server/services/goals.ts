import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { goals, metricResults, waves, type Goal, type GoalBaselineEntry } from "@/server/db/schema";
import { newId } from "@/lib/ids";
import { ConflictError, NotFoundError, ValidationError } from "@/server/shared/errors";
import { GOAL_SCOPES, GOAL_STATUSES, TARGET_DIRECTIONS, type GoalStatus } from "@/domain/shared/enums";
import type { GoalSuggestions } from "@/domain/ai/contracts";
import type { ServiceContext } from "./context";
import { requireProject } from "./access";
import { recordAudit } from "./audit";
import { getInsight } from "./insights";
import { pickCurrentWave } from "./portfolio";

export const goalInputSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  ownerName: z.string().trim().max(120).optional().or(z.literal("")),
  scope: z.enum(GOAL_SCOPES).default("organization"),
  relatedMetricIds: z.array(z.string()).default([]),
  targetDirection: z.enum(TARGET_DIRECTIONS).default("increase"),
  targetValue: z.coerce.number().optional(),
  actions: z.array(z.string().trim().min(1)).default([]),
  successEvidence: z.array(z.string().trim().min(1)).default([]),
  dueDate: z.coerce.date().optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type GoalInput = z.infer<typeof goalInputSchema>;

/** Allowed state transitions (spec §31). */
const TRANSITIONS: Record<GoalStatus, GoalStatus[]> = {
  draft: ["active", "archived"],
  active: ["in_progress", "review", "archived"],
  in_progress: ["review", "active", "archived"],
  review: ["completed", "in_progress", "archived"],
  completed: ["archived"],
  archived: [],
};

export function canTransition(from: GoalStatus, to: GoalStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Captures the metric values of the latest computed wave as the goal's baseline. */
async function captureBaseline(ctx: ServiceContext, projectId: string, metricIds: string[]): Promise<GoalBaselineEntry[]> {
  if (!metricIds.length) return [];
  const projectWaves = await ctx.db.select().from(waves).where(eq(waves.projectId, projectId));
  const current = pickCurrentWave(projectWaves.filter((w) => w.status === "closed"));
  if (!current) return [];
  const rows = await ctx.db.select().from(metricResults).where(and(eq(metricResults.waveId, current.id), eq(metricResults.segmentKey, "all")));
  return metricIds.map((metricId) => {
    const r = rows.find((x) => x.metricId === metricId);
    return { metricId, waveId: current.id, waveCode: current.code, score: r && !r.suppressed ? r.score : null, n: r?.n ?? 0 };
  });
}

export async function listGoals(ctx: ServiceContext, projectId: string): Promise<Goal[]> {
  await requireProject(ctx, projectId, "project.view");
  const rows = await ctx.db.select().from(goals).where(eq(goals.projectId, projectId)).orderBy(desc(goals.createdAt));
  // Client users see only approved goals that were published to them.
  if (ctx.actor.kind === "client") return rows.filter((g) => g.publishedToClient && g.approvalState === "approved" && g.status !== "draft");
  return rows;
}

export async function getGoal(ctx: ServiceContext, goalId: string): Promise<Goal> {
  const [row] = await ctx.db.select().from(goals).where(eq(goals.id, goalId)).limit(1);
  if (!row) throw new NotFoundError("goal");
  await requireProject(ctx, row.projectId, "project.view");
  if (ctx.actor.kind === "client" && !(row.publishedToClient && row.approvalState === "approved")) throw new NotFoundError("goal");
  return row;
}

export async function createGoal(ctx: ServiceContext, projectId: string, input: GoalInput, source: { kind: "human" } | { kind: "ai"; insightId: string } = { kind: "human" }): Promise<Goal> {
  const { client } = await requireProject(ctx, projectId, "goal.create");
  const parsed = goalInputSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("goal", parsed.error.issues.map((i) => i.path.join(".")));
  const d = parsed.data;
  const id = newId();
  const [created] = await ctx.db
    .insert(goals)
    .values({
      id,
      projectId,
      title: d.title,
      description: d.description || null,
      ownerName: d.ownerName || null,
      scope: d.scope,
      relatedMetricIds: d.relatedMetricIds,
      baseline: await captureBaseline(ctx, projectId, d.relatedMetricIds),
      targetDirection: d.targetDirection,
      targetValue: d.targetValue ?? null,
      actions: d.actions.map((text) => ({ id: newId(), text, done: false })),
      successEvidence: d.successEvidence,
      dueDate: d.dueDate ?? null,
      status: "draft",
      source: source.kind,
      approvalState: "pending",
      sourceInsightId: source.kind === "ai" ? source.insightId : null,
      notes: d.notes || null,
      createdByUserId: ctx.actor.userId,
    })
    .returning();
  await recordAudit(ctx, { action: "goal.created", entityType: "goal", entityId: id, clientId: client.id, projectId, metadata: { source: source.kind } });
  return created!;
}

/** Turns AI goal suggestions into draft goals (one per suggestion). They stay drafts until approved (spec §29.3). */
export async function adoptGoalSuggestions(ctx: ServiceContext, insightId: string, indexes?: number[]): Promise<Goal[]> {
  const insight = await getInsight(ctx, insightId);
  if (insight.type !== "goal_suggestions") throw new ValidationError("insight_type");
  const suggestions = insight.payload as GoalSuggestions;
  const created: Goal[] = [];
  for (const [index, g] of suggestions.goals.entries()) {
    if (indexes && !indexes.includes(index)) continue;
    created.push(
      await createGoal(
        ctx,
        insight.projectId,
        { title: g.title, description: g.rationale, scope: "management", relatedMetricIds: g.relatedMetrics, targetDirection: "increase", actions: g.recommendedActions, successEvidence: g.successEvidence, notes: g.suggestedReviewPeriod },
        { kind: "ai", insightId },
      ),
    );
  }
  return created;
}

export async function updateGoal(ctx: ServiceContext, goalId: string, input: GoalInput): Promise<Goal> {
  const row = await getGoal(ctx, goalId);
  const { client } = await requireProject(ctx, row.projectId, "goal.create");
  const parsed = goalInputSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("goal", parsed.error.issues.map((i) => i.path.join(".")));
  const d = parsed.data;
  const existingActions = row.actions;
  const actions = d.actions.map((text) => existingActions.find((a) => a.text === text) ?? { id: newId(), text, done: false });
  const metricsChanged = JSON.stringify(d.relatedMetricIds) !== JSON.stringify(row.relatedMetricIds);
  const [updated] = await ctx.db
    .update(goals)
    .set({
      title: d.title,
      description: d.description || null,
      ownerName: d.ownerName || null,
      scope: d.scope,
      relatedMetricIds: d.relatedMetricIds,
      baseline: metricsChanged || row.baseline.length === 0 ? await captureBaseline(ctx, row.projectId, d.relatedMetricIds) : row.baseline,
      targetDirection: d.targetDirection,
      targetValue: d.targetValue ?? null,
      actions,
      successEvidence: d.successEvidence,
      dueDate: d.dueDate ?? null,
      notes: d.notes || null,
      updatedAt: new Date(),
    })
    .where(eq(goals.id, goalId))
    .returning();
  await recordAudit(ctx, { action: "goal.updated", entityType: "goal", entityId: goalId, clientId: client.id, projectId: row.projectId });
  return updated!;
}

export async function toggleGoalAction(ctx: ServiceContext, goalId: string, actionId: string, done: boolean): Promise<Goal> {
  const row = await getGoal(ctx, goalId);
  await requireProject(ctx, row.projectId, "goal.create");
  const [updated] = await ctx.db
    .update(goals)
    .set({ actions: row.actions.map((a) => (a.id === actionId ? { ...a, done } : a)), updatedAt: new Date() })
    .where(eq(goals.id, goalId))
    .returning();
  return updated!;
}

/** Approval (NGG PM / super admin). Approving a draft activates it. */
export async function approveGoal(ctx: ServiceContext, goalId: string, decision: "approved" | "rejected"): Promise<Goal> {
  const row = await getGoal(ctx, goalId);
  const { client } = await requireProject(ctx, row.projectId, "goal.approve");
  const now = new Date();
  const [updated] = await ctx.db
    .update(goals)
    .set({
      approvalState: decision,
      approvedByUserId: ctx.actor.userId,
      approvedAt: now,
      status: decision === "approved" && row.status === "draft" ? "active" : decision === "rejected" ? "archived" : row.status,
      updatedAt: now,
    })
    .where(eq(goals.id, goalId))
    .returning();
  await recordAudit(ctx, { action: `goal.${decision}`, entityType: "goal", entityId: goalId, clientId: client.id, projectId: row.projectId });
  return updated!;
}

export async function setGoalStatus(ctx: ServiceContext, goalId: string, status: GoalStatus): Promise<Goal> {
  const row = await getGoal(ctx, goalId);
  const { client } = await requireProject(ctx, row.projectId, "goal.create");
  if (!GOAL_STATUSES.includes(status)) throw new ValidationError("status");
  if (!canTransition(row.status, status)) throw new ConflictError(`transition:${row.status}->${status}`);
  if (status === "active" && row.approvalState !== "approved") throw new ConflictError("not_approved");
  const [updated] = await ctx.db.update(goals).set({ status, updatedAt: new Date() }).where(eq(goals.id, goalId)).returning();
  await recordAudit(ctx, { action: "goal.status_changed", entityType: "goal", entityId: goalId, clientId: client.id, projectId: row.projectId, metadata: { from: row.status, to: status } });
  return updated!;
}

export async function publishGoalToClient(ctx: ServiceContext, goalId: string, published: boolean): Promise<Goal> {
  const row = await getGoal(ctx, goalId);
  const { client } = await requireProject(ctx, row.projectId, "goal.approve");
  if (published && row.approvalState !== "approved") throw new ConflictError("not_approved");
  const [updated] = await ctx.db.update(goals).set({ publishedToClient: published, updatedAt: new Date() }).where(eq(goals.id, goalId)).returning();
  await recordAudit(ctx, { action: published ? "goal.published" : "goal.unpublished", entityType: "goal", entityId: goalId, clientId: client.id, projectId: row.projectId });
  return updated!;
}

/** Current metric values for a goal's related metrics, from the latest computed wave (measurement connection, spec §32). */
export async function goalMeasurement(ctx: ServiceContext, goal: Goal): Promise<Array<{ metricId: string; baseline: GoalBaselineEntry | null; current: { waveCode: string; score: number | null; n: number } | null; delta: number | null }>> {
  const projectWaves = await ctx.db.select().from(waves).where(eq(waves.projectId, goal.projectId));
  const current = pickCurrentWave(projectWaves.filter((w) => w.status === "closed"));
  const rows = current ? await ctx.db.select().from(metricResults).where(and(eq(metricResults.waveId, current.id), eq(metricResults.segmentKey, "all"))) : [];
  return goal.relatedMetricIds.map((metricId) => {
    const base = goal.baseline.find((b) => b.metricId === metricId) ?? null;
    const r = rows.find((x) => x.metricId === metricId);
    const cur = current && r ? { waveCode: current.code, score: r.suppressed ? null : r.score, n: r.n } : null;
    const sameWave = base && cur && base.waveId === current?.id;
    const delta = base?.score != null && cur?.score != null && !sameWave ? Math.round((cur.score - base.score) * 100) / 100 : null;
    return { metricId, baseline: base, current: cur, delta };
  });
}

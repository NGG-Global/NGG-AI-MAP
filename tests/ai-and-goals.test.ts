import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { testDb, closeDb, seedWorld, ctxFor, type World } from "./helpers/db";
import { seedLibrary } from "@/server/seed/library";
import type { Db } from "@/server/db/connection";
import { createBaselineQuestionnaire } from "@/server/services/questionnaires";
import { createWave, publishWave, closeWave } from "@/server/services/waves";
import { answerEverything } from "./helpers/survey";
import { generateInsight, listProjectInsights, reviewInsight, updateInsightPayload, buildPayloadForWave } from "@/server/services/insights";
import { adoptGoalSuggestions, approveGoal, createGoal, listGoals, publishGoalToClient, setGoalStatus, canTransition, goalMeasurement } from "@/server/services/goals";
import { clients } from "@/server/db/schema";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/server/shared/errors";
import { MockAIProvider } from "@/server/ai/mock";
import { buildAnalyticalPayload, redactPii } from "@/domain/ai/payload";
import type { ExecutiveSummary } from "@/domain/ai/contracts";

let db: Db;
let world: World;
let waveId: string;

beforeAll(async () => {
  db = await testDb();
  world = await seedWorld(db);
  await seedLibrary(db);
  await db.update(clients).set({ segmentTaxonomy: { departments: ["Tech", "Ops"], roleFamilies: ["Pro"], seniorityGroups: ["<2y"], locations: [] }, privacyThreshold: 7 }).where(eq(clients.id, world.clientA.id));
  const ctx = ctxFor(db, world.pmA);
  await createBaselineQuestionnaire(ctx, world.clientA.projectId);
  const wave = await createWave(ctx, world.clientA.projectId, { name: "T0", type: "baseline", questionnaireSource: "draft", audienceScope: "all_organization", audienceUnits: [], distributionMode: "public_link", privacyMode: "anonymous", locale: "he", invitedCount: 30 });
  const published = await publishWave(ctx, wave.id);
  for (let i = 0; i < 9; i++) await answerEverything(db, published.publicToken!, { department: "Tech", isManager: false, usage: "almost_daily", likert: 3, text: "אין לי מספיק הדרכה, צרו קשר dana@example.com" });
  for (let i = 0; i < 7; i++) await answerEverything(db, published.publicToken!, { department: "Tech", isManager: true, usage: "days_1_2", likert: 4, managerLikert: 5, text: "אין לי מספיק הדרכה, צרו קשר dana@example.com" });
  await closeWave(ctx, wave.id);
  waveId = wave.id;
}, 120_000);
afterAll(async () => closeDb(db));

describe("AI layer", () => {
  it("builds a sanitised payload with no raw data and redacts PII in open text", async () => {
    const payload = await buildPayloadForWave(ctxFor(db, world.pmA), waveId, { includeOpenText: true });
    expect(payload.respondentCount).toBe(16);
    expect(payload.metrics.length).toBeGreaterThan(10);
    expect(JSON.stringify(payload)).not.toContain("example.com");
    expect(payload.openTextSamples.every((s) => s.includes("[email]"))).toBe(true);
    expect(redactPii("call 050-1234567 or a@b.co")).toBe("call [phone] or [email]");
    // analysts can build payloads but not include open text (raw access)
    await expect(buildPayloadForWave(ctxFor(db, world.analystA), waveId, { includeOpenText: true })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("generated insights start as drafts, carry evidence refs, and are invisible to clients until published", async () => {
    const ctx = ctxFor(db, world.pmA);
    const insight = await generateInsight(ctx, waveId, "executive_summary");
    expect(insight.status).toBe("draft");
    expect(insight.provider).toBe("mock");
    expect(insight.evidence.length).toBeGreaterThan(0);
    expect((insight.payload as ExecutiveSummary).insufficientEvidence).toBe(false);
    expect(JSON.stringify(insight.inputSnapshot)).not.toContain("openTextSamples\":[");
    expect(await listProjectInsights(ctxFor(db, world.clientAdminA), world.clientA.projectId)).toEqual([]);
    await expect(reviewInsight(ctxFor(db, world.analystA), insight.id, "published")).rejects.toBeInstanceOf(ForbiddenError);
    await expect(reviewInsight(ctxFor(db, world.clientAdminA), insight.id, "published")).rejects.toThrow();
    const reviewed = await reviewInsight(ctx, insight.id, "reviewed");
    expect(reviewed.status).toBe("reviewed");
    const published = await reviewInsight(ctx, insight.id, "published", "ok");
    expect(published.status).toBe("published");
    expect(published.publishedAt).not.toBeNull();
    const visible = await listProjectInsights(ctxFor(db, world.clientAdminA), world.clientA.projectId);
    expect(visible.map((i) => i.id)).toEqual([insight.id]);
  });

  it("rejects hallucinated metric ids and flags causal language on edit", async () => {
    const ctx = ctxFor(db, world.pmA);
    const insight = await generateInsight(ctx, waveId, "explain_change", { metricId: "gail_total" });
    const edited = await updateInsightPayload(ctx, insight.id, { ...(insight.payload as object), whatChanged: "The workshop caused the rise", relatedChanges: [{ metricId: "made_up_metric", text: "x" }] });
    expect(edited.validationWarnings).toContain("causal_language");
    expect((edited.payload as { relatedChanges: unknown[] }).relatedChanges).toEqual([]);
    await expect(updateInsightPayload(ctx, insight.id, { ...(insight.payload as object), metricId: "made_up_metric" })).rejects.toBeInstanceOf(ValidationError);
    const mock = new MockAIProvider();
    const empty = buildAnalyticalPayload({ clientLabel: "c", projectLabel: "p", locale: "en", waveCode: "T0", baselineWaveCode: null, respondentCount: 3, privacyThreshold: 7, metrics: [], compared: [], gaps: [], barriers: [] });
    const out = await mock.generateExecutiveSummary(empty);
    expect(out.insufficientEvidence).toBe(true);
  });
});

describe("goals", () => {
  it("enforces the state machine and approval before activation", async () => {
    const ctx = ctxFor(db, world.pmA);
    const goal = await createGoal(ctx, world.clientA.projectId, { title: "Redesign one recurring workflow", relatedMetricIds: ["agentic_manage_systems", "verification_behavior"], targetDirection: "increase", actions: ["Document workflow", "Define review point"], successEvidence: ["Workflow documented"], scope: "management" });
    expect(goal.status).toBe("draft");
    expect(goal.source).toBe("human");
    expect(goal.baseline.find((b) => b.metricId === "verification_behavior")!.score).not.toBeNull();
    expect(goal.baseline.find((b) => b.metricId === "verification_behavior")!.waveCode).toBe("T0");
    await expect(setGoalStatus(ctx, goal.id, "active")).rejects.toBeInstanceOf(ConflictError);
    await expect(setGoalStatus(ctx, goal.id, "completed")).rejects.toBeInstanceOf(ConflictError);
    expect(canTransition("review", "completed")).toBe(true);
    expect(canTransition("completed", "active")).toBe(false);
    await expect(approveGoal(ctxFor(db, world.analystA), goal.id, "approved")).rejects.toBeInstanceOf(ForbiddenError);
    const approved = await approveGoal(ctx, goal.id, "approved");
    expect(approved.status).toBe("active");
    const inProgress = await setGoalStatus(ctx, goal.id, "in_progress");
    expect(inProgress.status).toBe("in_progress");
    // client sees nothing until published
    expect(await listGoals(ctxFor(db, world.clientAdminA), world.clientA.projectId)).toEqual([]);
    await publishGoalToClient(ctx, goal.id, true);
    const clientView = await listGoals(ctxFor(db, world.clientAdminA), world.clientA.projectId);
    expect(clientView.map((g) => g.id)).toEqual([goal.id]);
    const measurement = await goalMeasurement(ctx, goal.id ? approved : approved);
    expect(measurement.length).toBe(2);
    expect(measurement[0]!.delta).toBeNull(); // same wave as baseline → no delta yet
    await expect(listGoals(ctxFor(db, world.clientViewerB), world.clientA.projectId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("adopts AI goal suggestions as pending drafts linked to the insight", async () => {
    const ctx = ctxFor(db, world.pmA);
    const insight = await generateInsight(ctx, waveId, "goal_suggestions");
    const created = await adoptGoalSuggestions(ctx, insight.id);
    expect(created.length).toBeGreaterThan(0);
    expect(created.every((g) => g.source === "ai" && g.status === "draft" && g.approvalState === "pending" && g.sourceInsightId === insight.id)).toBe(true);
    expect(created[0]!.relatedMetricIds.length).toBeGreaterThan(0);
  });
});

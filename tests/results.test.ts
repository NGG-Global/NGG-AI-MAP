import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { testDb, closeDb, seedWorld, ctxFor, type World } from "./helpers/db";
import { seedLibrary } from "@/server/seed/library";
import type { Db } from "@/server/db/connection";
import { createBaselineQuestionnaire } from "@/server/services/questionnaires";
import { createWave, publishWave, closeWave } from "@/server/services/waves";
import { completeRespondent, resolveSurvey, saveAnswers, startPublicRespondent, computeProgress, loadAnswers } from "@/server/services/survey";
import { computeWaveResults, getWaveResults, getMetricTrend } from "@/server/services/results";
import { clients, respondents } from "@/server/db/schema";
import { ForbiddenError } from "@/server/shared/errors";

let db: Db;
let world: World;

async function answerEverything(publicToken: string, profile: { department: string; isManager: boolean; usage: string; likert: number }) {
  const start = await resolveSurvey(db, publicToken);
  if (!("access" in start) || start.access.kind !== "public") throw new Error("public access expected");
  const { token } = await startPublicRespondent(db, start.access);
  const resolved = await resolveSurvey(db, publicToken, token);
  if (!("access" in resolved) || resolved.access.kind !== "respondent") throw new Error("respondent expected");
  let access = resolved.access;
  await saveAnswers(db, access, { ctx_department: profile.department, ctx_role_family: "Pro", ctx_is_manager: profile.isManager ? "yes" : "no", ctx_seniority: "<2y", ctx_ai_use_30d: profile.usage });
  const [resp] = await db.select().from(respondents).where(eq(respondents.id, access.respondent.id));
  access = { ...access, respondent: resp! };
  const answers = await loadAnswers(db, resp!.id);
  const progress = computeProgress(access.definition, resp!, answers);
  const payload: Record<string, unknown> = {};
  for (const entry of progress.routed) {
    for (const q of entry.questions) {
      if (q.canonicalId in answers) continue;
      if (q.type === "likert_5") payload[q.canonicalId] = profile.likert;
      else if (q.type === "single_choice") payload[q.canonicalId] = q.options?.[0]?.value;
      else if (q.type === "multi_select") payload[q.canonicalId] = q.options?.slice(0, 2).map((o) => o.value);
      else if (q.type === "matrix") payload[q.canonicalId] = Object.fromEntries((q.matrixRows ?? []).map((r) => [r.key, q.matrixColumns?.[1]?.value]));
      else payload[q.canonicalId] = "free text";
    }
  }
  await saveAnswers(db, access, payload);
  const done = await completeRespondent(db, access);
  if (!done.ok) throw new Error("not complete");
}

beforeAll(async () => {
  db = await testDb();
  world = await seedWorld(db);
  await seedLibrary(db);
  await db.update(clients).set({ segmentTaxonomy: { departments: ["Tech", "Ops"], roleFamilies: ["Pro"], seniorityGroups: ["<2y"], locations: [] }, privacyThreshold: 7 }).where(eq(clients.id, world.clientA.id));
  const ctx = ctxFor(db, world.pmA);
  await createBaselineQuestionnaire(ctx, world.clientA.projectId);
  const wave = await createWave(ctx, world.clientA.projectId, { name: "T0", type: "baseline", questionnaireSource: "draft", audienceScope: "all_organization", audienceUnits: [], distributionMode: "public_link", privacyMode: "anonymous", locale: "he", invitedCount: 20 });
  const published = await publishWave(ctx, wave.id);
  // 8 Tech employees (likert 4), 7 Tech managers (likert 5), 3 Ops employees (likert 2) → Ops is below threshold
  for (let i = 0; i < 8; i++) await answerEverything(published.publicToken!, { department: "Tech", isManager: false, usage: "daily", likert: 4 });
  for (let i = 0; i < 7; i++) await answerEverything(published.publicToken!, { department: "Tech", isManager: true, usage: "weekly", likert: 5 });
  for (let i = 0; i < 3; i++) await answerEverything(published.publicToken!, { department: "Ops", isManager: false, usage: "none", likert: 2 });
  await closeWave(ctx, wave.id);
}, 120_000);
afterAll(async () => closeDb(db));

describe("results service", () => {
  it("computes cached aggregates on close and exposes them to client users without raw data", async () => {
    const ctx = ctxFor(db, world.clientAdminA);
    const [wave] = await db.query.waves.findMany({ where: (w, { eq }) => eq(w.projectId, world.clientA.projectId) });
    const view = await getWaveResults(ctx, wave!.id);
    expect(view.respondentCount).toBe(18);
    const usage = view.compared.find((c) => c.metricId === "ai_usage")!;
    expect(usage.current.n).toBe(18);
    expect(usage.baseline).toBeNull();
    const literacy = view.compared.find((c) => c.metricId === "ai_literacy")!;
    expect(literacy.current.score).toBeGreaterThan(3);
    const am = view.compared.find((c) => c.metricId === "agentic_manage_self")!;
    expect(am.current.n).toBe(7); // managers only
    expect(am.current.score).toBe(5);
    // gaps: managers 5 vs employees (8 Tech ×4 + 3 Ops ×2) → team mean < 5
    const gap = view.gaps.find((g) => g.pairId === "gap_ai_clarity")!;
    expect(gap.managerScore).toBe(5);
    expect(gap.teamN).toBe(11);
    expect(gap.gap).toBeLessThan(0);
    // distributions
    const patterns = view.distributions.find((d) => d.itemCanonicalId === "work_patterns")!;
    expect(patterns.n).toBe(15); // non-users skipped the section
    expect(patterns.buckets.assist).toBe(100);
  });

  it("suppresses small segments and still lists them as options", async () => {
    const ctx = ctxFor(db, world.clientAdminA);
    const [wave] = await db.query.waves.findMany({ where: (w, { eq }) => eq(w.projectId, world.clientA.projectId) });
    const ops = await getWaveResults(ctx, wave!.id, { key: "department", value: "Ops" });
    expect(ops.compared.every((c) => c.current.suppressed)).toBe(true);
    expect(ops.compared.every((c) => c.current.score === null && c.current.n === 0)).toBe(true);
    const tech = await getWaveResults(ctx, wave!.id, { key: "department", value: "Tech" });
    expect(tech.compared.find((c) => c.metricId === "ai_usage")!.current.n).toBe(15);
    expect(tech.segmentOptions.department).toEqual(expect.arrayContaining(["Tech", "Ops"]));
    const managersSeg = await getWaveResults(ctx, wave!.id, { key: "is_manager", value: "true" });
    expect(managersSeg.compared.find((c) => c.metricId === "ai_usage")!.current.n).toBe(7);
  });

  it("only NGG wave managers may trigger computation; other tenants cannot read results", async () => {
    const [wave] = await db.query.waves.findMany({ where: (w, { eq }) => eq(w.projectId, world.clientA.projectId) });
    await expect(computeWaveResults(ctxFor(db, world.clientAdminA), wave!.id)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(computeWaveResults(ctxFor(db, world.analystA), wave!.id)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(getWaveResults(ctxFor(db, world.clientViewerB), wave!.id)).rejects.toThrow();
    const trend = await getMetricTrend(ctxFor(db, world.analystA), world.clientA.projectId, "ai_literacy");
    expect(trend).toHaveLength(1);
    expect(trend[0]!.computed).toBe(true);
  });
});

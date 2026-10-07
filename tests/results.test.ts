import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { testDb, closeDb, seedWorld, ctxFor, type World } from "./helpers/db";
import { seedLibrary } from "@/server/seed/library";
import type { Db } from "@/server/db/connection";
import { createBaselineQuestionnaire } from "@/server/services/questionnaires";
import { createWave, publishWave, closeWave } from "@/server/services/waves";
import { answerEverything } from "./helpers/survey";
import { computeWaveResults, getWaveResults, getMetricTrend } from "@/server/services/results";
import { clients } from "@/server/db/schema";
import { ForbiddenError } from "@/server/shared/errors";

let db: Db;
let world: World;

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
  for (let i = 0; i < 8; i++) expect(await answerEverything(db, published.publicToken!, { department: "Tech", isManager: false, usage: "almost_daily", likert: 4 })).toBe(true);
  for (let i = 0; i < 7; i++) expect(await answerEverything(db, published.publicToken!, { department: "Tech", isManager: true, usage: "days_1_2", likert: 5 })).toBe(true);
  for (let i = 0; i < 3; i++) expect(await answerEverything(db, published.publicToken!, { department: "Ops", isManager: false, usage: "none", likert: 2 })).toBe(true);
  await closeWave(ctx, wave.id);
}, 120_000);
afterAll(async () => closeDb(db));

describe("results service", () => {
  it("computes cached aggregates on close and exposes them to client users without raw data", async () => {
    const ctx = ctxFor(db, world.clientAdminA);
    const [wave] = await db.query.waves.findMany({ where: (w, { eq }) => eq(w.projectId, world.clientA.projectId) });
    const view = await getWaveResults(ctx, wave!.id);
    expect(view.respondentCount).toBe(18);
    const usage = view.compared.find((c) => c.metricId === "ai_usage_frequency")!;
    expect(usage.current.n).toBe(18);
    expect(usage.baseline).toBeNull();
    const literacy = view.compared.find((c) => c.metricId === "gail_total")!;
    expect(literacy.current.score).toBeGreaterThan(3);
    const am = view.compared.find((c) => c.metricId === "agentic_manage_self")!;
    expect(am.current.n).toBe(7); // managers only
    expect(am.current.score).toBe(5);
    // gaps: managers' self-report 5 vs everyone rating their own manager (8×4 + 7×5 + 3×2) → team mean < 5
    const gap = view.gaps.find((g) => g.pairId === "gap_expectations")!;
    expect(gap.managerScore).toBe(5);
    expect(gap.teamN).toBe(18);
    expect(gap.teamScore).toBeCloseTo((8 * 4 + 7 * 5 + 3 * 2) / 18, 1);
    expect(gap.gap).toBeLessThan(0);
    // distributions
    const useCases = view.distributions.find((d) => d.itemCanonicalId === "USE_04")!;
    expect(useCases.n).toBe(15); // non-users skipped the question
    expect(useCases.buckets.writing).toBe(100);
    // the depth-of-work funnel counts users at or above "often" (4)
    expect(view.compared.find((c) => c.metricId === "aw_funnel_assist")!.current.score).toBe(100);
    expect(view.compared.find((c) => c.metricId === "aw_funnel_assist")!.current.n).toBe(15);
  });

  it("suppresses small segments and still lists them as options", async () => {
    const ctx = ctxFor(db, world.clientAdminA);
    const [wave] = await db.query.waves.findMany({ where: (w, { eq }) => eq(w.projectId, world.clientA.projectId) });
    const ops = await getWaveResults(ctx, wave!.id, { key: "department", value: "Ops" });
    expect(ops.compared.every((c) => c.current.suppressed)).toBe(true);
    expect(ops.compared.every((c) => c.current.score === null && c.current.n === 0)).toBe(true);
    const tech = await getWaveResults(ctx, wave!.id, { key: "department", value: "Tech" });
    expect(tech.compared.find((c) => c.metricId === "ai_usage_frequency")!.current.n).toBe(15);
    expect(tech.segmentOptions.department).toEqual(expect.arrayContaining(["Tech", "Ops"]));
    const managersSeg = await getWaveResults(ctx, wave!.id, { key: "is_manager", value: "true" });
    expect(managersSeg.compared.find((c) => c.metricId === "ai_usage_frequency")!.current.n).toBe(7);
  });

  it("only NGG wave managers may trigger computation; other tenants cannot read results", async () => {
    const [wave] = await db.query.waves.findMany({ where: (w, { eq }) => eq(w.projectId, world.clientA.projectId) });
    await expect(computeWaveResults(ctxFor(db, world.clientAdminA), wave!.id)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(computeWaveResults(ctxFor(db, world.analystA), wave!.id)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(getWaveResults(ctxFor(db, world.clientViewerB), wave!.id)).rejects.toThrow();
    const trend = await getMetricTrend(ctxFor(db, world.analystA), world.clientA.projectId, "gail_total");
    expect(trend).toHaveLength(1);
    expect(trend[0]!.computed).toBe(true);
  });
});

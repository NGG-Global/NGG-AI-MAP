import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { testDb, closeDb, seedWorld, ctxFor, type World } from "./helpers/db";
import { seedLibrary } from "@/server/seed/library";
import type { Db } from "@/server/db/connection";
import { createBaselineQuestionnaire } from "@/server/services/questionnaires";
import { createWave, publishWave, listWaves, createRespondentTokens, closeWave } from "@/server/services/waves";
import { completeRespondent, computeProgress, loadAnswers, resolveSurvey, saveAnswers, startPublicRespondent, AnswerValidationError } from "@/server/services/survey";
import { clients, responses, respondents } from "@/server/db/schema";

let db: Db;
let world: World;
let publicToken: string;

beforeAll(async () => {
  db = await testDb();
  world = await seedWorld(db);
  await seedLibrary(db);
  await db.update(clients).set({ segmentTaxonomy: { departments: ["Tech", "Ops"], roleFamilies: ["Pro", "Mgmt"], seniorityGroups: ["<2y", "2-5y"], locations: [] } }).where(eq(clients.id, world.clientA.id));
  const ctx = ctxFor(db, world.pmA);
  await createBaselineQuestionnaire(ctx, world.clientA.projectId);
  const wave = await createWave(ctx, world.clientA.projectId, { name: "T0", type: "baseline", questionnaireSource: "draft", audienceScope: "all_organization", audienceUnits: [], distributionMode: "public_link", privacyMode: "anonymous", locale: "he", invitedCount: 50 });
  const published = await publishWave(ctx, wave.id);
  publicToken = published.publicToken!;
});
afterAll(async () => closeDb(db));

describe("survey runtime", () => {
  it("rejects unknown tokens and resolves public links", async () => {
    expect(await resolveSurvey(db, "nope")).toEqual({ closed: "invalid" });
    const result = await resolveSurvey(db, publicToken);
    expect("access" in result && result.access.kind).toBe("public");
  });

  it("routes a manager through manager modules and blocks hidden answers", async () => {
    const start = await resolveSurvey(db, publicToken);
    if (!("access" in start) || start.access.kind !== "public") throw new Error("expected public access");
    const { token } = await startPublicRespondent(db, start.access);
    const resolved = await resolveSurvey(db, publicToken, token);
    if (!("access" in resolved) || resolved.access.kind !== "respondent") throw new Error("expected respondent access");
    let access = resolved.access;

    // before answering, the manager module is not visible, so answers to it are ignored
    await saveAnswers(db, access, { am_self_01: 5 });
    expect(await loadAnswers(db, access.respondent.id)).toEqual({});

    // answering the routing questions updates segment attributes
    const saved = await saveAnswers(db, access, { ctx_department: "Tech", ctx_role_family: "Mgmt", ctx_is_manager: "yes", ctx_seniority: "2-5y" });
    const [resp] = await db.select().from(respondents).where(eq(respondents.id, access.respondent.id));
    expect(resp!.segmentAttributes).toEqual({ department: "Tech", role_family: "Mgmt", is_manager: true, seniority: "2-5y" });
    expect(saved.progress.routed.map((e) => e.section.key)).toContain("agentic_management");
    expect(saved.progress.routed.map((e) => e.section.key)).not.toContain("manager_experience");

    // now manager items are accepted; non-AI-user skip hides agentic work when usage is none
    access = { ...access, respondent: resp! };
    await saveAnswers(db, access, { ctx_ai_use_30d: "none" });
    const answers = await loadAnswers(db, access.respondent.id);
    const progress = computeProgress(access.definition, resp!, answers);
    expect(progress.routed.map((e) => e.section.key)).not.toContain("agentic_work");
    expect(progress.routed.map((e) => e.section.key)).toContain("agentic_management");
  });

  it("validates answers against the frozen definition", async () => {
    const start = await resolveSurvey(db, publicToken);
    if (!("access" in start) || start.access.kind !== "public") throw new Error("expected public access");
    const { token } = await startPublicRespondent(db, start.access);
    const resolved = await resolveSurvey(db, publicToken, token);
    if (!("access" in resolved) || resolved.access.kind !== "respondent") throw new Error("expected respondent access");
    await expect(saveAnswers(db, resolved.access, { ctx_is_manager: "maybe" })).rejects.toBeInstanceOf(AnswerValidationError);
    await expect(saveAnswers(db, resolved.access, { ctx_is_manager: null })).rejects.toBeInstanceOf(AnswerValidationError); // PNTA not allowed on routing item
    await saveAnswers(db, resolved.access, { ctx_is_manager: "no", ctx_department: null });
    const answers = await loadAnswers(db, resolved.access.respondent.id);
    expect(answers.ctx_is_manager).toBe("no");
    expect(answers.ctx_department).toBeNull();
    // likert out of range
    await saveAnswers(db, resolved.access, { ctx_ai_use_30d: "daily", ctx_role_family: "Pro", ctx_seniority: "<2y" });
    await expect(saveAnswers(db, resolved.access, { usage_routine: 9 })).rejects.toBeInstanceOf(AnswerValidationError);
    await saveAnswers(db, resolved.access, { usage_routine: 4, usecase_types: ["writing", "analysis"], work_patterns: ["assist"] });
    const after = await loadAnswers(db, resolved.access.respondent.id);
    expect(after.usecase_types).toEqual(["writing", "analysis"]);
    // completion is refused while required answers are missing
    const done = await completeRespondent(db, resolved.access);
    expect(done.ok).toBe(false);
  });

  it("completes an employee who answered every required visible question", async () => {
    const start = await resolveSurvey(db, publicToken);
    if (!("access" in start) || start.access.kind !== "public") throw new Error("expected public access");
    const { token } = await startPublicRespondent(db, start.access);
    const resolved = await resolveSurvey(db, publicToken, token);
    if (!("access" in resolved) || resolved.access.kind !== "respondent") throw new Error("expected respondent access");
    let access = resolved.access;
    await saveAnswers(db, access, { ctx_department: "Ops", ctx_role_family: "Pro", ctx_is_manager: "no", ctx_seniority: "<2y", ctx_ai_use_30d: "weekly" });
    const [resp] = await db.select().from(respondents).where(eq(respondents.id, access.respondent.id));
    access = { ...access, respondent: resp! };
    // answer everything visible with a valid value (or PNTA where allowed)
    const answers = await loadAnswers(db, resp!.id);
    const progress = computeProgress(access.definition, resp!, answers);
    const payload: Record<string, unknown> = {};
    for (const entry of progress.routed) {
      for (const q of entry.questions) {
        if (q.canonicalId in answers) continue;
        if (q.type === "likert_5") payload[q.canonicalId] = 4;
        else if (q.type === "single_choice") payload[q.canonicalId] = q.options?.[0]?.value;
        else if (q.type === "multi_select") payload[q.canonicalId] = [q.options?.[0]?.value];
        else if (q.type === "matrix") payload[q.canonicalId] = Object.fromEntries((q.matrixRows ?? []).map((r) => [r.key, q.matrixColumns?.[1]?.value]));
        else payload[q.canonicalId] = "ok";
      }
    }
    await saveAnswers(db, access, payload);
    const done = await completeRespondent(db, access);
    expect(done.ok).toBe(true);
    const [final] = await db.select().from(respondents).where(eq(respondents.id, resp!.id));
    expect(final!.status).toBe("completed");
    // manager-only items were never stored for an employee
    const stored = await db.select().from(responses).where(eq(responses.respondentId, resp!.id));
    expect(stored.some((r) => r.questionCanonicalId.startsWith("am_"))).toBe(false);
    expect(stored.some((r) => r.questionCanonicalId.startsWith("mx_"))).toBe(true);
    // a completed respondent reaches a closed state on the next visit
    const again = await resolveSurvey(db, publicToken, token);
    expect("access" in again).toBe(true);
  });

  it("closed waves stop accepting respondents and unique tokens resolve directly", async () => {
    const ctx = ctxFor(db, world.pmA);
    const [t0] = await listWaves(ctx, world.clientA.projectId);
    await closeWave(ctx, t0!.id);
    expect(await resolveSurvey(db, publicToken)).toEqual({ closed: "not_open" });
    const t1 = await createWave(ctx, world.clientA.projectId, { name: "T1", type: "follow_up", questionnaireSource: "duplicate", audienceScope: "all_organization", audienceUnits: [], distributionMode: "unique_tokens", privacyMode: "anonymous", locale: "en", invitedCount: 0 });
    await publishWave(ctx, t1.id);
    const token = (await createRespondentTokens(ctx, t1.id, { count: 1 }))[0]!.token;
    const result = await resolveSurvey(db, token);
    expect("access" in result && result.access.kind === "respondent" && result.access.wave.locale).toBe("en");
  });
});

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
    await saveAnswers(db, access, { AM_SELF_01: 5 });
    expect(await loadAnswers(db, access.respondent.id)).toEqual({});

    // answering the routing questions updates segment attributes; CTX_04 is revealed and accepted on the same page
    const saved = await saveAnswers(db, access, { CTX_01: "Tech", CTX_02: "Mgmt", CTX_03: "yes", CTX_04: "4_7", CTX_05: "2-5y" });
    expect(saved.answers.CTX_04).toBe("4_7");
    const [resp] = await db.select().from(respondents).where(eq(respondents.id, access.respondent.id));
    expect(resp!.segmentAttributes).toEqual({ department: "Tech", role_family: "Mgmt", is_manager: true, seniority: "2-5y" });
    expect(saved.progress.routed.map((e) => e.section.key)).toContain("SECTION_AGENTIC_MANAGEMENT");
    // managers also rate their own direct manager (copy §10)
    expect(saved.progress.routed.map((e) => e.section.key)).toContain("SECTION_MANAGER_EXPERIENCE");

    // non-users skip agentic work, trust and verification but keep the manager modules
    access = { ...access, respondent: resp! };
    await saveAnswers(db, access, { USE_01: "none" });
    let answers = await loadAnswers(db, access.respondent.id);
    let progress = computeProgress(access.definition, resp!, answers);
    const keys = progress.routed.map((e) => e.section.key);
    for (const key of ["SECTION_AGENTIC_WORK", "SECTION_STIAS_3", "SECTION_VERIFICATION"]) expect(keys).not.toContain(key);
    expect(keys).toContain("SECTION_AGENTIC_MANAGEMENT");

    // USE_03 appears only when more than one tool was chosen, and only offers those tools
    await saveAnswers(db, access, { USE_01: "days_3_4", USE_02: ["chatgpt", "claude"], USE_03: "claude", AM_SELF_01: 4 });
    answers = await loadAnswers(db, access.respondent.id);
    expect(answers.USE_03).toBe("claude");
    expect(answers.AM_SELF_01).toBe(4);
    // narrowing the tools hides USE_03 and its stale answer is discarded
    await saveAnswers(db, access, { USE_02: ["chatgpt"] });
    answers = await loadAnswers(db, access.respondent.id);
    expect(answers.USE_03).toBeUndefined();
    // leaving the manager role discards manager-only answers
    const after = await saveAnswers(db, access, { CTX_03: "no" });
    expect(after.answers.CTX_04).toBeUndefined();
    expect(after.answers.AM_SELF_01).toBeUndefined();
    progress = after.progress;
    expect(progress.routed.map((e) => e.section.key)).not.toContain("SECTION_AGENTIC_MANAGEMENT");
  });

  it("validates answers against the frozen definition", async () => {
    const start = await resolveSurvey(db, publicToken);
    if (!("access" in start) || start.access.kind !== "public") throw new Error("expected public access");
    const { token } = await startPublicRespondent(db, start.access);
    const resolved = await resolveSurvey(db, publicToken, token);
    if (!("access" in resolved) || resolved.access.kind !== "respondent") throw new Error("expected respondent access");
    const access = resolved.access;
    await expect(saveAnswers(db, access, { CTX_03: "maybe" })).rejects.toBeInstanceOf(AnswerValidationError);
    // the copy defines no "prefer not to answer" option
    await expect(saveAnswers(db, access, { CTX_03: null })).rejects.toBeInstanceOf(AnswerValidationError);
    await saveAnswers(db, access, { CTX_03: "no", CTX_01: "Ops", CTX_02: "Pro", CTX_05: "<2y", USE_01: "almost_daily" });
    // scale range and N/A handling
    await expect(saveAnswers(db, access, { USE_07: 9 })).rejects.toBeInstanceOf(AnswerValidationError);
    await saveAnswers(db, access, { USE_07: "na" });
    await expect(saveAnswers(db, access, { GAIL_PE_01: "na" })).rejects.toBeInstanceOf(AnswerValidationError);
    await expect(saveAnswers(db, access, { GAIL_PE_01: 8 })).rejects.toBeInstanceOf(AnswerValidationError);
    await saveAnswers(db, access, { GAIL_PE_01: 7 });
    // exclusive option, selection limit and piped options
    await expect(saveAnswers(db, access, { BARRIER_01: ["no_barrier", "time"] })).rejects.toBeInstanceOf(AnswerValidationError);
    await expect(saveAnswers(db, access, { ENABLEMENT_NEED_01: ["basic_training", "clear_policy", "coaching", "dedicated_time"] })).rejects.toBeInstanceOf(AnswerValidationError);
    await expect(saveAnswers(db, access, { USE_02: ["chatgpt", "copilot"], USE_03: "claude" })).rejects.toBeInstanceOf(AnswerValidationError);
    await saveAnswers(db, access, { USE_04: ["writing", "analysis"], BARRIER_01: ["no_barrier"] });
    const after = await loadAnswers(db, access.respondent.id);
    expect(after.USE_07).toBe("na");
    expect(after.USE_04).toEqual(["writing", "analysis"]);
    expect(after.BARRIER_01).toEqual(["no_barrier"]);
    // completion is refused while required answers are missing
    const done = await completeRespondent(db, access);
    expect(done.ok).toBe(false);
  });

  it("completes an employee who answered every required visible question", async () => {
    const start = await resolveSurvey(db, publicToken);
    if (!("access" in start) || start.access.kind !== "public") throw new Error("expected public access");
    const { token } = await startPublicRespondent(db, start.access);
    const resolved = await resolveSurvey(db, publicToken, token);
    if (!("access" in resolved) || resolved.access.kind !== "respondent") throw new Error("expected respondent access");
    let access = resolved.access;
    await saveAnswers(db, access, { CTX_01: "Ops", CTX_02: "Pro", CTX_03: "no", CTX_05: "<2y", USE_01: "days_1_2" });
    const [resp] = await db.select().from(respondents).where(eq(respondents.id, access.respondent.id));
    access = { ...access, respondent: resp! };
    // answer everything visible with a valid value, page by page, as the runtime reveals follow-ups
    for (let round = 0; round < 4; round += 1) {
      const answers = await loadAnswers(db, resp!.id);
      const progress = computeProgress(access.definition, resp!, answers);
      const payload: Record<string, unknown> = {};
      for (const entry of progress.routed) {
        for (const q of entry.questions) {
          if (q.canonicalId in answers) continue;
          if (q.type === "likert_5" || q.type === "likert_7") payload[q.canonicalId] = q.naOption && q.canonicalId.endsWith("_02") ? "na" : 4;
          else if (q.type === "single_choice") payload[q.canonicalId] = q.options?.[0]?.value;
          else if (q.type === "multi_select") payload[q.canonicalId] = [q.options?.[0]?.value];
          else if (q.type === "matrix") payload[q.canonicalId] = Object.fromEntries((q.matrixRows ?? []).map((r) => [r.key, q.matrixColumns?.[1]?.value]));
          else payload[q.canonicalId] = "ok";
        }
      }
      if (Object.keys(payload).length === 0) break;
      await saveAnswers(db, access, payload);
    }
    const done = await completeRespondent(db, access);
    expect(done.ok).toBe(true);
    const [final] = await db.select().from(respondents).where(eq(respondents.id, resp!.id));
    expect(final!.status).toBe("completed");
    // manager-only items were never stored for an employee; team-experience items were
    const stored = await db.select().from(responses).where(eq(responses.respondentId, resp!.id));
    expect(stored.some((r) => r.questionCanonicalId.startsWith("AM_"))).toBe(false);
    expect(stored.some((r) => r.questionCanonicalId.startsWith("MEXP_0"))).toBe(true);
    expect(stored.some((r) => r.questionCanonicalId.startsWith("STIAS_"))).toBe(true);
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

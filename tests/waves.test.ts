import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { testDb, closeDb, seedWorld, ctxFor, type World } from "./helpers/db";
import { seedLibrary } from "@/server/seed/library";
import type { Db } from "@/server/db/connection";
import { createBaselineQuestionnaire, getQuestionnaireState, removeSection, addCustomQuestion } from "@/server/services/questionnaires";
import { closeWave, createRespondentTokens, createWave, getWaveComparability, getWaveMonitoring, listWaves, publishWave, updateWave } from "@/server/services/waves";
import { clients, projects, questionnaireVersions } from "@/server/db/schema";
import { ConflictError, ForbiddenError, ValidationError } from "@/server/shared/errors";

let db: Db;
let world: World;

beforeAll(async () => {
  db = await testDb();
  world = await seedWorld(db);
  await seedLibrary(db);
  await db.update(clients).set({ segmentTaxonomy: { departments: ["Tech", "Ops"], roleFamilies: ["Pro"], seniorityGroups: ["<2y", "2-5y"], locations: [] } }).where(eq(clients.id, world.clientA.id));
  await createBaselineQuestionnaire(ctxFor(db, world.pmA), world.clientA.projectId);
});
afterAll(async () => closeDb(db));

describe("waves", () => {
  it("only wave managers can create waves; the first wave is T0 baseline", async () => {
    await expect(createWave(ctxFor(db, world.analystA), world.clientA.projectId, { name: "x", type: "baseline", questionnaireSource: "draft", audienceScope: "all_organization", audienceUnits: [], distributionMode: "public_link", privacyMode: "anonymous", locale: "he", invitedCount: 100 })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(createWave(ctxFor(db, world.pmA), world.clientA.projectId, { name: "x", type: "follow_up", questionnaireSource: "draft", audienceScope: "all_organization", audienceUnits: [], distributionMode: "public_link", privacyMode: "anonymous", locale: "he", invitedCount: 100 })).rejects.toBeInstanceOf(ValidationError);
    const wave = await createWave(ctxFor(db, world.pmA), world.clientA.projectId, { name: "Baseline", type: "baseline", questionnaireSource: "draft", audienceScope: "all_organization", audienceUnits: [], distributionMode: "public_link", privacyMode: "anonymous", locale: "he", invitedCount: 120 });
    expect(wave.code).toBe("T0");
    expect(wave.status).toBe("draft");
    expect(wave.publicToken).toBeNull();
  });

  it("publishing freezes the questionnaire snapshot", async () => {
    const ctx = ctxFor(db, world.pmA);
    const [wave] = await listWaves(ctx, world.clientA.projectId);
    const published = await publishWave(ctx, wave!.id);
    expect(published.status).toBe("open");
    expect(published.publicToken).toBeTruthy();
    const [version] = await db.select().from(questionnaireVersions).where(eq(questionnaireVersions.id, wave!.questionnaireVersionId!));
    expect(version!.lockedAt).not.toBeNull();
    // the frozen definition cannot be edited any more
    const custom = version!.definition.sections.find((s) => s.key === "opportunities")!;
    await expect(addCustomQuestion(ctx, version!.id, custom.id, { type: "short_text", text: { he: "x" }, required: false })).rejects.toBeInstanceOf(ConflictError);
    await expect(removeSection(ctx, version!.id, custom.id)).rejects.toBeInstanceOf(ConflictError);
    // a second concurrent wave is refused
    await expect(createWave(ctx, world.clientA.projectId, { name: "T1", type: "follow_up", questionnaireSource: "duplicate", audienceScope: "all_organization", audienceUnits: [], distributionMode: "public_link", privacyMode: "anonymous", locale: "he", invitedCount: 0 })).rejects.toBeInstanceOf(ConflictError);
  });

  it("unique tokens require the matching distribution mode and are stored hashed", async () => {
    const ctx = ctxFor(db, world.pmA);
    const [wave] = await listWaves(ctx, world.clientA.projectId);
    await expect(createRespondentTokens(ctx, wave!.id, { count: 3 })).rejects.toBeInstanceOf(ValidationError);
  });

  it("closing a wave and creating a follow-up duplicates the questionnaire into a new version", async () => {
    const ctx = ctxFor(db, world.pmA);
    const [t0] = await listWaves(ctx, world.clientA.projectId);
    const closed = await closeWave(ctx, t0!.id);
    expect(closed.status).toBe("closed");
    await expect(updateWave(ctx, t0!.id, { name: "x", audienceScope: "all_organization", audienceUnits: [], distributionMode: "public_link", privacyMode: "anonymous", locale: "he", invitedCount: 1 })).rejects.toBeInstanceOf(ConflictError);

    const t1 = await createWave(ctx, world.clientA.projectId, { name: "Follow-up", type: "follow_up", questionnaireSource: "duplicate", audienceScope: "all_organization", audienceUnits: [], distributionMode: "unique_tokens", privacyMode: "pseudonymous", locale: "he", invitedCount: 0 });
    expect(t1.code).toBe("T1");
    expect(t1.baselineWaveId).toBe(t0!.id);
    expect(t1.questionnaireVersionId).not.toBe(t0!.questionnaireVersionId);
    const state = (await getQuestionnaireState(ctx, world.clientA.projectId))!;
    expect(state.draft!.id).toBe(t1.questionnaireVersionId);
    expect(state.draft!.versionLabel).toBe("1.1");
    expect(state.draft!.basedOnVersionId).toBe(t0!.questionnaireVersionId);

    // full comparability before edits
    const comp = await getWaveComparability(ctx, t1.id);
    expect(comp!.comparability.percent).toBe(100);

    // flexible mode lets the PM remove a core section; comparability reflects it
    await db.update(projects).set({ researchMode: "flexible" }).where(eq(projects.id, world.clientA.projectId));
    const verification = state.draft!.definition.sections.find((s) => s.key === "verification")!;
    await removeSection(ctx, state.draft!.id, verification.id);
    const after = await getWaveComparability(ctx, t1.id);
    expect(after!.comparability.percent).toBeLessThan(100);
    expect(after!.comparability.affectedMetricIds).toContain("verification");
    expect(after!.comparability.diff.removed.map((q) => q.canonicalId)).toContain("ver_01");

    // pseudonymous tokens with emails create identity mappings separate from respondents
    const tokens = await createRespondentTokens(ctx, t1.id, { emails: ["a@x.test", "b@x.test"] });
    expect(tokens).toHaveLength(2);
    expect(tokens[0]!.token).not.toBe(tokens[1]!.token);
    const monitoring = await getWaveMonitoring(ctx, t1.id);
    expect(monitoring.invited).toBe(2);
    expect(monitoring.completed).toBe(0);
  });

  it("client users cannot manage or monitor waves", async () => {
    const ctx = ctxFor(db, world.clientAdminA);
    const list = await listWaves(ctx, world.clientA.projectId);
    expect(list.length).toBe(2);
    await expect(getWaveMonitoring(ctx, list[0]!.id)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(publishWave(ctx, list[1]!.id)).rejects.toBeInstanceOf(ForbiddenError);
  });
});

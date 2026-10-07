import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { testDb, closeDb, seedWorld, ctxFor, type World } from "./helpers/db";
import { answerEverything } from "./helpers/survey";
import { seedLibrary } from "@/server/seed/library";
import type { Db } from "@/server/db/connection";
import { aggregateResults, clients, metricResults, responses, sessions, users, waves } from "@/server/db/schema";
import { addCustomQuestion, createBaselineQuestionnaire, getQuestionnaireState } from "@/server/services/questionnaires";
import { createWave, listWaves, publishWave, closeWave } from "@/server/services/waves";
import { resolveSurvey } from "@/server/services/survey";
import { getItemStats, getWaveResults } from "@/server/services/results";
import { loadResultsPage } from "@/server/ui/results";
import { createPasswordResetLink, getUserByResetToken, redeemPasswordReset } from "@/server/services/passwordResets";
import { createClient, getClient } from "@/server/services/clients";
import { createProject } from "@/server/services/projects";
import { buildPayloadForWave, generateInsight } from "@/server/services/insights";
import { loadActor, createSession } from "@/server/auth/session";
import { consumeRateLimit, RateLimitError } from "@/server/security/rateLimit";
import { env, insecureConfigReason } from "@/server/shared/env";
import { redactPii } from "@/domain/ai/payload";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/shared/errors";

let db: Db;
let world: World;
const DAY = 86_400_000;

async function publishedWave(projectId: string, input: { startAt?: Date; endAt?: Date } = {}) {
  const ctx = ctxFor(db, world.superAdmin);
  const wave = await createWave(ctx, projectId, { name: "T0", type: "baseline", questionnaireSource: "draft", audienceScope: "all_organization", audienceUnits: [], distributionMode: "public_link", privacyMode: "anonymous", locale: "he", invitedCount: 20, ...input });
  return publishWave(ctx, wave.id);
}

beforeAll(async () => {
  db = await testDb();
  world = await seedWorld(db);
  await seedLibrary(db);
  await db.update(clients).set({ segmentTaxonomy: { departments: ["Tech", "Ops"], roleFamilies: ["Pro"], seniorityGroups: ["<2y"], locations: [] }, privacyThreshold: 7 }).where(eq(clients.id, world.clientA.id));
  await createBaselineQuestionnaire(ctxFor(db, world.pmA), world.clientA.projectId);
}, 60_000);
afterAll(async () => closeDb(db));

describe("wave calendar", () => {
  it("opens a scheduled wave on its start date and closes it after its end date", async () => {
    const wave = await publishedWave(world.clientA.projectId, { startAt: new Date(Date.now() + 3 * DAY), endAt: new Date(Date.now() + 10 * DAY) });
    expect(wave.status).toBe("scheduled");
    expect(await resolveSurvey(db, wave.publicToken!)).toEqual({ closed: "not_open" });
    // the start date arrives
    await db.update(waves).set({ startAt: new Date(Date.now() - DAY) }).where(eq(waves.id, wave.id));
    const opened = await resolveSurvey(db, wave.publicToken!);
    expect("access" in opened && opened.access.wave.status).toBe("open");
    for (let i = 0; i < 8; i++) expect(await answerEverything(db, wave.publicToken!, { department: "Tech", isManager: i < 3, usage: "almost_daily", likert: 4, managerLikert: 5 })).toBe(true);
    // the end date passes: the next read closes the wave and computes results
    await db.update(waves).set({ endAt: new Date(Date.now() - 2 * DAY) }).where(eq(waves.id, wave.id));
    const [listed] = await listWaves(ctxFor(db, world.analystA), world.clientA.projectId);
    expect(listed!.status).toBe("closed");
    expect((await db.select().from(metricResults).where(eq(metricResults.waveId, wave.id))).length).toBeGreaterThan(0);
    expect(await resolveSurvey(db, wave.publicToken!)).toEqual({ closed: "not_open" });
  }, 120_000);
});

describe("client dashboards read cached results only", () => {
  it("serves gaps and item stats from the cache, even with raw answers gone", async () => {
    const [wave] = await listWaves(ctxFor(db, world.superAdmin), world.clientA.projectId);
    expect((await db.select().from(aggregateResults).where(eq(aggregateResults.waveId, wave!.id))).length).toBeGreaterThan(0);
    const before = await getWaveResults(ctxFor(db, world.clientAdminA), wave!.id);
    // Prove the client path never touches responses: remove them and read again.
    const saved = await db.select().from(responses).where(eq(responses.waveId, wave!.id));
    await db.delete(responses).where(eq(responses.waveId, wave!.id));
    const after = await getWaveResults(ctxFor(db, world.clientAdminA), wave!.id);
    expect(after.gaps).toEqual(before.gaps);
    expect(after.gaps).toHaveLength(5);
    // only 3 managers answered: the manager side stays hidden below the threshold of 7
    expect(after.gaps.find((g) => g.pairId === "gap_expectations")?.suppressed).toBe(true);
    expect((await getItemStats(ctxFor(db, world.clientAdminA), wave!.id, "enablement_access_resources")).length).toBe(2);
    await db.insert(responses).values(saved);
  });

  it("never shows clients a wave that is still collecting", async () => {
    const ctx = ctxFor(db, world.superAdmin);
    const followUp = await createWave(ctx, world.clientA.projectId, { name: "T1", type: "follow_up", questionnaireSource: "duplicate", audienceScope: "all_organization", audienceUnits: [], distributionMode: "public_link", privacyMode: "anonymous", locale: "he", invitedCount: 0 });
    await publishWave(ctx, followUp.id);
    await expect(getWaveResults(ctxFor(db, world.clientAdminA), followUp.id)).rejects.toBeInstanceOf(NotFoundError);
    const clientPage = await loadResultsPage(ctxFor(db, world.clientAdminA), world.clientA.projectId, undefined, { key: "all", value: "all" });
    expect(clientPage.selected?.status).toBe("closed");
    const nggPage = await loadResultsPage(ctxFor(db, world.superAdmin), world.clientA.projectId, undefined, { key: "all", value: "all" });
    expect(nggPage.selected?.id).toBe(followUp.id);
    await closeWave(ctx, followUp.id);
  }, 60_000);
});

describe("password reset links", () => {
  it("lets a project manager reset a client user's password once", async () => {
    const [clientUser] = await db.select().from(users).where(eq(users.email, "admin@a.test"));
    await createSession(db, clientUser!.id);
    await expect(createPasswordResetLink(ctxFor(db, world.analystA), clientUser!.id)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(createPasswordResetLink(ctxFor(db, world.clientAdminA), clientUser!.id)).rejects.toBeInstanceOf(ForbiddenError);
    const { url } = await createPasswordResetLink(ctxFor(db, world.pmA), clientUser!.id);
    const token = url.split("/reset/")[1]!;
    expect((await getUserByResetToken(db, token))?.id).toBe(clientUser!.id);
    await expect(redeemPasswordReset(db, token, { password: "short" })).rejects.toBeInstanceOf(ValidationError);
    await redeemPasswordReset(db, token, { password: "a-brand-new-password" });
    expect(await db.select().from(sessions).where(eq(sessions.userId, clientUser!.id))).toHaveLength(0);
    await expect(redeemPasswordReset(db, token, { password: "another-new-password" })).rejects.toBeInstanceOf(NotFoundError);
  });

  it("keeps NGG accounts for super admins, and only the newest link works", async () => {
    const [pm] = await db.select().from(users).where(eq(users.email, "pm@ngg.test"));
    await expect(createPasswordResetLink(ctxFor(db, world.pmA), pm!.id)).rejects.toBeInstanceOf(ForbiddenError);
    const first = await createPasswordResetLink(ctxFor(db, world.superAdmin), pm!.id);
    const second = await createPasswordResetLink(ctxFor(db, world.superAdmin), pm!.id);
    expect(await getUserByResetToken(db, first.url.split("/reset/")[1]!)).toBeNull();
    expect((await getUserByResetToken(db, second.url.split("/reset/")[1]!))?.id).toBe(pm!.id);
  });
});

describe("project managers keep access to clients they create", () => {
  it("can open the new client and add its first project", async () => {
    const created = await createClient(ctxFor(db, world.pmA), { name: "New Co", slug: "", industry: "", locale: "he", surveyContact: "", primaryColor: "", logoText: "" });
    const [pm] = await db.select().from(users).where(eq(users.email, "pm@ngg.test"));
    const fresh = ctxFor(db, await loadActor(db, pm!));
    expect((await getClient(fresh, created.id)).id).toBe(created.id);
    const project = await createProject(fresh, created.id, { name: "Pilot", managerUserId: "", researchMode: "research_safe" });
    expect(project.clientId).toBe(created.id);
    // another PM still cannot see it
    await expect(getClient(ctxFor(db, world.analystA), created.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("rate limiting", () => {
  it("blocks after the limit and resets with the window", async () => {
    const rule = { bucket: "test", limit: 3, windowMs: 60_000 };
    const t0 = new Date("2026-10-07T10:00:00Z");
    for (let i = 0; i < 3; i++) await consumeRateLimit(db, rule, "1.2.3.4", t0);
    await expect(consumeRateLimit(db, rule, "1.2.3.4", t0)).rejects.toBeInstanceOf(RateLimitError);
    await consumeRateLimit(db, rule, "5.6.7.8", t0); // other subjects are independent
    await consumeRateLimit(db, rule, "1.2.3.4", new Date(t0.getTime() + 61_000));
  });
});

describe("production secret", () => {
  it("refuses a missing or weak SESSION_SECRET in production", () => {
    const vars = process.env as Record<string, string | undefined>;
    const saved = { NODE_ENV: vars.NODE_ENV, SESSION_SECRET: vars.SESSION_SECRET };
    try {
      vars.NODE_ENV = "production";
      delete vars.SESSION_SECRET;
      expect(insecureConfigReason()).toMatch(/not set/);
      expect(() => env.sessionSecret).toThrow(/Insecure configuration/);
      vars.SESSION_SECRET = "change-me-to-a-long-random-string-please";
      expect(insecureConfigReason()).not.toBeNull();
      vars.SESSION_SECRET = "k".repeat(48);
      expect(insecureConfigReason()).toBeNull();
    } finally {
      vars.NODE_ENV = saved.NODE_ENV;
      if (saved.SESSION_SECRET === undefined) delete vars.SESSION_SECRET;
      else vars.SESSION_SECRET = saved.SESSION_SECRET;
    }
  });
});

describe("open text for AI", () => {
  it("redacts titled and known names", () => {
    const text = "שוחחתי עם מר ישראל ישראלי ועם Dr. Jane Smith, וגם רונית אבן עזרה. Copilot עזר.";
    const out = redactPii(text, ["רונית אבן"]);
    expect(out).not.toMatch(/ישראלי|Jane|Smith|רונית/);
    expect(out).toContain("Copilot");
  });

  it("sends no open text below the minimum and never names the client", async () => {
    const [wave] = await listWaves(ctxFor(db, world.superAdmin), world.clientA.projectId);
    await db.update(clients).set({ privacyThreshold: 50 }).where(eq(clients.id, world.clientA.id));
    try {
      const payload = await buildPayloadForWave(ctxFor(db, world.pmA), wave!.id, { includeOpenText: true });
      expect(payload.openTextSamples).toEqual([]);
      expect(JSON.stringify(payload)).not.toContain("Client A");
      const insight = await generateInsight(ctxFor(db, world.pmA), wave!.id, "open_text_themes");
      expect((insight.payload as { insufficientEvidence: boolean }).insufficientEvidence).toBe(true);
    } finally {
      await db.update(clients).set({ privacyThreshold: 7 }).where(eq(clients.id, world.clientA.id));
    }
  });
});

describe("custom questions", () => {
  it("cannot add a matrix without rows and columns", async () => {
    const ctx = ctxFor(db, world.pmA);
    const state = (await getQuestionnaireState(ctx, world.clientA.projectId))!;
    const { createNextVersion } = await import("@/server/services/questionnaires");
    const draft = state.draft ?? (await createNextVersion(ctx, state.latestLocked!.id));
    const section = draft.definition.sections[0]!;
    await expect(addCustomQuestion(ctx, draft.id, section.id, { type: "matrix" as never, text: { he: "מטריצה" }, required: true })).rejects.toBeInstanceOf(ValidationError);
  });
});

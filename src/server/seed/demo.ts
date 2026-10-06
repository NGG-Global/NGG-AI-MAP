import { eq, sql } from "drizzle-orm";
import type { Db } from "@/server/db/connection";
import { clients, projectAssignments, projects, users, workspaces, waves } from "@/server/db/schema";
import { hashPassword } from "@/server/auth/password";
import { newId } from "@/lib/ids";
import { seedLibrary } from "./library";
import { seedWaveResponses, type WaveProfile } from "./responses";
import { loadActor } from "@/server/auth/session";
import type { ServiceContext } from "@/server/services/context";
import { createBaselineQuestionnaire } from "@/server/services/questionnaires";
import { createWave, publishWave, closeWave } from "@/server/services/waves";
import { generateInsight, reviewInsight } from "@/server/services/insights";
import { createGoal, approveGoal, setGoalStatus, publishGoalToClient, adoptGoalSuggestions } from "@/server/services/goals";
import { computeWaveResults } from "@/server/services/results";

export interface SeedOptions {
  password: string;
}

export interface SeedSummary {
  workspaceId: string;
  users: Array<{ email: string; role: string }>;
  clients: string[];
  respondents: number;
}

export const DEMO_WORKSPACE_ID = "ws_ngg_demo";

/** Removes everything (demo database only) so the seed is idempotent. */
async function wipe(db: Db): Promise<void> {
  const tables = ["audit_logs", "goals", "insights", "metric_results", "distribution_results", "identity_map", "responses", "respondents", "waves", "questionnaire_versions", "questionnaires", "metric_definitions", "question_templates", "section_templates", "invitations", "client_user_project_access", "project_assignments", "projects", "sessions", "users", "clients", "workspaces"];
  for (const table of tables) await db.execute(sql.raw(`DELETE FROM "${table}"`));
}

const DEPTS_GAMMA = [
  { name: "טכנולוגיה", weight: 3, shift: 0.35 },
  { name: "כספים", weight: 1.5, shift: 0.1 },
  { name: "תפעול", weight: 5, shift: -0.25 },
  { name: "משאבי אנוש", weight: 0.4, shift: 0 },
  { name: "מכירות", weight: 2, shift: 0.05 },
];

const GAMMA_T0: WaveProfile = {
  base: 3.0,
  byPrefix: { usage_: 3.0, ai_lit_: 2.9, agw_: 2.4, ver_: 3.8, en_access: 2.8, en_policy: 2.5, en_know: 2.6, en_cult: 3.2, en_strat: 2.6, am_self: 3.1, am_humans: 3.0, am_ai: 3.2, am_sys: 2.5, imp_: 3.1, trust_: 3.2 },
  managerSelf: 4.0,
  teamExperience: 3.3,
  usageWeights: { none: 2.2, once_twice: 2.5, weekly: 2.5, several_weekly: 1.8, daily: 1.0 },
  patternWeights: { assist: 0.78, collaborate: 0.45, delegate: 0.16, orchestrate: 0.05 },
  barrierWeights: { no_access: 0.35, no_time: 0.45, unclear_policy: 0.5, data_concerns: 0.3, quality: 0.2, skills: 0.35, no_need: 0.1, manager: 0.08, job_fear: 0.12 },
  managerShare: 0.17,
  departments: DEPTS_GAMMA,
};

const GAMMA_T1: WaveProfile = {
  base: 3.3,
  byPrefix: { usage_: 3.6, ai_lit_: 3.4, agw_: 2.8, ver_: 3.9, en_access: 3.4, en_policy: 2.6, en_know: 3.1, en_cult: 3.4, en_strat: 2.9, am_self: 3.5, am_humans: 3.3, am_ai: 3.6, am_sys: 3.4, imp_: 3.5, trust_: 3.4 },
  managerSelf: 4.4,
  teamExperience: 3.5,
  usageWeights: { none: 0.8, once_twice: 1.5, weekly: 2.5, several_weekly: 2.7, daily: 2.5 },
  patternWeights: { assist: 0.84, collaborate: 0.61, delegate: 0.29, orchestrate: 0.11 },
  barrierWeights: { no_access: 0.18, no_time: 0.42, unclear_policy: 0.48, data_concerns: 0.28, quality: 0.22, skills: 0.25, no_need: 0.08, manager: 0.06, job_fear: 0.1 },
  managerShare: 0.16,
  departments: DEPTS_GAMMA,
};

const ALPHA_T0: WaveProfile = {
  base: 2.9,
  byPrefix: { usage_: 2.8, ai_lit_: 2.7, agw_: 2.2, ver_: 3.5, en_access: 2.4, en_policy: 2.9, en_know: 2.4, en_cult: 2.9, en_strat: 2.8, am_self: 3.0, am_humans: 3.0, am_ai: 2.9, am_sys: 2.3, imp_: 2.9, trust_: 3.0 },
  managerSelf: 3.9,
  teamExperience: 3.2,
  usageWeights: { none: 2.5, once_twice: 2.5, weekly: 2.5, several_weekly: 1.5, daily: 1.0 },
  patternWeights: { assist: 0.7, collaborate: 0.4, delegate: 0.12, orchestrate: 0.03 },
  barrierWeights: { no_access: 0.5, no_time: 0.4, unclear_policy: 0.35, data_concerns: 0.45, quality: 0.2, skills: 0.3, no_need: 0.12, manager: 0.1, job_fear: 0.15 },
  managerShare: 0.15,
  departments: [
    { name: "טכנולוגיה", weight: 2, shift: 0.3 },
    { name: "כספים", weight: 2, shift: 0 },
    { name: "תפעול", weight: 3, shift: -0.2 },
    { name: "שירות לקוחות", weight: 3, shift: -0.1 },
    { name: "משאבי אנוש", weight: 0.5, shift: 0.1 },
    { name: "שיווק", weight: 1, shift: 0.15 },
  ],
};

export async function seedDemo(db: Db, options: SeedOptions): Promise<SeedSummary> {
  await wipe(db);
  const passwordHash = await hashPassword(options.password);
  const workspaceId = DEMO_WORKSPACE_ID;
  await db.insert(workspaces).values({ id: workspaceId, name: "NGG" });
  await seedLibrary(db);

  const nggUsers = [
    { id: newId(), email: "admin@ngg.demo", name: "דור ורדי", nggRole: "super_admin" as const },
    { id: newId(), email: "noa@ngg.demo", name: "נועה לוי", nggRole: "project_manager" as const },
    { id: newId(), email: "yoav@ngg.demo", name: "יואב כהן", nggRole: "project_manager" as const },
    { id: newId(), email: "michal@ngg.demo", name: "מיכל ברק", nggRole: "project_manager" as const },
    { id: newId(), email: "analyst@ngg.demo", name: "תמר שחר", nggRole: "analyst" as const },
  ];
  await db.insert(users).values(nggUsers.map((u) => ({ ...u, workspaceId, kind: "ngg" as const, passwordHash, locale: "he" as const })));
  const byEmail = Object.fromEntries(nggUsers.map((u) => [u.email, u.id]));

  const clientRows = [
    { id: newId(), slug: "alpha-finance", name: "אלפא פיננסים", industry: "פיננסים", organizationSize: 1800, branding: { logoText: "א", primaryColor: "#1d4ea3" }, manager: byEmail["noa@ngg.demo"]!, projectName: "AI Adoption 2026", departments: ALPHA_T0.departments.map((d) => d.name), createdAt: new Date("2026-08-10") },
    { id: newId(), slug: "beta-health", name: "בטא בריאות", industry: "בריאות", organizationSize: 3200, branding: { logoText: "ב", primaryColor: "#167349" }, manager: byEmail["yoav@ngg.demo"]!, projectName: "מנהלים בעידן ה-AI", departments: ["רפואה", "סיעוד", "מינהל", "מערכות מידע", "לוגיסטיקה"], createdAt: new Date("2026-09-20") },
    { id: newId(), slug: "gamma-industries", name: "גמא תעשיות", industry: "תעשייה", organizationSize: 2400, branding: { logoText: "ג", primaryColor: "#8a1450" }, manager: byEmail["michal@ngg.demo"]!, projectName: "AI Adoption 2026", departments: DEPTS_GAMMA.map((d) => d.name), createdAt: new Date("2026-01-05") },
  ];
  const projectIds: Record<string, string> = {};
  for (const c of clientRows) {
    await db.insert(clients).values({
      id: c.id,
      workspaceId,
      slug: c.slug,
      name: c.name,
      industry: c.industry,
      organizationSize: c.organizationSize,
      branding: c.branding,
      segmentTaxonomy: { departments: c.departments, roleFamilies: ["מקצועי", "ניהולי", "תפעולי", "מטה"], seniorityGroups: ["עד שנתיים", "2–5 שנים", "5–10 שנים", "מעל 10 שנים"], locations: [] },
      surveyContact: "hr@example.org",
      createdAt: c.createdAt,
      updatedAt: c.createdAt,
    });
    const projectId = newId();
    await db.insert(projects).values({ id: projectId, clientId: c.id, name: c.projectName, managerUserId: c.manager, status: "setup", createdAt: c.createdAt, updatedAt: c.createdAt });
    await db.insert(projectAssignments).values([
      { projectId, userId: c.manager },
      { projectId, userId: byEmail["analyst@ngg.demo"]! },
    ]);
    projectIds[c.slug] = projectId;
  }

  await db.insert(users).values([
    { id: newId(), workspaceId, email: "ceo@gamma.demo", name: "רונית אבן", kind: "client", clientRole: "admin", clientId: clientRows[2]!.id, passwordHash, locale: "he" },
    { id: newId(), workspaceId, email: "hr@gamma.demo", name: "אייל נחום", kind: "client", clientRole: "viewer", clientId: clientRows[2]!.id, passwordHash, locale: "he" },
    { id: newId(), workspaceId, email: "hr@alpha.demo", name: "Daniel Oren", kind: "client", clientRole: "viewer", clientId: clientRows[0]!.id, passwordHash, locale: "en" },
  ]);

  const [adminUser] = await db.select().from(users).where(eq(users.email, "admin@ngg.demo"));
  const ctx: ServiceContext = { db, actor: await loadActor(db, adminUser!) };
  let respondentTotal = 0;

  /* ---- Gamma: T0 closed (Jan 2026), T1 closed (Sep 2026), insights published, goals active */
  {
    const projectId = projectIds["gamma-industries"]!;
    await createBaselineQuestionnaire(ctx, projectId, "AI Adoption 2026 — Baseline");
    const t0 = await createWave(ctx, projectId, { name: "Baseline", type: "baseline", questionnaireSource: "draft", audienceScope: "all_organization", audienceUnits: [], distributionMode: "public_link", privacyMode: "anonymous", locale: "he", invitedCount: 508 });
    await publishWave(ctx, t0.id);
    await db.update(waves).set({ startAt: new Date("2026-01-12"), endAt: new Date("2026-02-06"), publishedAt: new Date("2026-01-12") }).where(eq(waves.id, t0.id));
    respondentTotal += await seedWaveResponses(db, (await db.select().from(waves).where(eq(waves.id, t0.id)))[0]!, 371, GAMMA_T0, 11, { start: new Date("2026-01-12"), end: new Date("2026-02-05") });
    await closeWave(ctx, t0.id);
    await db.update(waves).set({ closedAt: new Date("2026-02-06") }).where(eq(waves.id, t0.id));

    const t1 = await createWave(ctx, projectId, { name: "מעקב", type: "follow_up", questionnaireSource: "duplicate", audienceScope: "all_organization", audienceUnits: [], distributionMode: "public_link", privacyMode: "anonymous", locale: "he", invitedCount: 508 });
    await publishWave(ctx, t1.id);
    await db.update(waves).set({ startAt: new Date("2026-08-24"), endAt: new Date("2026-09-14"), publishedAt: new Date("2026-08-24") }).where(eq(waves.id, t1.id));
    respondentTotal += await seedWaveResponses(db, (await db.select().from(waves).where(eq(waves.id, t1.id)))[0]!, 412, GAMMA_T1, 23, { start: new Date("2026-08-24"), end: new Date("2026-09-13") });
    await closeWave(ctx, t1.id);
    await db.update(waves).set({ closedAt: new Date("2026-09-14") }).where(eq(waves.id, t1.id));
    await db.update(projects).set({ status: "follow_up", nextFollowUpAt: new Date("2027-03-15") }).where(eq(projects.id, projectId));

    const summaryT0 = await generateInsight(ctx, t0.id, "executive_summary");
    await reviewInsight(ctx, summaryT0.id, "published");
    const summaryT1 = await generateInsight(ctx, t1.id, "executive_summary");
    await reviewInsight(ctx, summaryT1.id, "published");
    await generateInsight(ctx, t1.id, "explain_change", { metricId: "ai_literacy" }); // left as draft → review queue
    const suggestions = await generateInsight(ctx, t1.id, "goal_suggestions");
    await reviewInsight(ctx, suggestions.id, "reviewed");
    const themes = await generateInsight(ctx, t1.id, "open_text_themes");
    await reviewInsight(ctx, themes.id, "published");

    const goal1 = await createGoal(ctx, projectId, {
      title: "עיצוב זרימת עבודה אחת בכל צוות עם חלוקת סמכויות אדם–AI",
      description: "כל מנהל/ת בוחר/ת זרימת עבודה חוזרת אחת, מגדיר/ה אילו שלבים מואצלים ל-AI ואיפה נקודת הבקרה האנושית.",
      ownerName: "סמנכ״לית תפעול",
      scope: "management",
      relatedMetricIds: ["agentic_manage_systems", "pattern_delegate", "verification"],
      targetDirection: "increase",
      actions: ["מיפוי זרימות עבודה חוזרות בכל צוות", "הגדרת זכויות החלטה ונקודת בקרה אנושית", "פיילוט בשלושה צוותים", "מדידה חוזרת ב-T2"],
      successEvidence: ["זרימת העבודה מתועדת", "זכויות החלטה מוגדרות", "נקודת בקרה אנושית מוגדרת", "שינוי במדד ב-T2"],
      dueDate: new Date("2027-02-28"),
    });
    await approveGoal(ctx, goal1.id, "approved");
    await setGoalStatus(ctx, goal1.id, "in_progress");
    await publishGoalToClient(ctx, goal1.id, true);
    const goal2 = await createGoal(ctx, projectId, {
      title: "הבהרת ציפיות לשימוש ב-AI בכל צוות",
      description: "צמצום פער התפיסה בין מנהלים לצוותים בבהירות הציפיות.",
      ownerName: "סמנכ״ל משאבי אנוש",
      scope: "organization",
      relatedMetricIds: ["gap_ai_clarity", "enablement_policy_governance"],
      targetDirection: "increase",
      actions: ["שיחת ציפיות בכל צוות", "הנחיה כתובה של עמוד אחד", "סקר דופק אחרי חודש"],
      successEvidence: ["הנחיה כתובה קיימת", "הפער יורד מתחת ל-0.3"],
      dueDate: new Date("2026-12-31"),
    });
    await approveGoal(ctx, goal2.id, "approved");
    await publishGoalToClient(ctx, goal2.id, true);
    const goal3 = await createGoal(ctx, projectId, {
      title: "תוכנית למידה מדורגת לאוריינות AI ביחידות התפעול",
      ownerName: "מנהלת למידה ופיתוח",
      scope: "unit",
      relatedMetricIds: ["ai_literacy", "enablement_knowledge_learning"],
      targetDirection: "increase",
      actions: ["סדנת יסודות לכל עובדי התפעול", "קהילת תרגול חודשית"],
      successEvidence: ["80% השתתפות", "אוריינות AI בתפעול עולה ב-T2"],
      dueDate: new Date("2027-03-01"),
    });
    await approveGoal(ctx, goal3.id, "approved");
    await setGoalStatus(ctx, goal3.id, "in_progress");
    await publishGoalToClient(ctx, goal3.id, true);
    await adoptGoalSuggestions(ctx, suggestions.id, [0]);
  }

  /* ---- Alpha: T0 open and collecting (low response rate → attention panel) */
  {
    const projectId = projectIds["alpha-finance"]!;
    await createBaselineQuestionnaire(ctx, projectId, "AI Adoption 2026 — Baseline");
    const t0 = await createWave(ctx, projectId, { name: "Baseline", type: "baseline", questionnaireSource: "draft", audienceScope: "all_organization", audienceUnits: [], distributionMode: "public_link", privacyMode: "anonymous", locale: "he", invitedCount: 420 });
    await publishWave(ctx, t0.id);
    const start = new Date();
    start.setDate(start.getDate() - 9);
    const end = new Date();
    end.setDate(end.getDate() + 4);
    await db.update(waves).set({ startAt: start, endAt: end, publishedAt: start }).where(eq(waves.id, t0.id));
    respondentTotal += await seedWaveResponses(db, (await db.select().from(waves).where(eq(waves.id, t0.id)))[0]!, 155, ALPHA_T0, 7, { start, end: new Date() });
    await computeWaveResults(ctx, t0.id);
    await db.update(projects).set({ status: "collecting" }).where(eq(projects.id, projectId));
  }

  /* ---- Beta: questionnaire in draft, no wave yet */
  {
    const projectId = projectIds["beta-health"]!;
    await createBaselineQuestionnaire(ctx, projectId, "מנהלים בעידן ה-AI — Baseline");
  }

  // Clean the audit trail of seed noise but keep a few meaningful entries.
  await db.execute(sql`DELETE FROM audit_logs WHERE action LIKE 'questionnaire.%'`);

  return {
    workspaceId,
    users: [...nggUsers.map((u) => ({ email: u.email, role: u.nggRole })), { email: "ceo@gamma.demo", role: "client_admin" }, { email: "hr@gamma.demo", role: "client_viewer" }, { email: "hr@alpha.demo", role: "client_viewer" }],
    clients: clientRows.map((c) => c.name),
    respondents: respondentTotal,
  };
}

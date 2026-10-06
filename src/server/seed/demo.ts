import { sql } from "drizzle-orm";
import type { Db } from "@/server/db/connection";
import { clients, projectAssignments, projects, users, workspaces } from "@/server/db/schema";
import { hashPassword } from "@/server/auth/password";
import { newId } from "@/lib/ids";

export interface SeedOptions {
  password: string;
}

export interface SeedSummary {
  workspaceId: string;
  users: Array<{ email: string; role: string }>;
  clients: string[];
}

export const DEMO_WORKSPACE_ID = "ws_ngg_demo";

/** Removes everything (demo database only) so the seed is idempotent. */
async function wipe(db: Db): Promise<void> {
  const tables = [
    "audit_logs",
    "goals",
    "insights",
    "metric_results",
    "identity_map",
    "responses",
    "respondents",
    "waves",
    "questionnaire_versions",
    "questionnaires",
    "metric_definitions",
    "question_templates",
    "section_templates",
    "invitations",
    "client_user_project_access",
    "project_assignments",
    "projects",
    "sessions",
    "users",
    "clients",
    "workspaces",
  ];
  for (const table of tables) {
    await db.execute(sql.raw(`DELETE FROM "${table}"`));
  }
}

export async function seedDemo(db: Db, options: SeedOptions): Promise<SeedSummary> {
  await wipe(db);
  const passwordHash = await hashPassword(options.password);
  const workspaceId = DEMO_WORKSPACE_ID;
  await db.insert(workspaces).values({ id: workspaceId, name: "NGG" });

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
    {
      id: newId(),
      slug: "alpha-finance",
      name: "אלפא פיננסים",
      industry: "פיננסים",
      organizationSize: 1800,
      branding: { logoText: "א", primaryColor: "#1d4ea3" },
      manager: byEmail["noa@ngg.demo"]!,
      projectName: "AI Adoption 2026",
      departments: ["טכנולוגיה", "כספים", "תפעול", "שירות לקוחות", "משאבי אנוש", "שיווק"],
    },
    {
      id: newId(),
      slug: "beta-health",
      name: "בטא בריאות",
      industry: "בריאות",
      organizationSize: 3200,
      branding: { logoText: "ב", primaryColor: "#167349" },
      manager: byEmail["yoav@ngg.demo"]!,
      projectName: "מנהלים בעידן ה-AI",
      departments: ["רפואה", "סיעוד", "מינהל", "מערכות מידע", "לוגיסטיקה"],
    },
    {
      id: newId(),
      slug: "gamma-industries",
      name: "גמא תעשיות",
      industry: "תעשייה",
      organizationSize: 2400,
      branding: { logoText: "ג", primaryColor: "#8a1450" },
      manager: byEmail["michal@ngg.demo"]!,
      projectName: "AI Adoption 2026",
      departments: ["טכנולוגיה", "כספים", "תפעול", "משאבי אנוש", "מכירות"],
    },
  ];

  const clientIds: string[] = [];
  for (const c of clientRows) {
    await db.insert(clients).values({
      id: c.id,
      workspaceId,
      slug: c.slug,
      name: c.name,
      industry: c.industry,
      organizationSize: c.organizationSize,
      branding: c.branding,
      segmentTaxonomy: {
        departments: c.departments,
        roleFamilies: ["מקצועי", "ניהולי", "תפעולי", "מטה"],
        seniorityGroups: ["עד שנתיים", "2–5 שנים", "5–10 שנים", "מעל 10 שנים"],
        locations: [],
      },
      surveyContact: "hr@example.org",
    });
    const projectId = newId();
    await db.insert(projects).values({ id: projectId, clientId: c.id, name: c.projectName, managerUserId: c.manager, status: "setup" });
    await db.insert(projectAssignments).values([
      { projectId, userId: c.manager },
      { projectId, userId: byEmail["analyst@ngg.demo"]! },
    ]);
    clientIds.push(c.id);
  }

  // One client user per client (admin for Gamma, viewer for Alpha).
  await db.insert(users).values([
    { id: newId(), workspaceId, email: "ceo@gamma.demo", name: "רונית אבן", kind: "client", clientRole: "admin", clientId: clientRows[2]!.id, passwordHash, locale: "he" },
    { id: newId(), workspaceId, email: "hr@alpha.demo", name: "Daniel Oren", kind: "client", clientRole: "viewer", clientId: clientRows[0]!.id, passwordHash, locale: "en" },
  ]);

  return {
    workspaceId,
    users: [
      ...nggUsers.map((u) => ({ email: u.email, role: u.nggRole })),
      { email: "ceo@gamma.demo", role: "client_admin" },
      { email: "hr@alpha.demo", role: "client_viewer" },
    ],
    clients: clientRows.map((c) => c.name),
  };
}

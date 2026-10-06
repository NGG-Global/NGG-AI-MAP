import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { projectAssignments, projects, users, type Project } from "@/server/db/schema";
import { newId } from "@/lib/ids";
import { ValidationError } from "@/server/shared/errors";
import { PROJECT_STATUSES, RESEARCH_MODES } from "@/domain/shared/enums";
import type { ServiceContext } from "./context";
import { listVisibleProjects, requireClient, requireProject } from "./access";
import { recordAudit } from "./audit";

export const projectInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  managerUserId: z.string().trim().min(1).optional().or(z.literal("")),
  researchMode: z.enum(RESEARCH_MODES).default("research_safe"),
});
export type ProjectInput = z.infer<typeof projectInputSchema>;

export async function listProjectsForClient(ctx: ServiceContext, clientId: string): Promise<Project[]> {
  await requireClient(ctx, clientId, "client.view");
  return listVisibleProjects(ctx, clientId);
}

export async function getProject(ctx: ServiceContext, projectId: string) {
  return requireProject(ctx, projectId, "project.view");
}

export async function createProject(ctx: ServiceContext, clientId: string, input: ProjectInput): Promise<Project> {
  await requireClient(ctx, clientId, "project.create");
  const parsed = projectInputSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("project", parsed.error.issues.map((i) => i.path.join(".")));
  const managerUserId = parsed.data.managerUserId || (ctx.actor.kind === "ngg" ? ctx.actor.userId : null);
  const id = newId();
  const [created] = await ctx.db
    .insert(projects)
    .values({
      id,
      clientId,
      name: parsed.data.name,
      managerUserId,
      researchMode: parsed.data.researchMode,
    })
    .returning();
  // The creator and the manager are assigned automatically so they can see the project.
  const assignees = new Set<string>();
  if (ctx.actor.kind === "ngg") assignees.add(ctx.actor.userId);
  if (managerUserId) assignees.add(managerUserId);
  if (assignees.size) {
    await ctx.db
      .insert(projectAssignments)
      .values([...assignees].map((userId) => ({ projectId: id, userId })))
      .onConflictDoNothing();
  }
  await recordAudit(ctx, { action: "project.created", entityType: "project", entityId: id, clientId, projectId: id });
  return created!;
}

export const projectUpdateSchema = projectInputSchema.extend({
  status: z.enum(PROJECT_STATUSES),
});

export async function updateProject(ctx: ServiceContext, projectId: string, input: z.infer<typeof projectUpdateSchema>) {
  const { project } = await requireProject(ctx, projectId, "project.update");
  const parsed = projectUpdateSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("project", parsed.error.issues.map((i) => i.path.join(".")));
  const managerUserId = parsed.data.managerUserId || null;
  const [updated] = await ctx.db
    .update(projects)
    .set({
      name: parsed.data.name,
      managerUserId,
      researchMode: parsed.data.researchMode,
      status: parsed.data.status,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))
    .returning();
  if (managerUserId) {
    await ctx.db.insert(projectAssignments).values({ projectId, userId: managerUserId }).onConflictDoNothing();
  }
  await recordAudit(ctx, {
    action: "project.updated",
    entityType: "project",
    entityId: projectId,
    clientId: project.clientId,
    projectId,
    metadata: { researchMode: parsed.data.researchMode, status: parsed.data.status },
  });
  return updated!;
}

/** NGG staff assigned to a project, with their names. */
export async function listProjectTeam(ctx: ServiceContext, projectId: string) {
  await requireProject(ctx, projectId, "project.view");
  return ctx.db
    .select({ userId: users.id, name: users.name, email: users.email, nggRole: users.nggRole })
    .from(projectAssignments)
    .innerJoin(users, eq(users.id, projectAssignments.userId))
    .where(eq(projectAssignments.projectId, projectId));
}

export async function assignNggUser(ctx: ServiceContext, projectId: string, userId: string): Promise<void> {
  const { project } = await requireProject(ctx, projectId, "project.update");
  const [user] = await ctx.db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.kind, "ngg"), eq(users.workspaceId, ctx.actor.workspaceId)))
    .limit(1);
  if (!user) throw new ValidationError("user");
  await ctx.db.insert(projectAssignments).values({ projectId, userId }).onConflictDoNothing();
  await recordAudit(ctx, {
    action: "project.user_assigned",
    entityType: "project",
    entityId: projectId,
    clientId: project.clientId,
    projectId,
    metadata: { userId },
  });
}

export async function unassignNggUser(ctx: ServiceContext, projectId: string, userId: string): Promise<void> {
  const { project } = await requireProject(ctx, projectId, "project.update");
  await ctx.db
    .delete(projectAssignments)
    .where(and(eq(projectAssignments.projectId, projectId), eq(projectAssignments.userId, userId)));
  await recordAudit(ctx, {
    action: "project.user_unassigned",
    entityType: "project",
    entityId: projectId,
    clientId: project.clientId,
    projectId,
    metadata: { userId },
  });
}

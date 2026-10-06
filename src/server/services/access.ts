import { and, eq, inArray } from "drizzle-orm";
import { canClient, canProject, canWorkspace, type Action } from "@/domain/authz/policy";
import { clients, projects, type Client, type Project } from "@/server/db/schema";
import { ForbiddenError, NotFoundError } from "@/server/shared/errors";
import type { ServiceContext } from "./context";

/**
 * Authorization enforcement for services. Every function either returns the scoped entity or throws.
 * Resources outside the actor's tenant are reported as "not found" to avoid leaking their existence.
 */

export function assertWorkspace(ctx: ServiceContext, action: Action): void {
  if (!canWorkspace(ctx.actor, action)) throw new ForbiddenError(action);
}

export async function requireClient(ctx: ServiceContext, clientId: string, action: Action): Promise<Client> {
  const [client] = await ctx.db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.workspaceId, ctx.actor.workspaceId)))
    .limit(1);
  if (!client) throw new NotFoundError("client");
  if (!canClient(ctx.actor, action, { clientId })) {
    // Hide existence from other tenants; show a real 403 inside the tenant.
    if (ctx.actor.kind === "client" && ctx.actor.clientId !== clientId) throw new NotFoundError("client");
    if (ctx.actor.kind === "ngg" && ctx.actor.role !== "super_admin" && !ctx.actor.assignedClientIds.has(clientId)) {
      throw new NotFoundError("client");
    }
    throw new ForbiddenError(action);
  }
  return client;
}

export async function requireProject(
  ctx: ServiceContext,
  projectId: string,
  action: Action,
): Promise<{ project: Project; client: Client }> {
  const rows = await ctx.db
    .select({ project: projects, client: clients })
    .from(projects)
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .where(and(eq(projects.id, projectId), eq(clients.workspaceId, ctx.actor.workspaceId)))
    .limit(1);
  const row = rows[0];
  if (!row) throw new NotFoundError("project");
  if (!canProject(ctx.actor, action, { clientId: row.client.id, projectId })) {
    if (ctx.actor.kind === "client" && ctx.actor.clientId !== row.client.id) throw new NotFoundError("project");
    if (ctx.actor.kind === "ngg" && ctx.actor.role !== "super_admin" && !ctx.actor.assignedProjectIds.has(projectId)) {
      throw new NotFoundError("project");
    }
    throw new ForbiddenError(action);
  }
  return row;
}

/** Ids of the clients an actor may see at all. `null` means "no restriction" (super admin). */
export function visibleClientIds(ctx: ServiceContext): string[] | null {
  const { actor } = ctx;
  if (actor.kind === "client") return [actor.clientId];
  if (actor.role === "super_admin") return null;
  return [...actor.assignedClientIds];
}

/** Ids of projects an actor may see. `null` means no restriction (super admin). */
export function visibleProjectIds(ctx: ServiceContext): string[] | null {
  const { actor } = ctx;
  if (actor.kind === "client") return actor.restrictedProjectIds.size > 0 ? [...actor.restrictedProjectIds] : null;
  if (actor.role === "super_admin") return null;
  return [...actor.assignedProjectIds];
}

/** Projects visible to the actor, optionally within one client. */
export async function listVisibleProjects(ctx: ServiceContext, clientId?: string): Promise<Project[]> {
  const ids = visibleProjectIds(ctx);
  const clientIds = visibleClientIds(ctx);
  const conditions = [];
  if (clientId) conditions.push(eq(projects.clientId, clientId));
  if (ids) {
    if (ids.length === 0) return [];
    conditions.push(inArray(projects.id, ids));
  }
  if (clientIds) {
    if (clientIds.length === 0) return [];
    conditions.push(inArray(projects.clientId, clientIds));
  }
  return ctx.db
    .select()
    .from(projects)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(projects.createdAt);
}

import { desc, eq } from "drizzle-orm";
import { auditLogs } from "@/server/db/schema";
import { newId } from "@/lib/ids";
import type { ServiceContext } from "./context";
import { assertWorkspace } from "./access";

export interface AuditInput {
  action: string;
  entityType: string;
  entityId?: string | null;
  clientId?: string | null;
  projectId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function recordAudit(ctx: ServiceContext, input: AuditInput): Promise<void> {
  await ctx.db.insert(auditLogs).values({
    id: newId(),
    workspaceId: ctx.actor.workspaceId,
    actorUserId: ctx.actor.userId,
    actorLabel: ctx.actor.kind === "ngg" ? `ngg:${ctx.actor.role}` : `client:${ctx.actor.role}`,
    clientId: input.clientId ?? null,
    projectId: input.projectId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    metadata: input.metadata ?? {},
  });
}

/** Audit entries written by system processes (survey runtime) that have no actor. */
export async function recordSystemAudit(
  db: ServiceContext["db"],
  workspaceId: string,
  input: AuditInput & { actorLabel: string },
): Promise<void> {
  await db.insert(auditLogs).values({
    id: newId(),
    workspaceId,
    actorUserId: null,
    actorLabel: input.actorLabel,
    clientId: input.clientId ?? null,
    projectId: input.projectId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    metadata: input.metadata ?? {},
  });
}

export async function listAudit(ctx: ServiceContext, limit = 100) {
  assertWorkspace(ctx, "workspace.view_audit");
  return ctx.db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.workspaceId, ctx.actor.workspaceId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { clientUserProjectAccess, users, type User } from "@/server/db/schema";
import { hashPassword } from "@/server/auth/password";
import { newId } from "@/lib/ids";
import { ConflictError, ValidationError } from "@/server/shared/errors";
import { LOCALES, NGG_ROLES } from "@/domain/shared/enums";
import type { ServiceContext } from "./context";
import { assertWorkspace, requireClient } from "./access";
import { recordAudit } from "./audit";

export const nggUserInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  nggRole: z.enum(NGG_ROLES),
  locale: z.enum(LOCALES).default("he"),
  password: z.string().min(10).max(200),
});

export async function listNggUsers(ctx: ServiceContext): Promise<User[]> {
  assertWorkspace(ctx, "workspace.view_portfolio");
  return ctx.db
    .select()
    .from(users)
    .where(and(eq(users.workspaceId, ctx.actor.workspaceId), eq(users.kind, "ngg")))
    .orderBy(asc(users.name));
}

export async function createNggUser(ctx: ServiceContext, input: z.infer<typeof nggUserInputSchema>): Promise<User> {
  assertWorkspace(ctx, "workspace.manage_users");
  const parsed = nggUserInputSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("user", parsed.error.issues.map((i) => i.path.join(".")));
  const email = parsed.data.email.toLowerCase();
  const existing = await ctx.db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length) throw new ConflictError("email");
  const id = newId();
  const [created] = await ctx.db
    .insert(users)
    .values({
      id,
      workspaceId: ctx.actor.workspaceId,
      email,
      name: parsed.data.name,
      kind: "ngg",
      nggRole: parsed.data.nggRole,
      locale: parsed.data.locale,
      passwordHash: await hashPassword(parsed.data.password),
    })
    .returning();
  await recordAudit(ctx, { action: "user.created", entityType: "user", entityId: id, metadata: { role: parsed.data.nggRole } });
  return created!;
}

export async function setNggUserStatus(ctx: ServiceContext, userId: string, status: "active" | "disabled"): Promise<void> {
  assertWorkspace(ctx, "workspace.manage_users");
  if (userId === ctx.actor.userId) throw new ValidationError("self");
  await ctx.db
    .update(users)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(users.id, userId), eq(users.workspaceId, ctx.actor.workspaceId), eq(users.kind, "ngg")));
  await recordAudit(ctx, { action: "user.status_changed", entityType: "user", entityId: userId, metadata: { status } });
}

/** Client users of one client, with their project restrictions. */
export async function listClientUsers(ctx: ServiceContext, clientId: string) {
  await requireClient(ctx, clientId, "client.manage_access");
  const rows = await ctx.db
    .select()
    .from(users)
    .where(and(eq(users.clientId, clientId), eq(users.kind, "client")))
    .orderBy(asc(users.name));
  const access = await ctx.db.select().from(clientUserProjectAccess);
  return rows.map((user) => ({
    ...user,
    projectIds: access.filter((a) => a.userId === user.id).map((a) => a.projectId),
  }));
}

export async function revokeClientUser(ctx: ServiceContext, clientId: string, userId: string): Promise<void> {
  await requireClient(ctx, clientId, "client.manage_access");
  await ctx.db
    .update(users)
    .set({ status: "disabled", updatedAt: new Date() })
    .where(and(eq(users.id, userId), eq(users.clientId, clientId), eq(users.kind, "client")));
  await recordAudit(ctx, { action: "client.access_revoked", entityType: "user", entityId: userId, clientId });
}

export async function restoreClientUser(ctx: ServiceContext, clientId: string, userId: string): Promise<void> {
  await requireClient(ctx, clientId, "client.manage_access");
  await ctx.db
    .update(users)
    .set({ status: "active", updatedAt: new Date() })
    .where(and(eq(users.id, userId), eq(users.clientId, clientId), eq(users.kind, "client")));
  await recordAudit(ctx, { action: "client.access_restored", entityType: "user", entityId: userId, clientId });
}

export async function updateOwnLocale(ctx: ServiceContext, locale: "he" | "en"): Promise<void> {
  await ctx.db.update(users).set({ locale, updatedAt: new Date() }).where(eq(users.id, ctx.actor.userId));
}

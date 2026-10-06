import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { clientUserProjectAccess, invitations, projects, users, type Invitation } from "@/server/db/schema";
import { generateToken, hashToken } from "@/server/auth/tokens";
import { hashPassword } from "@/server/auth/password";
import { newId } from "@/lib/ids";
import { env } from "@/server/shared/env";
import { ConflictError, NotFoundError, ValidationError } from "@/server/shared/errors";
import { CLIENT_ROLES } from "@/domain/shared/enums";
import { canClient } from "@/domain/authz/policy";
import type { Db } from "@/server/db/connection";
import type { ServiceContext } from "./context";
import { requireClient } from "./access";
import { recordAudit } from "./audit";

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 14;

export const inviteInputSchema = z.object({
  email: z.string().trim().email().max(200),
  name: z.string().trim().max(120).optional().or(z.literal("")),
  clientRole: z.enum(CLIENT_ROLES),
  projectIds: z.array(z.string()).default([]),
});
export type InviteInput = z.infer<typeof inviteInputSchema>;

export interface CreatedInvitation {
  invitation: Invitation;
  /** Clear-text link. Shown once to the inviter because V1 does not send email. */
  link: string;
}

/**
 * NGG users with `client.manage_access` can invite admins and viewers.
 * Client admins can invite viewers only, and only when their client allows it (spec §5.4).
 */
export async function createInvitation(ctx: ServiceContext, clientId: string, input: InviteInput): Promise<CreatedInvitation> {
  const parsed = inviteInputSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("invite", parsed.error.issues.map((i) => i.path.join(".")));
  const isClientInviter = ctx.actor.kind === "client";
  if (isClientInviter) {
    await requireClient(ctx, clientId, "client.invite_viewers");
    if (parsed.data.clientRole !== "viewer") throw new ValidationError("role");
  } else {
    await requireClient(ctx, clientId, "client.manage_access");
  }
  const email = parsed.data.email.toLowerCase();
  const existingUser = await ctx.db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existingUser.length) throw new ConflictError("email");

  // Project restrictions must belong to this client.
  let projectIds: string[] = [];
  if (parsed.data.projectIds.length) {
    const rows = await ctx.db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.clientId, clientId), inArray(projects.id, parsed.data.projectIds)));
    projectIds = rows.map((r) => r.id);
  }

  const token = generateToken(32);
  const id = newId();
  const [invitation] = await ctx.db
    .insert(invitations)
    .values({
      id,
      clientId,
      email,
      name: parsed.data.name || null,
      clientRole: parsed.data.clientRole,
      projectIds,
      tokenHash: hashToken(token),
      invitedByUserId: ctx.actor.userId,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    })
    .returning();
  await recordAudit(ctx, {
    action: "client.user_invited",
    entityType: "invitation",
    entityId: id,
    clientId,
    metadata: { role: parsed.data.clientRole, projectIds },
  });
  return { invitation: invitation!, link: `${env.appUrl}/invite/${token}` };
}

export async function listInvitations(ctx: ServiceContext, clientId: string): Promise<Invitation[]> {
  const action = ctx.actor.kind === "client" ? "client.invite_viewers" : "client.manage_access";
  await requireClient(ctx, clientId, action);
  if (!canClient(ctx.actor, action, { clientId })) return [];
  return ctx.db.select().from(invitations).where(eq(invitations.clientId, clientId)).orderBy(desc(invitations.createdAt));
}

export async function revokeInvitation(ctx: ServiceContext, clientId: string, invitationId: string): Promise<void> {
  await requireClient(ctx, clientId, "client.manage_access");
  await ctx.db
    .update(invitations)
    .set({ revokedAt: new Date() })
    .where(and(eq(invitations.id, invitationId), eq(invitations.clientId, clientId), isNull(invitations.acceptedAt)));
  await recordAudit(ctx, { action: "client.invitation_revoked", entityType: "invitation", entityId: invitationId, clientId });
}

/** Public (unauthenticated) lookup used by the invitation page. */
export async function getPendingInvitationByToken(db: Db, token: string): Promise<Invitation | null> {
  const [row] = await db.select().from(invitations).where(eq(invitations.tokenHash, hashToken(token))).limit(1);
  if (!row || row.acceptedAt || row.revokedAt || row.expiresAt.getTime() < Date.now()) return null;
  return row;
}

export const acceptInvitationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  password: z.string().min(10).max(200),
});

/** Creates the client user from the invitation. Returns the new user id. */
export async function acceptInvitation(db: Db, token: string, input: z.infer<typeof acceptInvitationSchema>): Promise<string> {
  const invitation = await getPendingInvitationByToken(db, token);
  if (!invitation) throw new NotFoundError("invitation");
  const parsed = acceptInvitationSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("accept", parsed.error.issues.map((i) => i.path.join(".")));
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, invitation.email)).limit(1);
  if (existing.length) throw new ConflictError("email");
  const [client] = await db.query.clients.findMany({ where: (c, { eq }) => eq(c.id, invitation.clientId), limit: 1 });
  if (!client) throw new NotFoundError("client");
  const userId = newId();
  await db.insert(users).values({
    id: userId,
    workspaceId: client.workspaceId,
    email: invitation.email,
    name: parsed.data.name,
    kind: "client",
    clientRole: invitation.clientRole,
    clientId: invitation.clientId,
    locale: client.locale,
    passwordHash: await hashPassword(parsed.data.password),
  });
  if (invitation.projectIds.length) {
    await db.insert(clientUserProjectAccess).values(invitation.projectIds.map((projectId) => ({ userId, projectId })));
  }
  await db.update(invitations).set({ acceptedAt: new Date() }).where(eq(invitations.id, invitation.id));
  return userId;
}

/** Invitations that can still be accepted. */
export function pendingInvitations(list: Invitation[]): Invitation[] {
  const now = Date.now();
  return list.filter((i) => !i.acceptedAt && !i.revokedAt && i.expiresAt.getTime() > now);
}

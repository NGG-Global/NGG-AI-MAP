import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/server/db/connection";
import { passwordResetTokens, sessions, users, type User } from "@/server/db/schema";
import { generateToken, hashToken } from "@/server/auth/tokens";
import { hashPassword } from "@/server/auth/password";
import { canClient, canWorkspace } from "@/domain/authz/policy";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/shared/errors";
import { env } from "@/server/shared/env";
import type { ServiceContext } from "./context";
import { recordAudit, recordSystemAudit } from "./audit";

/**
 * Password reset without email delivery: an administrator issues a one-time link and passes it to the
 * user, exactly like an invitation. The link expires after 48 hours and every active session of the
 * user ends when it is used.
 */

const RESET_TTL_MS = 48 * 60 * 60 * 1000;

export const resetPasswordSchema = z.object({ password: z.string().min(10).max(200) });

function assertCanReset(ctx: ServiceContext, target: User): void {
  if (target.workspaceId !== ctx.actor.workspaceId) throw new NotFoundError("user");
  if (target.kind === "ngg") {
    // NGG accounts are managed by super admins only.
    if (!canWorkspace(ctx.actor, "workspace.manage_users")) throw new ForbiddenError("user.reset_password");
    return;
  }
  if (!target.clientId || !canClient(ctx.actor, "client.manage_access", { clientId: target.clientId })) throw new ForbiddenError("user.reset_password");
}

export async function createPasswordResetLink(ctx: ServiceContext, userId: string): Promise<{ url: string; expiresAt: Date }> {
  const [target] = await ctx.db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!target) throw new NotFoundError("user");
  assertCanReset(ctx, target);
  if (target.status !== "active") throw new ValidationError("user_inactive");
  const now = new Date();
  // Only the newest link works.
  await ctx.db.update(passwordResetTokens).set({ usedAt: now }).where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)));
  const token = generateToken(32);
  const expiresAt = new Date(now.getTime() + RESET_TTL_MS);
  await ctx.db.insert(passwordResetTokens).values({ id: hashToken(token), userId, createdByUserId: ctx.actor.userId, expiresAt });
  await recordAudit(ctx, { action: "user.password_reset_issued", entityType: "user", entityId: userId, clientId: target.clientId ?? null });
  return { url: `${env.appUrl}/reset/${token}`, expiresAt };
}

/** The user behind a valid, unused, unexpired link, or null. */
export async function getUserByResetToken(db: Db, token: string): Promise<User | null> {
  if (!token) return null;
  const [row] = await db
    .select({ user: users })
    .from(passwordResetTokens)
    .innerJoin(users, eq(users.id, passwordResetTokens.userId))
    .where(and(eq(passwordResetTokens.id, hashToken(token)), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date())))
    .limit(1);
  return row && row.user.status === "active" ? row.user : null;
}

/** Sets the new password, consumes the link and signs the user out everywhere. Returns the user id. */
export async function redeemPasswordReset(db: Db, token: string, input: z.infer<typeof resetPasswordSchema>): Promise<string> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("password", ["password"]);
  const user = await getUserByResetToken(db, token);
  if (!user) throw new NotFoundError("reset_link");
  const now = new Date();
  const [consumed] = await db
    .update(passwordResetTokens)
    .set({ usedAt: now })
    .where(and(eq(passwordResetTokens.id, hashToken(token)), isNull(passwordResetTokens.usedAt)))
    .returning();
  if (!consumed) throw new NotFoundError("reset_link");
  await db.update(users).set({ passwordHash: await hashPassword(parsed.data.password), updatedAt: now }).where(eq(users.id, user.id));
  await db.delete(sessions).where(eq(sessions.userId, user.id));
  await recordSystemAudit(db, user.workspaceId, { actorLabel: "user", action: "user.password_reset_completed", entityType: "user", entityId: user.id, clientId: user.clientId ?? null });
  return user.id;
}

import { and, eq, gt, inArray } from "drizzle-orm";
import type { Db } from "@/server/db/connection";
import { clientUserProjectAccess, clients, projectAssignments, projects, sessions, users, type User } from "@/server/db/schema";
import { generateToken, hashToken } from "./tokens";
import type { Actor } from "@/domain/authz/policy";

export const SESSION_COOKIE = "ngg_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

export async function createSession(db: Db, userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt });
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
  return { token, expiresAt };
}

export async function deleteSession(db: Db, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}

export async function getUserBySessionToken(db: Db, token: string | undefined): Promise<User | null> {
  if (!token) return null;
  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const user = rows[0]?.user;
  if (!user || user.status !== "active") return null;
  return user;
}

/** Builds the authorization principal for a user row, including project assignments. */
export async function loadActor(db: Db, user: User): Promise<Actor> {
  if (user.kind === "ngg") {
    if (!user.nggRole) throw new Error(`NGG user ${user.id} has no role`);
    const assignments = await db
      .select({ projectId: projectAssignments.projectId, clientId: projects.clientId })
      .from(projectAssignments)
      .innerJoin(projects, eq(projects.id, projectAssignments.projectId))
      .where(eq(projectAssignments.userId, user.id));
    // A project manager who creates a client keeps access to it before any project exists.
    const created = await db
      .select({ clientId: clients.id })
      .from(clients)
      .where(and(eq(clients.createdByUserId, user.id), eq(clients.workspaceId, user.workspaceId)));
    return {
      kind: "ngg",
      userId: user.id,
      workspaceId: user.workspaceId,
      role: user.nggRole,
      assignedProjectIds: new Set(assignments.map((a) => a.projectId)),
      assignedClientIds: new Set([...assignments.map((a) => a.clientId), ...created.map((c) => c.clientId)]),
    };
  }
  if (!user.clientId || !user.clientRole) throw new Error(`client user ${user.id} is not bound to a client`);
  const [client] = await db.select().from(clients).where(eq(clients.id, user.clientId)).limit(1);
  const restrictions = await db
    .select({ projectId: clientUserProjectAccess.projectId })
    .from(clientUserProjectAccess)
    .where(eq(clientUserProjectAccess.userId, user.id));
  // Drop restrictions pointing at projects of other clients (defensive; should not exist).
  let restricted = restrictions.map((r) => r.projectId);
  if (restricted.length > 0) {
    const valid = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(inArray(projects.id, restricted), eq(projects.clientId, user.clientId)));
    restricted = valid.map((v) => v.id);
  }
  return {
    kind: "client",
    userId: user.id,
    workspaceId: user.workspaceId,
    role: user.clientRole,
    clientId: user.clientId,
    restrictedProjectIds: new Set(restricted),
    clientAllowsInvites: client?.allowClientInvites ?? false,
  };
}

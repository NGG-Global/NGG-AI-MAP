import { createDb, closeDb, type Db } from "@/server/db/connection";
import { newId } from "@/lib/ids";
import { clients, projectAssignments, projects, users, workspaces } from "@/server/db/schema";
import { hashPassword } from "@/server/auth/password";
import { loadActor } from "@/server/auth/session";
import type { Actor } from "@/domain/authz/policy";
import type { ServiceContext } from "@/server/services/context";

export async function testDb(): Promise<Db> {
  return createDb({ target: "memory", runMigrations: true });
}

export { closeDb };

/** A small two-tenant world used by most integration tests. */
export interface World {
  workspaceId: string;
  superAdmin: Actor;
  pmA: Actor;
  analystA: Actor;
  clientAdminA: Actor;
  clientViewerB: Actor;
  clientA: { id: string; projectId: string };
  clientB: { id: string; projectId: string };
}

export async function seedWorld(db: Db): Promise<World> {
  const workspaceId = newId();
  await db.insert(workspaces).values({ id: workspaceId, name: "NGG" });
  const passwordHash = await hashPassword("test-password-123");

  const clientAId = newId();
  const clientBId = newId();
  await db.insert(clients).values([
    { id: clientAId, workspaceId, slug: "client-a", name: "Client A" },
    { id: clientBId, workspaceId, slug: "client-b", name: "Client B" },
  ]);
  const projectAId = newId();
  const projectBId = newId();
  await db.insert(projects).values([
    { id: projectAId, clientId: clientAId, name: "Project A" },
    { id: projectBId, clientId: clientBId, name: "Project B" },
  ]);

  const mk = async (partial: Partial<typeof users.$inferInsert> & { email: string; name: string; kind: "ngg" | "client" }) => {
    const id = newId();
    await db.insert(users).values({ id, workspaceId, passwordHash, ...partial });
    return id;
  };
  const superAdminId = await mk({ email: "sa@ngg.test", name: "Super", kind: "ngg", nggRole: "super_admin" });
  const pmAId = await mk({ email: "pm@ngg.test", name: "PM", kind: "ngg", nggRole: "project_manager" });
  const analystAId = await mk({ email: "an@ngg.test", name: "Analyst", kind: "ngg", nggRole: "analyst" });
  const clientAdminAId = await mk({ email: "admin@a.test", name: "Admin A", kind: "client", clientRole: "admin", clientId: clientAId });
  const clientViewerBId = await mk({ email: "viewer@b.test", name: "Viewer B", kind: "client", clientRole: "viewer", clientId: clientBId });
  await db.insert(projectAssignments).values([
    { projectId: projectAId, userId: pmAId },
    { projectId: projectAId, userId: analystAId },
  ]);

  const actorFor = async (id: string) => {
    const [user] = await db.select().from(users).where((await import("drizzle-orm")).eq(users.id, id));
    return loadActor(db, user!);
  };
  return {
    workspaceId,
    superAdmin: await actorFor(superAdminId),
    pmA: await actorFor(pmAId),
    analystA: await actorFor(analystAId),
    clientAdminA: await actorFor(clientAdminAId),
    clientViewerB: await actorFor(clientViewerBId),
    clientA: { id: clientAId, projectId: projectAId },
    clientB: { id: clientBId, projectId: projectBId },
  };
}

export function ctxFor(db: Db, actor: Actor): ServiceContext {
  return { db, actor };
}

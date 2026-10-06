import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { testDb, closeDb, seedWorld, ctxFor, type World } from "./helpers/db";
import type { Db } from "@/server/db/connection";
import { getClient, listClients, updateClientSettings } from "@/server/services/clients";
import { getProject, listProjectsForClient } from "@/server/services/projects";
import { createInvitation } from "@/server/services/invitations";
import { ForbiddenError, NotFoundError } from "@/server/shared/errors";

let db: Db;
let world: World;

beforeAll(async () => {
  db = await testDb();
  world = await seedWorld(db);
});
afterAll(async () => closeDb(db));

describe("tenant isolation", () => {
  it("a client user only lists their own client", async () => {
    const list = await listClients(ctxFor(db, world.clientAdminA));
    expect(list.map((c) => c.id)).toEqual([world.clientA.id]);
  });

  it("a client user cannot read another client (reported as not found)", async () => {
    await expect(getClient(ctxFor(db, world.clientAdminA), world.clientB.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(getProject(ctxFor(db, world.clientAdminA), world.clientB.projectId)).rejects.toBeInstanceOf(NotFoundError);
    await expect(listProjectsForClient(ctxFor(db, world.clientViewerB), world.clientA.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("a client user can read their own client and project", async () => {
    const client = await getClient(ctxFor(db, world.clientAdminA), world.clientA.id);
    expect(client.id).toBe(world.clientA.id);
    const { project } = await getProject(ctxFor(db, world.clientAdminA), world.clientA.projectId);
    expect(project.id).toBe(world.clientA.projectId);
  });

  it("a project manager sees only assigned clients and projects", async () => {
    const list = await listClients(ctxFor(db, world.pmA));
    expect(list.map((c) => c.id)).toEqual([world.clientA.id]);
    await expect(getClient(ctxFor(db, world.pmA), world.clientB.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(getProject(ctxFor(db, world.pmA), world.clientB.projectId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("a super admin sees everything", async () => {
    const list = await listClients(ctxFor(db, world.superAdmin));
    expect(list.map((c) => c.id).sort()).toEqual([world.clientA.id, world.clientB.id].sort());
    const { project } = await getProject(ctxFor(db, world.superAdmin), world.clientB.projectId);
    expect(project.id).toBe(world.clientB.projectId);
  });

  it("invitations are restricted to projects of the same client", async () => {
    const { invitation } = await createInvitation(ctxFor(db, world.superAdmin), world.clientA.id, {
      email: "exec@a.test",
      clientRole: "viewer",
      projectIds: [world.clientA.projectId, world.clientB.projectId],
    });
    expect(invitation.projectIds).toEqual([world.clientA.projectId]);
  });

  it("client users cannot change client settings", async () => {
    await expect(
      updateClientSettings(ctxFor(db, world.clientAdminA), world.clientA.id, {
        name: "Hacked",
        slug: "client-a",
        locale: "he",
        departments: [],
        roleFamilies: [],
        seniorityGroups: [],
        locations: [],
        allowClientInvites: true,
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

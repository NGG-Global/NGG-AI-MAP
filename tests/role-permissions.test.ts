import { describe, expect, it } from "vitest";
import { canClient, canProject, canWorkspace, type Actor } from "@/domain/authz/policy";
import type { NggRole } from "@/domain/shared/enums";

const ngg = (role: NggRole, projects: string[] = [], clients: string[] = []): Actor => ({
  kind: "ngg",
  userId: "u",
  workspaceId: "w",
  role,
  assignedProjectIds: new Set(projects),
  assignedClientIds: new Set(clients),
});

const clientUser = (role: "admin" | "viewer", clientId: string, restricted: string[] = [], allowsInvites = false): Actor => ({
  kind: "client",
  userId: "u",
  workspaceId: "w",
  role,
  clientId,
  restrictedProjectIds: new Set(restricted),
  clientAllowsInvites: allowsInvites,
});

describe("role permissions", () => {
  it("super admin can do workspace-level administration", () => {
    expect(canWorkspace(ngg("super_admin"), "workspace.manage_users")).toBe(true);
    expect(canWorkspace(ngg("super_admin"), "workspace.manage_library")).toBe(true);
    expect(canWorkspace(ngg("project_manager"), "workspace.manage_users")).toBe(false);
    expect(canWorkspace(ngg("analyst"), "client.create")).toBe(false);
  });

  it("project managers act only on assigned projects", () => {
    const pm = ngg("project_manager", ["p1"], ["c1"]);
    expect(canProject(pm, "questionnaire.edit", { clientId: "c1", projectId: "p1" })).toBe(true);
    expect(canProject(pm, "questionnaire.edit", { clientId: "c2", projectId: "p2" })).toBe(false);
    expect(canClient(pm, "client.manage_access", { clientId: "c1" })).toBe(true);
    expect(canClient(pm, "client.update_privacy", { clientId: "c1" })).toBe(false);
  });

  it("analysts can analyse but not manage", () => {
    const analyst = ngg("analyst", ["p1"], ["c1"]);
    expect(canProject(analyst, "results.view_aggregate", { clientId: "c1", projectId: "p1" })).toBe(true);
    expect(canProject(analyst, "insight.generate", { clientId: "c1", projectId: "p1" })).toBe(true);
    expect(canProject(analyst, "insight.review", { clientId: "c1", projectId: "p1" })).toBe(false);
    expect(canProject(analyst, "wave.manage", { clientId: "c1", projectId: "p1" })).toBe(false);
    expect(canProject(analyst, "results.view_raw", { clientId: "c1", projectId: "p1" })).toBe(false);
    expect(canClient(analyst, "client.manage_access", { clientId: "c1" })).toBe(false);
  });

  it("client users never see raw responses or edit anything", () => {
    const admin = clientUser("admin", "c1");
    expect(canProject(admin, "dashboard.view", { clientId: "c1", projectId: "p1" })).toBe(true);
    expect(canProject(admin, "results.view_raw", { clientId: "c1", projectId: "p1" })).toBe(false);
    expect(canProject(admin, "questionnaire.edit", { clientId: "c1", projectId: "p1" })).toBe(false);
    expect(canProject(admin, "dashboard.view", { clientId: "c2", projectId: "p9" })).toBe(false);
  });

  it("client admins may invite viewers only when the client allows it", () => {
    expect(canClient(clientUser("admin", "c1", [], false), "client.invite_viewers", { clientId: "c1" })).toBe(false);
    expect(canClient(clientUser("admin", "c1", [], true), "client.invite_viewers", { clientId: "c1" })).toBe(true);
    expect(canClient(clientUser("viewer", "c1", [], true), "client.invite_viewers", { clientId: "c1" })).toBe(false);
  });

  it("project restrictions limit client users", () => {
    const viewer = clientUser("viewer", "c1", ["p1"]);
    expect(canProject(viewer, "dashboard.view", { clientId: "c1", projectId: "p1" })).toBe(true);
    expect(canProject(viewer, "dashboard.view", { clientId: "c1", projectId: "p2" })).toBe(false);
  });
});

import type { ClientRole, NggRole } from "@/domain/shared/enums";

/**
 * The authenticated principal. Built once per request from the session and passed to every service.
 * Authorization is decided here (pure) and enforced in `server/services/access.ts`.
 */
export type Actor =
  | {
      kind: "ngg";
      userId: string;
      workspaceId: string;
      role: NggRole;
      /** Projects explicitly assigned. Ignored for super admins. */
      assignedProjectIds: ReadonlySet<string>;
      /** Clients derived from the assigned projects. Ignored for super admins. */
      assignedClientIds: ReadonlySet<string>;
    }
  | {
      kind: "client";
      userId: string;
      workspaceId: string;
      role: ClientRole;
      clientId: string;
      /** Empty set = all projects of the client. */
      restrictedProjectIds: ReadonlySet<string>;
      clientAllowsInvites: boolean;
    };

export type Action =
  // workspace level
  | "workspace.view_portfolio"
  | "workspace.manage_users"
  | "workspace.manage_library"
  | "workspace.manage_settings"
  | "workspace.view_audit"
  | "client.create"
  | "client.delete"
  // client level
  | "client.view"
  | "client.update_settings"
  | "client.update_privacy"
  | "client.manage_access"
  | "client.invite_viewers"
  // project level
  | "project.create"
  | "project.view"
  | "project.update"
  | "questionnaire.edit"
  | "wave.manage"
  | "results.view_aggregate"
  | "results.view_raw"
  | "insight.generate"
  | "insight.review"
  | "goal.create"
  | "goal.approve"
  | "dashboard.view";

export interface ClientScope {
  clientId: string;
}
export interface ProjectScope {
  clientId: string;
  projectId: string;
}

const NGG_WORKSPACE_ACTIONS: Record<NggRole, ReadonlySet<Action>> = {
  super_admin: new Set<Action>([
    "workspace.view_portfolio",
    "workspace.manage_users",
    "workspace.manage_library",
    "workspace.manage_settings",
    "workspace.view_audit",
    "client.create",
    "client.delete",
  ]),
  project_manager: new Set<Action>(["workspace.view_portfolio", "client.create"]),
  analyst: new Set<Action>(["workspace.view_portfolio"]),
};

const NGG_SCOPED_ACTIONS: Record<NggRole, ReadonlySet<Action>> = {
  super_admin: new Set<Action>([
    "client.view",
    "client.update_settings",
    "client.update_privacy",
    "client.manage_access",
    "client.invite_viewers",
    "project.create",
    "project.view",
    "project.update",
    "questionnaire.edit",
    "wave.manage",
    "results.view_aggregate",
    "results.view_raw",
    "insight.generate",
    "insight.review",
    "goal.create",
    "goal.approve",
    "dashboard.view",
  ]),
  project_manager: new Set<Action>([
    "client.view",
    "client.update_settings",
    "client.manage_access",
    "client.invite_viewers",
    "project.create",
    "project.view",
    "project.update",
    "questionnaire.edit",
    "wave.manage",
    "results.view_aggregate",
    "results.view_raw",
    "insight.generate",
    "insight.review",
    "goal.create",
    "goal.approve",
    "dashboard.view",
  ]),
  analyst: new Set<Action>([
    "client.view",
    "project.view",
    "results.view_aggregate",
    "insight.generate",
    "goal.create",
    "dashboard.view",
  ]),
};

const CLIENT_ACTIONS: Record<ClientRole, ReadonlySet<Action>> = {
  admin: new Set<Action>(["client.view", "project.view", "dashboard.view", "results.view_aggregate"]),
  viewer: new Set<Action>(["client.view", "project.view", "dashboard.view", "results.view_aggregate"]),
};

/** Workspace-level decision (no client/project scope). */
export function canWorkspace(actor: Actor, action: Action): boolean {
  if (actor.kind !== "ngg") return false;
  return NGG_WORKSPACE_ACTIONS[actor.role].has(action);
}

export function canClient(actor: Actor, action: Action, scope: ClientScope): boolean {
  if (actor.kind === "ngg") {
    if (!NGG_SCOPED_ACTIONS[actor.role].has(action)) return false;
    if (actor.role === "super_admin") return true;
    return actor.assignedClientIds.has(scope.clientId);
  }
  if (actor.clientId !== scope.clientId) return false;
  if (action === "client.invite_viewers") return actor.role === "admin" && actor.clientAllowsInvites;
  return CLIENT_ACTIONS[actor.role].has(action);
}

export function canProject(actor: Actor, action: Action, scope: ProjectScope): boolean {
  if (actor.kind === "ngg") {
    if (!NGG_SCOPED_ACTIONS[actor.role].has(action)) return false;
    if (actor.role === "super_admin") return true;
    return actor.assignedProjectIds.has(scope.projectId);
  }
  if (actor.clientId !== scope.clientId) return false;
  if (actor.restrictedProjectIds.size > 0 && !actor.restrictedProjectIds.has(scope.projectId)) return false;
  return CLIENT_ACTIONS[actor.role].has(action);
}

export function isNgg(actor: Actor): actor is Extract<Actor, { kind: "ngg" }> {
  return actor.kind === "ngg";
}

export function isClientUser(actor: Actor): actor is Extract<Actor, { kind: "client" }> {
  return actor.kind === "client";
}

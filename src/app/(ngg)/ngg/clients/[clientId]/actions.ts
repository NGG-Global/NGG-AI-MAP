"use server";

import { redirect } from "next/navigation";
import { createPasswordResetLink } from "@/server/services/passwordResets";
import { revalidatePath } from "next/cache";
import { requireNggContext } from "@/server/auth/current";
import { createProject, updateProject, assignNggUser, unassignNggUser } from "@/server/services/projects";
import { updateClientSettings, updatePrivacyThreshold } from "@/server/services/clients";
import { createInvitation, revokeInvitation } from "@/server/services/invitations";
import { revokeClientUser, restoreClientUser } from "@/server/services/users";
import { commaList, field, fieldList, runAction, type ActionState } from "@/server/ui/actions";

export async function createProjectAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireNggContext();
    const clientId = field(formData, "clientId");
    const project = await createProject(ctx, clientId, {
      name: field(formData, "name"),
      managerUserId: field(formData, "managerUserId"),
      researchMode: field(formData, "researchMode") === "flexible" ? "flexible" : "research_safe",
    });
    redirect(`/ngg/clients/${clientId}/projects/${project.id}`);
  });
}

export async function updateProjectAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireNggContext();
    const projectId = field(formData, "projectId");
    const clientId = field(formData, "clientId");
    const status = field(formData, "status");
    await updateProject(ctx, projectId, {
      name: field(formData, "name"),
      managerUserId: field(formData, "managerUserId"),
      researchMode: field(formData, "researchMode") === "flexible" ? "flexible" : "research_safe",
      status: (["setup", "collecting", "analysis", "follow_up", "closed"] as const).find((s) => s === status) ?? "setup",
    });
    revalidatePath(`/ngg/clients/${clientId}/projects/${projectId}`);
    return { ok: true, message: ctx.user.locale === "he" ? "ההגדרות נשמרו" : "Settings saved" };
  });
}

export async function assignUserAction(formData: FormData): Promise<void> {
  const ctx = await requireNggContext();
  const projectId = field(formData, "projectId");
  const clientId = field(formData, "clientId");
  const userId = field(formData, "userId");
  if (field(formData, "mode") === "remove") await unassignNggUser(ctx, projectId, userId);
  else await assignNggUser(ctx, projectId, userId);
  revalidatePath(`/ngg/clients/${clientId}/projects/${projectId}`);
}

export async function updateClientSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireNggContext();
    const clientId = field(formData, "clientId");
    await updateClientSettings(ctx, clientId, {
      name: field(formData, "name"),
      slug: field(formData, "slug"),
      industry: field(formData, "industry"),
      organizationSize: field(formData, "organizationSize") ? Number(field(formData, "organizationSize")) : undefined,
      locale: field(formData, "locale") === "en" ? "en" : "he",
      surveyContact: field(formData, "surveyContact"),
      primaryColor: field(formData, "primaryColor"),
      logoText: field(formData, "logoText"),
      departments: commaList(formData, "departments"),
      roleFamilies: commaList(formData, "roleFamilies"),
      seniorityGroups: commaList(formData, "seniorityGroups"),
      locations: commaList(formData, "locations"),
      allowClientInvites: formData.get("allowClientInvites") === "on",
    });
    if (ctx.actor.role === "super_admin" && field(formData, "privacyThreshold")) {
      await updatePrivacyThreshold(ctx, clientId, Number(field(formData, "privacyThreshold")));
    }
    revalidatePath(`/ngg/clients/${clientId}`);
    return { ok: true, message: ctx.user.locale === "he" ? "ההגדרות נשמרו" : "Settings saved" };
  });
}

export async function inviteUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireNggContext();
    const clientId = field(formData, "clientId");
    const { link } = await createInvitation(ctx, clientId, {
      email: field(formData, "email"),
      name: field(formData, "name"),
      clientRole: field(formData, "clientRole") === "admin" ? "admin" : "viewer",
      projectIds: fieldList(formData, "projectIds"),
    });
    revalidatePath(`/ngg/clients/${clientId}/access`);
    return { ok: true, data: { link } };
  });
}

export async function revokeInvitationAction(formData: FormData): Promise<void> {
  const ctx = await requireNggContext();
  const clientId = field(formData, "clientId");
  await revokeInvitation(ctx, clientId, field(formData, "invitationId"));
  revalidatePath(`/ngg/clients/${clientId}/access`);
}

export async function toggleClientUserAction(formData: FormData): Promise<void> {
  const ctx = await requireNggContext();
  const clientId = field(formData, "clientId");
  const userId = field(formData, "userId");
  if (field(formData, "mode") === "restore") await restoreClientUser(ctx, clientId, userId);
  else await revokeClientUser(ctx, clientId, userId);
  revalidatePath(`/ngg/clients/${clientId}/access`);
}

export async function clientPasswordResetAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireNggContext();
    const { url } = await createPasswordResetLink(ctx, field(formData, "userId"));
    return { ok: true, data: { url } };
  });
}

import "server-only";
import { notFound, redirect } from "next/navigation";
import { getDictionary, dirFor, type Dictionary } from "@/lib/i18n";
import { requireContext, type RequestContext } from "@/server/auth/current";
import { getProject } from "@/server/services/projects";
import { listVisibleProjects } from "@/server/services/access";
import { NotFoundError, ForbiddenError } from "@/server/shared/errors";
import type { Client, Project } from "@/server/db/schema";
import type { Locale } from "@/domain/shared/enums";

export interface DashboardContext {
  ctx: RequestContext;
  client: Client;
  project: Project;
  locale: Locale;
  dir: "rtl" | "ltr";
  t: Dictionary;
  /** True when an NGG user previews the client dashboard. */
  isNggPreview: boolean;
}

/**
 * Resolves the executive dashboard for a project. Client users are bound to their tenant by the
 * services; NGG users may preview any project they are assigned to (spec §8 "view as client").
 */
export async function dashboardPage(projectId: string): Promise<DashboardContext> {
  const ctx = await requireContext();
  try {
    const { project, client } = await getProject(ctx, projectId);
    const locale = ctx.user.locale;
    return { ctx, client, project, locale, dir: dirFor(locale), t: getDictionary(locale), isNggPreview: ctx.actor.kind === "ngg" };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ForbiddenError) notFound();
    throw error;
  }
}

/** Entry point `/dashboard`: sends the user to their (first) project. */
export async function resolveDashboardEntry(): Promise<never> {
  const ctx = await requireContext();
  if (ctx.actor.kind === "ngg") redirect("/ngg");
  const visible = await listVisibleProjects(ctx);
  const first = visible[0];
  if (!first) redirect("/dashboard/none");
  redirect(`/dashboard/${first.id}/overview`);
}

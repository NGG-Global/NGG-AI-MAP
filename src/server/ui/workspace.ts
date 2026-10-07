import "server-only";
import { notFound } from "next/navigation";
import { NotFoundError } from "@/server/shared/errors";
import { getClient } from "@/server/services/clients";
import { getProject, listProjectsForClient } from "@/server/services/projects";
import { getProjectSummary } from "@/server/services/portfolio";
import type { ServiceContext } from "@/server/services/context";
import { questionnaires, type Client, type Project } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { nextProjectStep, type NextStep } from "@/domain/projects/nextStep";

export interface ClientWorkspace {
  client: Client;
  projects: Project[];
  project: Project | null;
  summary: Awaited<ReturnType<typeof getProjectSummary>> | null;
  hasQuestionnaire: boolean;
  /** What moves this project forward now; shared by every workspace screen. */
  nextStep: NextStep;
}

/** Loads a client (and optionally a project) for the NGG client workspace, converting "not found" into a 404. */
export async function loadClientWorkspace(ctx: ServiceContext, clientId: string, projectId?: string): Promise<ClientWorkspace> {
  try {
    const client = await getClient(ctx, clientId);
    const projects = await listProjectsForClient(ctx, clientId);
    let project: Project | null = null;
    if (projectId) {
      const found = await getProject(ctx, projectId);
      if (found.client.id !== clientId) notFound();
      project = found.project;
    }
    const summary = project ? await getProjectSummary(ctx, project.id) : null;
    const hasQuestionnaire = project ? (await ctx.db.select({ id: questionnaires.id }).from(questionnaires).where(eq(questionnaires.projectId, project.id)).limit(1)).length > 0 : false;
    const nextStep = nextProjectStep({ hasProject: Boolean(project) || projects.length > 0, hasQuestionnaire, waves: summary?.waves ?? [] });
    return { client, projects, project, summary, hasQuestionnaire, nextStep };
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}

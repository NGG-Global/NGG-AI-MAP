import "server-only";
import { notFound } from "next/navigation";
import { NotFoundError } from "@/server/shared/errors";
import { getClient } from "@/server/services/clients";
import { getProject, listProjectsForClient } from "@/server/services/projects";
import { getProjectSummary } from "@/server/services/portfolio";
import type { ServiceContext } from "@/server/services/context";
import type { Client, Project } from "@/server/db/schema";

export interface ClientWorkspace {
  client: Client;
  projects: Project[];
  project: Project | null;
  summary: Awaited<ReturnType<typeof getProjectSummary>> | null;
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
    return { client, projects, project, summary };
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}

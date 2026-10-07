import { redirect } from "next/navigation";
import { nggPage } from "@/server/ui/page";
import { loadClientWorkspace } from "@/server/ui/workspace";
import { listNggUsers } from "@/server/services/users";
import { canClient } from "@/domain/authz/policy";
import { ClientWorkspaceHeader } from "@/components/ngg/ClientWorkspaceHeader";
import { Tile, TileTitle } from "@/components/ui/Tile";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProjectForm } from "./ProjectForm";
import { NextStepCard } from "@/components/ngg/NextStepCard";

export const dynamic = "force-dynamic";

export default async function ClientOverviewPage({ params }: PageProps<"/ngg/clients/[clientId]">) {
  const { clientId } = await params;
  const { ctx, t, locale } = await nggPage();
  const workspace = await loadClientWorkspace(ctx, clientId);
  if (workspace.projects.length > 0) {
    redirect(`/ngg/clients/${clientId}/projects/${workspace.projects[0]!.id}`);
  }
  const canCreate = canClient(ctx.actor, "project.create", { clientId });
  const managers = canCreate ? (await listNggUsers(ctx)).filter((u) => u.nggRole !== "analyst").map((u) => ({ id: u.id, name: u.name })) : [];
  return (
    <>
      <ClientWorkspaceHeader workspace={workspace} active="overview" t={t} locale={locale} canManage={canCreate} />
      {canCreate ? <NextStepCard step={workspace.nextStep} projectBase={null} currentPage="client" canAct t={t} locale={locale} /> : null}
      <Tile>
        <TileTitle>{t.clients.projects}</TileTitle>
        {canCreate ? (
          <>
            <h3 className="mb-3 text-[15px] font-bold">{t.clients.createProject}</h3>
            <ProjectForm t={t} locale={locale} clientId={clientId} managers={managers} defaultManagerId={ctx.user.id} />
          </>
        ) : (
          <EmptyState title={t.clients.noProjects} />
        )}
      </Tile>
    </>
  );
}

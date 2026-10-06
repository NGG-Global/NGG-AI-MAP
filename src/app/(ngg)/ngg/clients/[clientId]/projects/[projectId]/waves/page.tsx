import { nggPage } from "@/server/ui/page";
import { loadClientWorkspace } from "@/server/ui/workspace";
import { canProject } from "@/domain/authz/policy";
import { ClientWorkspaceHeader } from "@/components/ngg/ClientWorkspaceHeader";
import { Tile } from "@/components/ui/Tile";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export default async function WavesPage({ params }: PageProps<"/ngg/clients/[clientId]/projects/[projectId]/waves">) {
  const { clientId, projectId } = await params;
  const { ctx, t, locale } = await nggPage();
  const workspace = await loadClientWorkspace(ctx, clientId, projectId);
  return (
    <>
      <ClientWorkspaceHeader workspace={workspace} active="waves" t={t} locale={locale} canManage={canProject(ctx.actor, "project.update", { clientId, projectId })} />
      <Tile>
        <EmptyState title={t.clientTabs.waves} body={t.states.empty} />
      </Tile>
    </>
  );
}

import { dashboardPage } from "@/server/ui/dashboard";
import { listVisibleProjects } from "@/server/services/access";
import { ClientShell } from "@/components/client/ClientShell";
import { Tile } from "@/components/ui/Tile";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export default async function ClientOverviewPage({ params }: PageProps<"/dashboard/[projectId]/overview">) {
  const { projectId } = await params;
  const d = await dashboardPage(projectId);
  const projects = await listVisibleProjects(d.ctx, d.client.id);
  return (
    <ClientShell client={d.client} project={d.project} projects={projects} active="overview" t={d.t} locale={d.locale} dir={d.dir} isNggPreview={d.isNggPreview} userName={d.ctx.user.name}>
      <Tile padding="hero">
        <EmptyState title={d.t.client.nav.overview} body={d.t.client.noResults} />
      </Tile>
    </ClientShell>
  );
}

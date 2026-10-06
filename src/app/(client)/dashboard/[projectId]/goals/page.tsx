import { dashboardPage } from "@/server/ui/dashboard";
import { loadDashboardData } from "@/server/ui/dashboardData";
import { ClientShell } from "@/components/client/ClientShell";
import { Tile, TileTitle } from "@/components/ui/Tile";
import { EmptyState } from "@/components/ui/EmptyState";
import { GoalCard } from "@/components/goals/GoalCard";
import { loadMetricConfigs } from "@/server/services/library";

export const dynamic = "force-dynamic";

export default async function ClientGoalsPage({ params, searchParams }: PageProps<"/dashboard/[projectId]/goals">) {
  const { projectId } = await params;
  const sp = await searchParams;
  const d = await dashboardPage(projectId);
  const data = await loadDashboardData(d, sp);
  const metrics = data.view?.metrics ?? (await loadMetricConfigs(d.ctx.db));
  const { t, locale } = d;
  const active = data.goals.filter((g) => g.goal.status !== "completed" && g.goal.status !== "archived");
  const done = data.goals.filter((g) => g.goal.status === "completed");
  return (
    <ClientShell client={d.client} project={d.project} projects={data.projects} active="goals" t={t} locale={locale} dir={d.dir} isNggPreview={d.isNggPreview} userName={d.ctx.user.name}>
      <Tile padding="hero">
        <h1 className="text-[30px] font-extrabold leading-tight md:text-[36px]">{t.dashboard.goals.title}</h1>
        <p className="mt-1 text-[14px] text-text-muted">{t.goals.subtitle}</p>
      </Tile>
      <Tile>
        <TileTitle trailing={<span className="text-[12px] text-text-muted">{active.length}</span>}>{t.goals.activePriorities}</TileTitle>
        {active.length === 0 ? <EmptyState title={t.dashboard.goals.none} /> : <div className="flex flex-col gap-3">{active.map((g) => <GoalCard key={g.goal.id} goal={g.goal} measurement={g.measurement} metrics={metrics} locale={locale} t={t} />)}</div>}
      </Tile>
      {done.length ? (
        <Tile>
          <TileTitle>{t.goals.statuses.completed}</TileTitle>
          <div className="flex flex-col gap-3">{done.map((g) => <GoalCard key={g.goal.id} goal={g.goal} measurement={g.measurement} metrics={metrics} locale={locale} t={t} />)}</div>
        </Tile>
      ) : null}
    </ClientShell>
  );
}

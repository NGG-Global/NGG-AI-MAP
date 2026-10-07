import { dashboardPage } from "@/server/ui/dashboard";
import { loadDashboardData } from "@/server/ui/dashboardData";
import { ClientDashboardPage } from "@/components/client/ClientDashboardPage";
import { KpiCard } from "@/components/client/KpiCard";
import { Tile, TileTitle } from "@/components/ui/Tile";
import { DistributionBars } from "@/components/results/DistributionBars";
import { MetricBars } from "@/components/results/MetricBars";
import { findQuestion } from "@/domain/questionnaire/definition";

export const dynamic = "force-dynamic";

export default async function AdoptionPage({ params, searchParams }: PageProps<"/dashboard/[projectId]/adoption">) {
  const { projectId } = await params;
  const sp = await searchParams;
  const d = await dashboardPage(projectId);
  const data = await loadDashboardData(d, sp);
  const { t, locale } = d;
  const view = data.view;
  const threshold = d.client.privacyThreshold;
  const metric = (id: string) => view?.metrics.find((m) => m.id === id);
  const row = (id: string) => view?.compared.find((c) => c.metricId === id);
  const dist = (id: string) => view?.distributions.find((x) => x.itemCanonicalId === id);
  const base = (id: string) => view?.baselineDistributions.find((x) => x.itemCanonicalId === id) ?? null;
  const q = (id: string) => (data.definition ? findQuestion(data.definition, id) : undefined);
  const a = t.dashboard.adoption;
  return (
    <ClientDashboardPage d={d} data={data} active="adoption" headline={a.title}>
      {view ? (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {["ai_usage_frequency", "ai_daily_use_share", "ai_nonuser_share", "use_case_breadth"].map((id, i) => (metric(id) ? <KpiCard key={id} metric={metric(id)!} row={row(id)} locale={locale} t={t} baselineCode={view.baseline?.code ?? null} threshold={threshold} accent={i === 0} /> : null))}
          </div>
          <div className="flex flex-wrap gap-4">
            <Tile className="flex-[1_1_320px]">
              <TileTitle>{a.usage}</TileTitle>
              <DistributionBars distribution={dist("USE_01")} question={q("USE_01")} locale={locale} threshold={threshold} baseline={base("USE_01")} />
            </Tile>
            <Tile className="flex-[1_1_320px]">
              <TileTitle trailing={<span className="text-[12px] text-text-muted">{a.funnelHelp}</span>}>{a.funnel}</TileTitle>
              <MetricBars metrics={view.metrics.filter((m) => m.group === "adoption_funnel")} compared={view.compared} locale={locale} t={t} baselineCode={view.baseline?.code} currentCode={data.selected?.code} threshold={threshold} partial={data.partial} showN={false} />
            </Tile>
          </div>
          <div className="flex flex-wrap gap-4">
            <Tile className="flex-[1_1_360px]">
              <TileTitle>{a.useCases}</TileTitle>
              <DistributionBars distribution={dist("USE_04")} question={q("USE_04")} locale={locale} threshold={threshold} order="desc" baseline={base("USE_04")} />
            </Tile>
            <Tile className="flex-[1_1_360px]">
              <TileTitle>{a.tools}</TileTitle>
              <DistributionBars distribution={dist("USE_02")} question={q("USE_02")} locale={locale} threshold={threshold} order="desc" baseline={base("USE_02")} />
            </Tile>
          </div>
          <div className="flex flex-wrap gap-4">
            <Tile className="flex-[1_1_360px]">
              <TileTitle>{a.literacy}</TileTitle>
              <MetricBars metrics={view.metrics.filter((m) => m.id === "gail_total" || m.group === "ai_literacy_dimension")} compared={view.compared} locale={locale} t={t} baselineCode={view.baseline?.code} currentCode={data.selected?.code} threshold={threshold} partial={data.partial} showN={false} />
            </Tile>
            <Tile className="flex-[1_1_360px]">
              <TileTitle>{a.routine}</TileTitle>
              <MetricBars metrics={["ai_work_integration", "tool_access"].map(metric).filter((m): m is NonNullable<typeof m> => Boolean(m))} compared={view.compared} locale={locale} t={t} baselineCode={view.baseline?.code} currentCode={data.selected?.code} threshold={threshold} partial={data.partial} showN={false} />
              <div className="mt-4">
                <p className="mb-2 text-[12px] font-semibold text-text-muted">{a.automation}</p>
                <DistributionBars distribution={dist("USE_06")} question={q("USE_06")} locale={locale} threshold={threshold} baseline={base("USE_06")} />
              </div>
            </Tile>
          </div>
        </>
      ) : null}
    </ClientDashboardPage>
  );
}

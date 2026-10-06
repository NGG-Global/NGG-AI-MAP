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
            {["ai_usage", "ai_daily_share", "ai_nonuser_share", "use_case_breadth"].map((id, i) => (metric(id) ? <KpiCard key={id} metric={metric(id)!} row={row(id)} locale={locale} t={t} baselineCode={view.baseline?.code ?? null} threshold={threshold} accent={i === 0} /> : null))}
          </div>
          <div className="flex flex-wrap gap-4">
            <Tile className="flex-[1_1_320px]">
              <TileTitle>{a.usage}</TileTitle>
              <DistributionBars distribution={dist("ctx_ai_use_30d")} question={q("ctx_ai_use_30d")} locale={locale} threshold={threshold} baseline={base("ctx_ai_use_30d")} />
            </Tile>
            <Tile className="flex-[1_1_320px]">
              <TileTitle trailing={<span className="text-[12px] text-text-muted">{a.funnelHelp}</span>}>{a.funnel}</TileTitle>
              <DistributionBars distribution={dist("work_patterns")} question={q("work_patterns")} locale={locale} threshold={threshold} emphasize baseline={base("work_patterns")} />
            </Tile>
          </div>
          <div className="flex flex-wrap gap-4">
            <Tile className="flex-[1_1_360px]">
              <TileTitle>{a.useCases}</TileTitle>
              <DistributionBars distribution={dist("usecase_types")} question={q("usecase_types")} locale={locale} threshold={threshold} order="desc" baseline={base("usecase_types")} />
            </Tile>
            <Tile className="flex-[1_1_360px]">
              <TileTitle>{a.literacy}</TileTitle>
              <MetricBars metrics={view.metrics.filter((m) => m.group === "ai_literacy_dimension")} compared={view.compared} locale={locale} t={t} baselineCode={view.baseline?.code} currentCode={data.selected?.code} threshold={threshold} partial={data.partial} showN={false} />
            </Tile>
          </div>
        </>
      ) : null}
    </ClientDashboardPage>
  );
}

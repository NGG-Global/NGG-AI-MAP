import { dashboardPage } from "@/server/ui/dashboard";
import { loadDashboardData } from "@/server/ui/dashboardData";
import { ClientDashboardPage } from "@/components/client/ClientDashboardPage";
import { Tile, TileTitle } from "@/components/ui/Tile";
import { Notice } from "@/components/ui/Notice";
import { Segmented } from "@/components/ui/Segmented";
import { MetricBars } from "@/components/results/MetricBars";
import { GapTable } from "@/components/results/GapTable";
import { DelegationHeatmap } from "@/components/client/DelegationHeatmap";
import { DistributionBars } from "@/components/results/DistributionBars";
import { findQuestion } from "@/domain/questionnaire/definition";
import { lt } from "@/domain/shared/localized";
import { fmt } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function ManagementPage({ params, searchParams }: PageProps<"/dashboard/[projectId]/management">) {
  const { projectId } = await params;
  const sp = await searchParams;
  const d = await dashboardPage(projectId);
  const data = await loadDashboardData(d, sp);
  const { t, locale } = d;
  const view = data.view;
  const threshold = d.client.privacyThreshold;
  const m = t.dashboard.management;
  const viewMode = sp.view === "opportunity" ? "DELEGATION_OPPORTUNITY" : "DELEGATION_MAP";
  const hasManagers = view?.compared.some((c) => c.metricId.startsWith("agentic_manage_") && !c.current.suppressed) ?? false;
  const worstGap = view ? [...view.gaps].filter((g) => g.gap != null).sort((a, b) => (a.gap ?? 0) - (b.gap ?? 0))[0] : undefined;
  const worstMetric = worstGap ? view?.metrics.find((x) => x.id === worstGap.pairId) : undefined;
  return (
    <ClientDashboardPage d={d} data={data} active="management" headline={m.title}>
      {view ? (
        !hasManagers ? (
          <Tile><Notice tone="info">{m.noManagers}</Notice></Tile>
        ) : (
          <>
            <div className="flex flex-wrap gap-4">
              <Tile className="flex-[1_1_380px]">
                <TileTitle trailing={<span className="text-[12px] text-text-muted">{m.profileHelp}</span>}>{m.profile}</TileTitle>
                <MetricBars metrics={view.metrics.filter((x) => x.group === "agentic_management_dimension")} compared={view.compared} locale={locale} t={t} baselineCode={view.baseline?.code} currentCode={data.selected?.code} threshold={threshold} partial={data.partial} />
              </Tile>
              <Tile className="flex-[1_1_380px]">
                <TileTitle trailing={<span className="text-[12px] text-text-muted">{m.gapHelp}</span>}>{m.gap}</TileTitle>
                <MetricBars metrics={view.metrics.filter((x) => x.group === "team_experience")} compared={view.compared} locale={locale} t={t} baselineCode={view.baseline?.code} currentCode={data.selected?.code} threshold={threshold} partial={data.partial} />
                <div className="mt-4" />
                <GapTable gaps={view.gaps} metrics={view.metrics} locale={locale} t={t} threshold={threshold} />
                {worstGap && worstMetric && worstGap.gap != null && worstGap.gap <= -0.3 ? <Notice tone="accent" className="mt-3">{fmt(m.largestGap, { name: lt(worstMetric.name, locale) })}</Notice> : null}
              </Tile>
            </div>
            <Tile>
              <TileTitle
                trailing={
                  <Segmented
                    ariaLabel={m.delegation}
                    value={viewMode === "DELEGATION_MAP" ? "current" : "opportunity"}
                    options={[
                      { value: "current", label: m.current, href: data.href("management", { extra: { view: "current" } }) },
                      { value: "opportunity", label: m.opportunity, href: data.href("management", { extra: { view: "opportunity" } }) },
                    ]}
                  />
                }
              >
                {m.delegation}
              </TileTitle>
              <p className="mb-3 text-[12px] text-text-muted">{m.delegationHelp}</p>
              {viewMode === "DELEGATION_MAP" ? (
                <DelegationHeatmap distribution={view.distributions.find((x) => x.itemCanonicalId === viewMode)} question={data.definition ? findQuestion(data.definition, viewMode) : undefined} locale={locale} threshold={threshold} />
              ) : (
                <DistributionBars distribution={view.distributions.find((x) => x.itemCanonicalId === viewMode)} question={data.definition ? findQuestion(data.definition, viewMode) : undefined} locale={locale} threshold={threshold} order="desc" />
              )}
            </Tile>
          </>
        )
      ) : null}
    </ClientDashboardPage>
  );
}

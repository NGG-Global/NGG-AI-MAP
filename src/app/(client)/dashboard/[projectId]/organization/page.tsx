import { dashboardPage } from "@/server/ui/dashboard";
import { loadDashboardData } from "@/server/ui/dashboardData";
import { getItemStats } from "@/server/services/results";
import { ClientDashboardPage } from "@/components/client/ClientDashboardPage";
import { Tile, TileTitle } from "@/components/ui/Tile";
import { Delta } from "@/components/ui/Delta";
import { PrivacyProtected } from "@/components/ui/PrivacyProtected";
import { DistributionBars } from "@/components/results/DistributionBars";
import { findQuestion } from "@/domain/questionnaire/definition";
import { lt } from "@/domain/shared/localized";
import { formatScore } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OrganizationPage({ params, searchParams }: PageProps<"/dashboard/[projectId]/organization">) {
  const { projectId } = await params;
  const sp = await searchParams;
  const d = await dashboardPage(projectId);
  const data = await loadDashboardData(d, sp);
  const { t, locale } = d;
  const view = data.view;
  const threshold = d.client.privacyThreshold;
  const o = t.dashboard.organization;
  const dims = view?.metrics.filter((m) => m.group === "enablement_dimension") ?? [];
  const stats = view && data.selected ? await Promise.all(dims.map((m) => getItemStats(d.ctx, data.selected!.id, m.id, data.segment))) : [];
  const q = (id: string) => (data.definition ? findQuestion(data.definition, id) : undefined);
  return (
    <ClientDashboardPage d={d} data={data} active="organization" headline={o.title}>
      {view ? (
        <>
          <Tile>
            <TileTitle>{o.dims}</TileTitle>
            <ul className="flex flex-col gap-2">
              {dims.map((m, i) => {
                const row = view.compared.find((c) => c.metricId === m.id);
                const items = (stats[i] ?? []).filter((s) => !s.suppressed && s.score != null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
                const strongest = items[0];
                const weakest = items[items.length - 1];
                return (
                  <li key={m.id} className="grid grid-cols-1 gap-3 rounded-[16px] bg-sunken px-4 py-3 md:grid-cols-[1.2fr_0.5fr_0.7fr_2fr_2fr]">
                    <span className="text-[14px] font-bold">{lt(m.name, locale)}</span>
                    {!row || row.current.suppressed ? (
                      <div className="md:col-span-4"><PrivacyProtected locale={locale} compact threshold={threshold} /></div>
                    ) : (
                      <>
                        <span className="text-[18px] font-black">{formatScore(row.current.score, locale)}</span>
                        <Delta value={row.delta} locale={locale} notComparable={Boolean(row.baseline) && !row.comparable} />
                        <span className="text-[12px] text-text-muted"><strong className="text-success">{o.strongest}:</strong> {strongest ? `${lt(q(strongest.canonicalId)?.text, locale)} (${formatScore(strongest.score, locale)})` : "—"}</span>
                        <span className="text-[12px] text-text-muted"><strong className="text-danger">{o.weakest}:</strong> {weakest && weakest !== strongest ? `${lt(q(weakest.canonicalId)?.text, locale)} (${formatScore(weakest.score, locale)})` : "—"}</span>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </Tile>
          <div className="flex flex-wrap gap-4">
            <Tile className="flex-[1_1_360px]">
              <TileTitle>{o.barriers}</TileTitle>
              <DistributionBars distribution={view.distributions.find((x) => x.itemCanonicalId === "barriers_main")} question={q("barriers_main")} locale={locale} threshold={threshold} order="desc" baseline={view.baselineDistributions.find((x) => x.itemCanonicalId === "barriers_main") ?? null} />
            </Tile>
            <Tile className="flex-[1_1_360px]">
              <TileTitle>{o.opportunities}</TileTitle>
              <DistributionBars distribution={view.distributions.find((x) => x.itemCanonicalId === "opp_areas")} question={q("opp_areas")} locale={locale} threshold={threshold} order="desc" />
            </Tile>
          </div>
        </>
      ) : null}
    </ClientDashboardPage>
  );
}

import { dashboardPage } from "@/server/ui/dashboard";
import { loadDashboardData } from "@/server/ui/dashboardData";
import { getMetricBySegments, getMetricTrend } from "@/server/services/results";
import { ClientDashboardPage } from "@/components/client/ClientDashboardPage";
import { TrendChart } from "@/components/client/TrendChart";
import { Tile, TileTitle } from "@/components/ui/Tile";
import { Segmented } from "@/components/ui/Segmented";
import { Notice } from "@/components/ui/Notice";
import { Delta } from "@/components/ui/Delta";
import { PrivacyProtected } from "@/components/ui/PrivacyProtected";
import { MetricBars } from "@/components/results/MetricBars";
import { lt } from "@/domain/shared/localized";
import { fmt } from "@/lib/i18n";
import { formatMonth, formatScore } from "@/lib/format";

export const dynamic = "force-dynamic";

const SELECTABLE = ["ai_literacy", "agentic_work", "org_enablement", "agentic_management", "impact", "ai_usage", "verification"];

export default async function TrendsPage({ params, searchParams }: PageProps<"/dashboard/[projectId]/trends">) {
  const { projectId } = await params;
  const sp = await searchParams;
  const d = await dashboardPage(projectId);
  const data = await loadDashboardData(d, sp);
  const { t, locale } = d;
  const view = data.view;
  const tr = t.dashboard.trends;
  const threshold = d.client.privacyThreshold;
  const metricId = typeof sp.metric === "string" && SELECTABLE.includes(sp.metric) ? sp.metric : "ai_literacy";
  const metric = view?.metrics.find((m) => m.id === metricId);
  const trend = view ? await getMetricTrend(d.ctx, projectId, metricId, data.segment) : [];
  const byUnit = view && data.selected ? await getMetricBySegments(d.ctx, data.selected.id, metricId, "department") : [];
  const closedCount = trend.filter((p) => p.wave.status === "closed").length;
  const partial = data.partial[metricId];
  const dims = view?.metrics.filter((m) => m.parentId === metricId) ?? [];
  const points = trend
    .filter((p) => p.wave.status !== "draft")
    .map((p) => ({ code: p.wave.code, label: formatMonth(p.wave.closedAt ?? p.wave.endAt ?? p.wave.startAt ?? p.wave.createdAt, locale), score: p.computed ? p.score : null, planned: p.wave.status !== "closed", suppressed: p.suppressed }));
  const nextPlanned = d.project.nextFollowUpAt && !points.some((p) => p.planned) ? [{ code: `T${points.length}`, label: formatMonth(d.project.nextFollowUpAt, locale), score: null, planned: true }] : [];
  return (
    <ClientDashboardPage
      d={d}
      data={data}
      active="trends"
      headline={tr.title}
      headerExtra={
        <div className="flex flex-wrap items-center gap-3">
          <ol className="flex flex-wrap gap-2 text-[12px]">
            {[...points, ...nextPlanned].map((p) => (
              <li key={p.code} className={`rounded-full px-3 py-1 font-semibold ${p.planned ? "border border-dashed border-line-dashed text-text-muted" : "bg-sunken"}`}>
                {p.code} · {p.label}{p.planned ? ` · ${tr.planned}` : ""}
              </li>
            ))}
          </ol>
        </div>
      }
    >
      {view && metric ? (
        <>
          <Tile>
            <TileTitle trailing={<Segmented ariaLabel={tr.selector} value={metricId} options={SELECTABLE.filter((id) => view.metrics.some((m) => m.id === id)).map((id) => ({ value: id, label: lt(view.metrics.find((m) => m.id === id)!.name, locale), href: data.href("trends", { extra: { metric: id } }) }))} />}>{tr.chart}</TileTitle>
            {closedCount < 2 ? <Notice tone="info" className="mb-3">{tr.noTrend}</Notice> : null}
            <TrendChart points={[...points, ...nextPlanned]} min={metric.scaleMin} max={metric.scaleMax} locale={locale} title={`${lt(metric.name, locale)} · ${tr.chart}`} />
            {partial ? <p className="mt-2 text-[12px] text-text-muted">{fmt(tr.basedOn, { shared: partial.shared, total: partial.total, label: partial.shared === partial.total ? tr.full : partial.shared === 0 ? tr.none : tr.partial })}</p> : null}
          </Tile>
          <div className="flex flex-wrap gap-4">
            {dims.length ? (
              <Tile className="flex-[1_1_360px]">
                <TileTitle>{tr.byDimension}</TileTitle>
                <MetricBars metrics={dims} compared={view.compared} locale={locale} t={t} baselineCode={view.baseline?.code} currentCode={data.selected?.code} threshold={threshold} partial={data.partial} showN={false} />
              </Tile>
            ) : null}
            <Tile className="flex-[1_1_360px]">
              <TileTitle>{tr.byUnit}</TileTitle>
              <ul className="flex flex-col gap-2">
                {byUnit.map((u) => (
                  <li key={u.value} className="grid grid-cols-[1.2fr_1fr_0.8fr] items-center gap-3 rounded-[14px] bg-sunken px-3 py-2 text-[13px]">
                    <span className="font-semibold">{u.value}</span>
                    {u.suppressed ? (
                      <div className="col-span-2"><PrivacyProtected locale={locale} compact threshold={threshold} /></div>
                    ) : (
                      <>
                        <span>{u.baselineScore != null ? <><bdi dir="ltr">{formatScore(u.baselineScore, locale)}</bdi> ← </> : null}<strong>{formatScore(u.score, locale)}</strong></span>
                        <span className="flex items-center gap-2"><Delta value={u.delta} locale={locale} /><span className="text-[11px] text-text-muted">n={u.n}</span></span>
                      </>
                    )}
                  </li>
                ))}
                {byUnit.length === 0 ? <li className="text-[13px] text-text-muted">{t.states.empty}</li> : null}
              </ul>
            </Tile>
          </div>
        </>
      ) : null}
    </ClientDashboardPage>
  );
}

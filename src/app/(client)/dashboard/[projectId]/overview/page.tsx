import Link from "next/link";
import { dashboardPage } from "@/server/ui/dashboard";
import { loadDashboardData } from "@/server/ui/dashboardData";
import { ClientDashboardPage } from "@/components/client/ClientDashboardPage";
import { KpiCard } from "@/components/client/KpiCard";
import { Tile, TileTitle } from "@/components/ui/Tile";
import { Notice } from "@/components/ui/Notice";
import { InsightBadge, InsightView } from "@/components/insights/InsightView";
import { MetricBars } from "@/components/results/MetricBars";
import { GapTable } from "@/components/results/GapTable";
import { fmt } from "@/lib/i18n";
import type { ExecutiveSummary } from "@/domain/ai/contracts";

export const dynamic = "force-dynamic";

export default async function ClientOverviewPage({ params, searchParams }: PageProps<"/dashboard/[projectId]/overview">) {
  const { projectId } = await params;
  const sp = await searchParams;
  const d = await dashboardPage(projectId);
  const data = await loadDashboardData(d, sp);
  const { t, locale } = d;
  const view = data.view;
  const summary = data.executiveSummary;
  const payload = summary?.payload as ExecutiveSummary | undefined;
  const core = view?.metrics.filter((m) => m.coreProfile) ?? [];
  const threshold = d.client.privacyThreshold;
  const active = data.goals.filter((g) => g.goal.status === "active" || g.goal.status === "in_progress" || g.goal.status === "review");
  const onTrack = active.filter((g) => g.goal.actions.length === 0 || g.goal.actions.some((a) => a.done)).length;
  const coreRows = core.map((m) => view?.compared.find((c) => c.metricId === m.id)).filter((r): r is NonNullable<typeof r> => Boolean(r) && !r!.current.suppressed);
  // "Improved" counts only metrics with a desirable direction; trust is read in context, not as better/worse.
  const improved = coreRows.filter((r) => r.delta != null && r.delta >= 0.15 && !core.find((m) => m.id === r.metricId)?.neutralDirection).length;
  const headline = view?.baseline
    ? fmt(t.dashboard.headlineImproved, { n: improved, total: coreRows.length, wave: view.baseline.code })
    : view
      ? fmt(t.dashboard.headlineBaseline, { n: view.respondentCount })
      : undefined;

  return (
    <ClientDashboardPage d={d} data={data} active="overview" headline={headline}>
      {view && data.selected ? (
        <>
          <Tile className="flex flex-col gap-3">
            <TileTitle trailing={summary ? <InsightBadge status="published" t={t} /> : undefined}>{t.dashboard.executiveSummary}</TileTitle>
            {summary ? <InsightView insight={summary} metrics={view.metrics} locale={locale} t={t} compact /> : <Notice tone="info">{t.dashboard.pendingReview}</Notice>}
          </Tile>
          <section aria-label={t.dashboard.coreKpis} className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {core.map((metric, index) => (
              <KpiCard key={metric.id} metric={metric} row={view.compared.find((c) => c.metricId === metric.id)} locale={locale} t={t} baselineCode={view.baseline?.code ?? null} threshold={threshold} accent={index === 1} />
            ))}
          </section>
          {payload && !payload.insufficientEvidence && (payload.keyChanges.length || payload.risks.length || payload.opportunities.length) ? (
            <Tile>
              <TileTitle>{t.dashboard.keyFindings}</TileTitle>
              <div className="grid gap-3 md:grid-cols-3">
                {payload.keyChanges.slice(0, 2).map((k, i) => <Finding key={`c${i}`} label={t.dashboard.change} text={k.text} />)}
                {payload.risks.slice(0, 1).map((k, i) => <Finding key={`r${i}`} label={t.dashboard.risk} text={k.text} />)}
                {payload.opportunities.slice(0, 2).map((k, i) => <Finding key={`o${i}`} label={t.dashboard.opportunity} text={k.text} />)}
              </div>
            </Tile>
          ) : null}
          <div className="flex flex-wrap gap-4">
            <Tile className="flex-[1_1_320px]">
              <TileTitle trailing={<span className="text-[12px] text-text-muted">{t.dashboard.adoption.funnelHelp}</span>}>{t.dashboard.adoption.funnel}</TileTitle>
              <MetricBars metrics={view.metrics.filter((m) => m.group === "adoption_funnel")} compared={view.compared} locale={locale} t={t} baselineCode={view.baseline?.code} currentCode={data.selected?.code} threshold={threshold} partial={data.partial} showN={false} />
            </Tile>
            <Tile className="flex-[1_1_360px]">
              <TileTitle trailing={<Link href={data.href("management")} className="text-[12px] font-semibold">{t.client.nav.management} ←</Link>}>{t.dashboard.management.gap}</TileTitle>
              <GapTable gaps={view.gaps} metrics={view.metrics} locale={locale} t={t} threshold={threshold} />
            </Tile>
            <Tile tone="ink" className="flex flex-[1_1_240px] flex-col justify-between gap-4">
              <p className="text-[12px] font-semibold text-accent-on-dark">{t.goals.nextStep}</p>
              <p className="text-[22px] font-extrabold leading-snug">{fmt(t.goals.activeCount, { n: active.length })}</p>
              <p className="text-[13px] text-on-dark-muted">{fmt(t.goals.onTrack, { done: onTrack, total: active.length })}</p>
              <Link href={data.href("goals")} className="inline-flex h-10 w-fit items-center rounded-full bg-white/10 px-4 text-[13px] font-semibold text-white no-underline">{t.client.nav.goals} ←</Link>
            </Tile>
          </div>
        </>
      ) : null}
    </ClientDashboardPage>
  );
}

function Finding({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-[16px] bg-sunken px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-1 text-[14px]">{text}</p>
    </div>
  );
}

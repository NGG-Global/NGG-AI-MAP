import { nggPage } from "@/server/ui/page";
import { loadClientWorkspace } from "@/server/ui/workspace";
import { canProject } from "@/domain/authz/policy";
import { loadResultsPage, parseSegment, segmentParam } from "@/server/ui/results";
import { ClientWorkspaceHeader } from "@/components/ngg/ClientWorkspaceHeader";
import { Tile, TileTitle } from "@/components/ui/Tile";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { MetricBars } from "@/components/results/MetricBars";
import { GapTable } from "@/components/results/GapTable";
import { DistributionBars } from "@/components/results/DistributionBars";
import { SegmentFilter } from "@/components/results/SegmentFilter";
import { PrivacyProtected } from "@/components/ui/PrivacyProtected";
import { findQuestion } from "@/domain/questionnaire/definition";
import { fmt } from "@/lib/i18n";
import { formatDateTime } from "@/lib/format";
import { recomputeAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ResultsPage({ params, searchParams }: PageProps<"/ngg/clients/[clientId]/projects/[projectId]/results">) {
  const { clientId, projectId } = await params;
  const sp = await searchParams;
  const { ctx, t, locale } = await nggPage();
  const workspace = await loadClientWorkspace(ctx, clientId, projectId);
  const canManage = canProject(ctx.actor, "wave.manage", { clientId, projectId });
  const segment = parseSegment(sp.seg);
  const data = await loadResultsPage(ctx, projectId, typeof sp.wave === "string" ? sp.wave : undefined, segment);
  const r = t.results;
  const base = `/ngg/clients/${clientId}/projects/${projectId}/results`;
  const href = (wave: string | undefined, seg = segment) => `${base}?${new URLSearchParams({ ...(wave ? { wave } : {}), ...(segmentParam(seg) ? { seg: segmentParam(seg) } : {}) }).toString()}`;

  if (!data.selected || !data.view) {
    return (
      <>
        <ClientWorkspaceHeader workspace={workspace} active="results" t={t} locale={locale} canManage={canManage} />
        <Tile><EmptyState title={r.title} body={t.projects.noResultsYet} /></Tile>
      </>
    );
  }
  const { view, selected, definition } = data;
  const threshold = workspace.client.privacyThreshold;
  const byGroup = (group: string) => view.metrics.filter((m) => m.group === group);
  const core = view.metrics.filter((m) => m.coreProfile);
  const dist = (id: string) => view.distributions.find((d) => d.itemCanonicalId === id);
  const baseDist = (id: string) => view.baselineDistributions.find((d) => d.itemCanonicalId === id) ?? null;
  const q = (id: string) => (definition ? findQuestion(definition, id) : undefined);
  const hasManagers = view.compared.some((c) => c.metricId === "agentic_management" && !c.current.suppressed);
  const notComputed = view.computedAt == null;
  const affected = view.comparableMetricIds ? view.metrics.filter((m) => m.group === "core" && !view.comparableMetricIds!.has(m.id)).length : 0;

  return (
    <>
      <ClientWorkspaceHeader workspace={workspace} active="results" t={t} locale={locale} canManage={canManage} />
      <Tile className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TileTitle className="mb-0">{r.title}</TileTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented ariaLabel={r.wave} value={selected.id} options={data.waves.filter((w) => w.status !== "draft" && w.status !== "scheduled").map((w) => ({ value: w.id, label: w.code, href: href(w.id) }))} />
            {canManage ? (
              <form action={recomputeAction}>
                <input type="hidden" name="clientId" value={clientId} />
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="waveId" value={selected.id} />
                <Button type="submit" variant="secondary" size="sm">{r.compute}</Button>
              </form>
            ) : null}
          </div>
        </div>
        <p className="text-[12px] text-text-muted">
          {r.subtitle} {view.computedAt ? `· ${r.computed}: ${formatDateTime(view.computedAt, locale)}` : `· ${r.pending}`} · {fmt(r.n, { n: view.respondentCount })}
          {view.baseline ? ` · ${selected.code} ${r.comparedTo} ${view.baseline.code}` : ""}
        </p>
        <SegmentFilter options={view.segmentOptions} current={segment} hrefFor={(seg) => href(selected.id, seg)} t={t} />
        {notComputed ? <Notice tone="info">{r.noResults}</Notice> : null}
        {view.baseline && view.comparabilityPercent != null ? (
          <Notice tone={affected ? "warning" : "success"}>{affected ? fmt(r.partialComparability, { n: affected, wave: view.baseline.code }) : fmt(r.fullComparability, { wave: view.baseline.code })}</Notice>
        ) : null}
      </Tile>

      {segment.key !== "all" && view.compared.every((c) => c.current.suppressed) ? (
        <Tile><PrivacyProtected locale={locale} threshold={threshold} /></Tile>
      ) : null}

      <div className="flex flex-wrap gap-4">
        <Tile className="flex-[2_1_480px]">
          <TileTitle trailing={<span className="text-[12px] text-text-muted">{r.coreProfileHelp}</span>}>{r.coreProfile}</TileTitle>
          <MetricBars metrics={core} compared={view.compared} locale={locale} t={t} baselineCode={view.baseline?.code} currentCode={selected.code} threshold={threshold} partial={data.partial} />
        </Tile>
        <Tile className="flex-[1_1_320px]">
          <TileTitle trailing={<span className="text-[12px] text-text-muted">{r.patternsHelp}</span>}>{r.patterns}</TileTitle>
          <DistributionBars distribution={dist("work_patterns")} question={q("work_patterns")} locale={locale} threshold={threshold} emphasize baseline={baseDist("work_patterns")} />
        </Tile>
      </div>

      <div className="flex flex-wrap gap-4">
        <Tile className="flex-[1_1_360px]">
          <TileTitle>{r.literacyDims}</TileTitle>
          <MetricBars metrics={byGroup("ai_literacy_dimension")} compared={view.compared} locale={locale} t={t} baselineCode={view.baseline?.code} currentCode={selected.code} threshold={threshold} partial={data.partial} showN={false} />
        </Tile>
        <Tile className="flex-[1_1_360px]">
          <TileTitle>{r.enablementDims}</TileTitle>
          <MetricBars metrics={byGroup("enablement_dimension")} compared={view.compared} locale={locale} t={t} baselineCode={view.baseline?.code} currentCode={selected.code} threshold={threshold} partial={data.partial} showN={false} />
        </Tile>
      </div>

      <div className="flex flex-wrap gap-4">
        <Tile className="flex-[1_1_360px]">
          <TileTitle trailing={<span className="text-[12px] text-text-muted">{r.managementDimsHelp}</span>}>{r.managementDims}</TileTitle>
          {hasManagers ? (
            <MetricBars metrics={byGroup("agentic_management_dimension")} compared={view.compared} locale={locale} t={t} baselineCode={view.baseline?.code} currentCode={selected.code} threshold={threshold} partial={data.partial} />
          ) : (
            <p className="text-[13px] text-text-muted">{r.noManagers}</p>
          )}
        </Tile>
        <Tile className="flex-[1_1_360px]">
          <TileTitle trailing={<span className="text-[12px] text-text-muted">{r.gapsHelp}</span>}>{r.gaps}</TileTitle>
          <GapTable gaps={view.gaps} metrics={view.metrics} locale={locale} t={t} threshold={threshold} />
        </Tile>
      </div>

      <div className="flex flex-wrap gap-4">
        <Tile className="flex-[1_1_300px]">
          <TileTitle>{r.usage}</TileTitle>
          <DistributionBars distribution={dist("ctx_ai_use_30d")} question={q("ctx_ai_use_30d")} locale={locale} threshold={threshold} baseline={baseDist("ctx_ai_use_30d")} />
        </Tile>
        <Tile className="flex-[1_1_300px]">
          <TileTitle>{r.useCases}</TileTitle>
          <DistributionBars distribution={dist("usecase_types")} question={q("usecase_types")} locale={locale} threshold={threshold} order="desc" baseline={baseDist("usecase_types")} />
        </Tile>
        <Tile className="flex-[1_1_300px]">
          <TileTitle>{r.barriers}</TileTitle>
          <DistributionBars distribution={dist("barriers_main")} question={q("barriers_main")} locale={locale} threshold={threshold} order="desc" limit={6} baseline={baseDist("barriers_main")} />
        </Tile>
      </div>
    </>
  );
}

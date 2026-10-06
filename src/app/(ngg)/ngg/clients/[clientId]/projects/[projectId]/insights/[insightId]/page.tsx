import { notFound } from "next/navigation";
import { nggPage } from "@/server/ui/page";
import { loadClientWorkspace } from "@/server/ui/workspace";
import { canProject } from "@/domain/authz/policy";
import { getInsight } from "@/server/services/insights";
import { loadMetricConfigs } from "@/server/services/library";
import { ClientWorkspaceHeader } from "@/components/ngg/ClientWorkspaceHeader";
import { Tile, TileTitle, InnerRow } from "@/components/ui/Tile";
import { Button } from "@/components/ui/Button";
import { InsightBadge, InsightChecks, InsightView } from "@/components/insights/InsightView";
import { EditForm } from "./EditForm";
import { adoptGoalsAction, reviewInsightAction } from "../actions";
import { NotFoundError } from "@/server/shared/errors";
import { formatDateTime, formatDelta, formatScore } from "@/lib/format";
import { lt } from "@/domain/shared/localized";
import type { AnalyticalPayload } from "@/domain/ai/contracts";

export const dynamic = "force-dynamic";

export default async function InsightReviewPage({ params }: PageProps<"/ngg/clients/[clientId]/projects/[projectId]/insights/[insightId]">) {
  const { clientId, projectId, insightId } = await params;
  const { ctx, t, locale } = await nggPage();
  const workspace = await loadClientWorkspace(ctx, clientId, projectId);
  const insight = await getInsight(ctx, insightId).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  if (insight.projectId !== projectId) notFound();
  const metrics = await loadMetricConfigs(ctx.db);
  const canReview = canProject(ctx.actor, "insight.review", { clientId, projectId });
  const i = t.insights;
  const input = insight.inputSnapshot as AnalyticalPayload & { openTextSampleCount?: number };
  const waveCode = workspace.summary?.waves.find((w) => w.id === insight.waveId)?.code ?? "—";
  const hidden = (
    <>
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="insightId" value={insightId} />
    </>
  );
  const editableFields = insight.type === "executive_summary"
    ? [{ key: "currentState", label: i.currentState }, { key: "biggestChange", label: i.biggestChange }, { key: "primaryRisk", label: i.primaryRisk }, { key: "recommendedPriority", label: i.recommendedPriority }]
    : insight.type === "explain_change" ? [{ key: "whatChanged", label: i.whatChanged }] : [];

  return (
    <>
      <ClientWorkspaceHeader workspace={workspace} active="insights" t={t} locale={locale} canManage={canReview} />
      <Tile className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <InsightBadge status={insight.status} t={t} />
          <h2 className="mt-2 text-[24px] font-extrabold">{i[insight.type]} · {workspace.client.name}</h2>
          <p className="text-[13px] text-text-muted">
            {waveCode}{input.baselineWaveCode ? ` ${t.results.comparedTo} ${input.baselineWaveCode}` : ""} · {input.metrics?.length ?? 0} {t.builder.metrics} · {input.gaps?.length ?? 0} {t.results.gaps} · n={input.respondentCount}
          </p>
        </div>
        {canReview && insight.status !== "published" ? (
          <div className="flex flex-wrap gap-2">
            {insight.status !== "rejected" ? (
              <form action={reviewInsightAction}>{hidden}<input type="hidden" name="decision" value="rejected" /><Button type="submit" variant="danger" size="sm">{i.reject}</Button></form>
            ) : null}
            {insight.status === "draft" ? (
              <form action={reviewInsightAction}>{hidden}<input type="hidden" name="decision" value="reviewed" /><Button type="submit" variant="secondary" size="sm">{i.approve}</Button></form>
            ) : null}
            {insight.status !== "rejected" ? (
              <form action={reviewInsightAction}>{hidden}<input type="hidden" name="decision" value="published" /><Button type="submit" variant="cta" size="sm">{i.publish}</Button></form>
            ) : null}
            {insight.type === "goal_suggestions" ? (
              <form action={adoptGoalsAction}>{hidden}<Button type="submit" variant="primary" size="sm">{i.adoptGoals}</Button></form>
            ) : null}
          </div>
        ) : null}
      </Tile>
      <div className="flex flex-wrap gap-4">
        <Tile className="flex-[2_1_520px]">
          <TileTitle>{i[insight.type]}</TileTitle>
          <InsightView insight={insight} metrics={metrics} locale={locale} t={t} />
          {canReview && insight.status !== "published" && editableFields.length ? (
            <div className="mt-5 border-t border-line pt-4">
              <p className="mb-2 text-[14px] font-bold">{i.edit}</p>
              <EditForm t={t} locale={locale} clientId={clientId} projectId={projectId} insightId={insightId} payload={insight.payload as Record<string, unknown>} fields={editableFields} />
            </div>
          ) : null}
        </Tile>
        <div className="flex flex-[1_1_300px] flex-col gap-4">
          <Tile>
            <TileTitle>{i.checks}</TileTitle>
            <InsightChecks insight={insight} threshold={workspace.client.privacyThreshold} t={t} />
          </Tile>
          <Tile>
            <TileTitle>{i.evidence}</TileTitle>
            <ul className="flex flex-col gap-1 text-[12px]">
              {(input.metrics ?? []).filter((m) => m.score != null).slice(0, 12).map((m) => (
                <li key={m.metricId} className="grid grid-cols-[2fr_0.6fr_0.6fr_0.5fr] gap-2 rounded-[10px] bg-sunken px-3 py-1.5">
                  <span className="truncate">{metrics.find((x) => x.id === m.metricId) ? lt(metrics.find((x) => x.id === m.metricId)!.name, locale) : m.name}</span>
                  <span className="font-bold">{formatScore(m.score, locale)}</span>
                  <bdi dir="ltr" className="text-text-muted">{m.delta != null ? formatDelta(m.delta, locale) : "—"}</bdi>
                  <bdi dir="ltr" className="text-text-muted">{m.n}</bdi>
                </li>
              ))}
            </ul>
          </Tile>
          <Tile>
            <TileTitle>{i.source}</TileTitle>
            <InnerRow className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[12px]">
              <span className="text-text-muted">{i.createdAt}</span><span>{formatDateTime(insight.createdAt, locale)}</span>
              <span className="text-text-muted">{i.provider}</span><span dir="ltr">{insight.provider}{insight.model ? ` · ${insight.model}` : ""}</span>
              <span className="text-text-muted">{i.template}</span><span dir="ltr">{insight.promptTemplate}</span>
              {insight.reviewedAt ? <><span className="text-text-muted">{i.reviewedBy}</span><span>{formatDateTime(insight.reviewedAt, locale)}</span></> : null}
            </InnerRow>
          </Tile>
        </div>
      </div>
    </>
  );
}

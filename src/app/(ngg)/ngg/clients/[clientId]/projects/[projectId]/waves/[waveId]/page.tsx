import Link from "next/link";
import { notFound } from "next/navigation";
import { nggPage } from "@/server/ui/page";
import { loadClientWorkspace } from "@/server/ui/workspace";
import { canProject } from "@/domain/authz/policy";
import { getWave, getWaveComparability, getWaveMonitoring, surveyUrl } from "@/server/services/waves";
import { getQuestionnaireState } from "@/server/services/questionnaires";
import { ClientWorkspaceHeader } from "@/components/ngg/ClientWorkspaceHeader";
import { Tile, TileTitle, InnerRow } from "@/components/ui/Tile";
import { Kpi } from "@/components/ui/Kpi";
import { Notice } from "@/components/ui/Notice";
import { StatusPill, type PillTone } from "@/components/ui/StatusPill";
import { Button, LinkButton } from "@/components/ui/Button";
import { CopyField } from "@/components/forms/CopyField";
import { PrivacyProtected } from "@/components/ui/PrivacyProtected";
import { WaveForm } from "../new/WaveForm";
import { TokensForm } from "./TokensForm";
import { PublishForm } from "./PublishForm";
import { closeWaveAction, deleteWaveAction } from "../actions";
import { fmt } from "@/lib/i18n";
import { formatDate, formatPercent } from "@/lib/format";
import { lt } from "@/domain/shared/localized";
import { NotFoundError } from "@/server/shared/errors";
import { NextStepCard } from "@/components/ngg/NextStepCard";
import type { WaveStatus } from "@/domain/shared/enums";

export const dynamic = "force-dynamic";

const tone: Record<WaveStatus, PillTone> = { draft: "neutral", scheduled: "info", open: "success", closed: "neutral" };

export default async function WaveDetailPage({ params }: PageProps<"/ngg/clients/[clientId]/projects/[projectId]/waves/[waveId]">) {
  const { clientId, projectId, waveId } = await params;
  const { ctx, t, locale } = await nggPage();
  const workspace = await loadClientWorkspace(ctx, clientId, projectId);
  const canManage = canProject(ctx.actor, "wave.manage", { clientId, projectId });
  const wave = await getWave(ctx, waveId).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  if (wave.projectId !== projectId) notFound();
  const [monitoring, comparability, qState] = await Promise.all([
    canManage ? getWaveMonitoring(ctx, waveId) : Promise.resolve(null),
    getWaveComparability(ctx, waveId),
    getQuestionnaireState(ctx, projectId),
  ]);
  const w = t.waves;
  const base = `/ngg/clients/${clientId}/projects/${projectId}`;
  const hidden = (
    <>
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="waveId" value={waveId} />
    </>
  );
  const maxPerDay = Math.max(1, ...(monitoring?.perDay.map((d) => d.completed) ?? [1]));

  return (
    <>
      <ClientWorkspaceHeader workspace={workspace} active="waves" t={t} locale={locale} canManage={canManage} />
      <NextStepCard step={workspace.nextStep} projectBase={base} currentPage="wave" currentWaveId={waveId} completed={workspace.summary?.currentCompleted ?? 0} canAct={canManage} t={t} locale={locale} />
      <Tile className="flex flex-wrap items-center gap-4">
        <span className="text-[44px] font-black leading-none">{wave.code}</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[22px] font-extrabold">{wave.name}</h2>
          <p className="text-[13px] text-text-muted">
            {w[wave.type]} · {formatDate(wave.startAt, locale)} – {formatDate(wave.endAt, locale)} · {w.questionnaireVersion} {wave.version?.versionLabel ?? "—"}
            {wave.version?.lockedAt ? ` · ${w.snapshot}` : ""} · {w[wave.distributionMode]} · {w[wave.privacyMode]}
          </p>
        </div>
        <StatusPill tone={tone[wave.status]}>{t.waveStatus[wave.status]}</StatusPill>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            {wave.status === "draft" || wave.status === "scheduled" ? <PublishForm t={t} locale={locale} clientId={clientId} projectId={projectId} waveId={waveId} /> : null}
            {wave.status === "open" || wave.status === "scheduled" ? (
              <form action={closeWaveAction}>
                {hidden}
                <Button type="submit" variant="secondary" title={w.closeHelp}>{w.close}</Button>
              </form>
            ) : null}
            {wave.status === "draft" ? (
              <form action={deleteWaveAction}>
                {hidden}
                <Button type="submit" variant="danger">{w.delete}</Button>
              </form>
            ) : null}
            {wave.status === "closed" ? <LinkButton href={`${base}/results?wave=${wave.id}`} variant="primary">{w.results}</LinkButton> : null}
          </div>
        ) : null}
      </Tile>

      {wave.status === "draft" ? (
        <Notice tone="info">
          {w.draftNotice}{" "}
          <Link href={`${base}/assessment?version=${wave.questionnaireVersionId}`} className="font-semibold">{w.editQuestionnaire} ←</Link>
          {" · "}
          <Link href={`${base}/assessment/preview?version=${wave.questionnaireVersionId}&persona=employee`} className="font-semibold">{t.builder.preview} ←</Link>
        </Notice>
      ) : null}
      {wave.status === "scheduled" ? <Notice tone="info">{w.scheduledNotice}</Notice> : null}
      {wave.status === "closed" ? <Notice tone="success">{w.closedNotice}</Notice> : null}

      {comparability ? (
        <Tile>
          <TileTitle trailing={<span className={`text-[20px] font-black ${comparability.comparability.percent < 100 ? "text-warning-text" : "text-success"}`}>{comparability.comparability.percent}%</span>}>
            {fmt(w.comparability, { wave: comparability.baseline.code })}
          </TileTitle>
          {comparability.comparability.affectedMetricIds.length ? (
            <Notice tone="warning" className="mb-3">
              {fmt(w.notComparableWarning, { n: comparability.comparability.affectedMetricIds.length, wave: comparability.baseline.code })}
            </Notice>
          ) : null}
          {comparability.comparability.diff.added.length + comparability.comparability.diff.removed.length + comparability.comparability.diff.modified.length === 0 ? (
            <p className="text-[13px] text-text-muted">{w.noDiff}</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <DiffList title={w.diffRemoved} items={comparability.comparability.diff.removed.map((q) => lt(q.text, locale))} tone="danger" />
              <DiffList title={w.diffAdded} items={comparability.comparability.diff.added.map((q) => lt(q.text, locale))} tone="success" />
              <DiffList title={w.diffModified} items={comparability.comparability.diff.modified.map((m) => lt(m.after.text, locale))} tone="warning" />
              <DiffList title={w.diffMetrics} items={comparability.comparability.metrics.filter((m) => m.level !== "full").map((m) => `${m.metricId} · ${m.sharedItems}/${m.baselineItems}`)} tone="warning" />
            </div>
          )}
        </Tile>
      ) : null}

      {canManage && wave.status !== "draft" ? (
        <div className="flex flex-wrap gap-4">
          <Tile className="flex-[2_1_420px]">
            <TileTitle>{w.monitoring}</TileTitle>
            {monitoring ? (
              <>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                  <Kpi label={w.invited} value={monitoring.invited} />
                  <Kpi label={w.started} value={monitoring.started} />
                  <Kpi label={w.completed} value={monitoring.completed} />
                  <Kpi label={w.completionRate} value={monitoring.completionRate == null ? "—" : formatPercent(monitoring.completionRate, locale)} />
                  <Kpi label={w.medianTime} value={monitoring.medianCompletionMinutes == null ? "—" : `${monitoring.medianCompletionMinutes}′`} />
                </div>
                {monitoring.perDay.length ? (
                  <div className="mt-6">
                    <p className="mb-2 text-[13px] font-semibold">{w.perDay}</p>
                    <ol className="flex h-28 items-end gap-1" aria-label={w.perDay}>
                      {monitoring.perDay.map((d) => (
                        <li key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${d.day}: ${d.completed}`}>
                          <span className="w-full rounded-t-[6px] bg-ink" style={{ height: `${Math.max(4, (d.completed / maxPerDay) * 90)}px` }} aria-hidden="true" />
                          <span className="text-[10px] text-text-muted" dir="ltr">{d.day.slice(5)}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}
                {monitoring.bySegment.length ? (
                  <div className="mt-6">
                    <p className="mb-2 text-[13px] font-semibold">{w.bySegment}</p>
                    <ul className="flex flex-col gap-1.5">
                      {monitoring.bySegment.map((s) => (
                        <li key={s.segment}>
                          {s.suppressed ? (
                            <PrivacyProtected locale={locale} compact threshold={workspace.client.privacyThreshold} />
                          ) : (
                            <InnerRow className="flex items-center justify-between text-[13px]"><span>{s.segment}</span><strong>{s.completed}</strong></InnerRow>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : null}
          </Tile>
          <Tile className="flex-[1_1_320px]">
            {wave.distributionMode === "public_link" && wave.publicToken ? (
              <>
                <TileTitle>{w.surveyLink}</TileTitle>
                <p className="mb-2 text-[12px] text-text-muted">{w.surveyLinkHelp}</p>
                <CopyField value={surveyUrl(wave.publicToken)} copyLabel={t.common.copy} copiedLabel={t.common.copied} />
                <LinkButton href={`/survey/${wave.publicToken}`} variant="secondary" size="sm" className="mt-3">{w.openSurvey}</LinkButton>
              </>
            ) : wave.distributionMode === "unique_tokens" ? (
              <>
                <TileTitle>{w.tokens}</TileTitle>
                {wave.status !== "closed" ? <TokensForm t={t} locale={locale} clientId={clientId} projectId={projectId} waveId={waveId} /> : null}
              </>
            ) : null}
          </Tile>
        </div>
      ) : null}

      {canManage && wave.status !== "closed" ? (
        <Tile>
          <TileTitle>{t.common.edit}</TileTitle>
          <WaveForm
            t={t}
            locale={locale}
            clientId={clientId}
            projectId={projectId}
            type={wave.type}
            departments={workspace.client.segmentTaxonomy.departments}
            versions={qState?.versions.map((v) => ({ id: v.id, label: v.versionLabel, locked: Boolean(v.lockedAt) })) ?? []}
            previousWaveCode={null}
            defaultLocale={workspace.client.locale}
            wave={wave}
          />
        </Tile>
      ) : null}
    </>
  );
}

function DiffList({ title, items, tone }: { title: string; items: string[]; tone: "danger" | "success" | "warning" }) {
  const color = tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "text-warning-text";
  return (
    <div>
      <p className={`mb-1 text-[13px] font-bold ${color}`}>
        {title} · {items.length}
      </p>
      {items.length ? (
        <ul className="flex flex-col gap-1 text-[12px]">
          {items.map((item, i) => (
            <li key={i} className="rounded-[10px] bg-sunken px-3 py-1.5">{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-[12px] text-text-muted">—</p>
      )}
    </div>
  );
}

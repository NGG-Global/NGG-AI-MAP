import Link from "next/link";
import { nggPage } from "@/server/ui/page";
import { loadClientWorkspace } from "@/server/ui/workspace";
import { canProject } from "@/domain/authz/policy";
import { listWaves } from "@/server/services/waves";
import { getQuestionnaireState } from "@/server/services/questionnaires";
import { ClientWorkspaceHeader } from "@/components/ngg/ClientWorkspaceHeader";
import { Tile, TileTitle, InnerRow } from "@/components/ui/Tile";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { StatusPill, type PillTone } from "@/components/ui/StatusPill";
import { Notice } from "@/components/ui/Notice";
import { NextStepCard } from "@/components/ngg/NextStepCard";
import { formatDate, formatPercent } from "@/lib/format";
import type { WaveStatus } from "@/domain/shared/enums";

export const dynamic = "force-dynamic";

const tone: Record<WaveStatus, PillTone> = { draft: "neutral", scheduled: "info", open: "success", closed: "neutral" };

export default async function WavesPage({ params }: PageProps<"/ngg/clients/[clientId]/projects/[projectId]/waves">) {
  const { clientId, projectId } = await params;
  const { ctx, t, locale } = await nggPage();
  const workspace = await loadClientWorkspace(ctx, clientId, projectId);
  const canManage = canProject(ctx.actor, "wave.manage", { clientId, projectId });
  const [waveList, qState] = await Promise.all([listWaves(ctx, projectId), getQuestionnaireState(ctx, projectId)]);
  const w = t.waves;
  const base = `/ngg/clients/${clientId}/projects/${projectId}/waves`;
  const inProgress = waveList.some((x) => x.status !== "closed");
  const hasBaseline = waveList.some((x) => x.type === "baseline");
  return (
    <>
      <ClientWorkspaceHeader workspace={workspace} active="waves" t={t} locale={locale} canManage={canManage} />
      <NextStepCard step={workspace.nextStep} projectBase={`/ngg/clients/${clientId}/projects/${projectId}`} currentPage="waves" completed={workspace.summary?.currentCompleted ?? 0} canAct={canManage} t={t} locale={locale} />
      <Tile>
        <TileTitle
          trailing={
            canManage && qState && !inProgress ? (
              <LinkButton href={`${base}/new?type=${hasBaseline ? "follow_up" : "baseline"}`} variant="cta" size="sm">
                {hasBaseline ? w.newFollowUp : w.newBaseline}
              </LinkButton>
            ) : undefined
          }
        >
          {w.title}
        </TileTitle>
        <p className="mb-4 text-[13px] text-text-muted">{w.subtitle}</p>
        {!qState ? (
          <Notice tone="info">
            {w.needQuestionnaire}{" "}
            <Link href={`/ngg/clients/${clientId}/projects/${projectId}/assessment`} className="font-semibold">
              {t.nextStep.build_questionnaire.cta} ←
            </Link>
          </Notice>
        ) : null}
        {waveList.length === 0 ? (
          <EmptyState title={w.noWaves} />
        ) : (
          <ol className="flex flex-col gap-2">
            {waveList.map((wave) => (
              <InnerRow as="li" key={wave.id} className="grid grid-cols-1 items-center gap-3 md:grid-cols-[0.5fr_2fr_1fr_1fr_1fr_1fr]">
                <span className="text-[22px] font-black">{wave.code}</span>
                <div className="min-w-0">
                  <Link href={`${base}/${wave.id}`} className="text-[14px] font-bold text-ink no-underline hover:text-accent-text">
                    {wave.name}
                  </Link>
                  <p className="text-[12px] text-text-muted">
                    {w[wave.type]} · {w.questionnaireVersion} {wave.version?.versionLabel ?? "—"}
                    {wave.version?.lockedAt ? ` · ${w.snapshot}` : ""}
                  </p>
                </div>
                <StatusPill tone={tone[wave.status]}>{t.waveStatus[wave.status]}</StatusPill>
                <span className="text-[12px] text-text-muted">
                  {formatDate(wave.startAt, locale)} – {formatDate(wave.endAt, locale)}
                </span>
                <span className="text-[13px]">
                  <strong>{wave.counts.completed}</strong> / {wave.invitedCount || wave.counts.total || "—"}
                </span>
                <span className="text-[15px] font-extrabold">{wave.responseRate == null ? "—" : formatPercent(wave.responseRate, locale)}</span>
              </InnerRow>
            ))}
          </ol>
        )}
      </Tile>
    </>
  );
}

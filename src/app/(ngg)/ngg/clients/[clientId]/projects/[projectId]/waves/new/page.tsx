import { notFound } from "next/navigation";
import { nggPage } from "@/server/ui/page";
import { loadClientWorkspace } from "@/server/ui/workspace";
import { canProject } from "@/domain/authz/policy";
import { getQuestionnaireState } from "@/server/services/questionnaires";
import { getLatestWave } from "@/server/services/waves";
import { ClientWorkspaceHeader } from "@/components/ngg/ClientWorkspaceHeader";
import { Tile, TileTitle } from "@/components/ui/Tile";
import { Notice } from "@/components/ui/Notice";
import { WaveForm } from "./WaveForm";
import { NextStepCard } from "@/components/ngg/NextStepCard";
import { LinkButton } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function NewWavePage({ params, searchParams }: PageProps<"/ngg/clients/[clientId]/projects/[projectId]/waves/new">) {
  const { clientId, projectId } = await params;
  const sp = await searchParams;
  const { ctx, t, locale } = await nggPage();
  const workspace = await loadClientWorkspace(ctx, clientId, projectId);
  if (!canProject(ctx.actor, "wave.manage", { clientId, projectId })) notFound();
  const [qState, latest] = await Promise.all([getQuestionnaireState(ctx, projectId), getLatestWave(ctx, projectId)]);
  const type = sp.type === "follow_up" || latest ? "follow_up" : "baseline";
  // Only one wave can be in progress; send the user to it instead of a form that will be refused.
  const activeWave = workspace.summary?.waves.find((w) => w.status !== "closed") ?? null;
  return (
    <>
      <ClientWorkspaceHeader workspace={workspace} active="waves" t={t} locale={locale} canManage />
      <NextStepCard step={workspace.nextStep} projectBase={`/ngg/clients/${clientId}/projects/${projectId}`} currentPage="wave_new" completed={workspace.summary?.currentCompleted ?? 0} canAct t={t} locale={locale} />
      <Tile padding="hero">
        <TileTitle>{type === "baseline" ? t.waves.newBaseline : t.waves.newFollowUp}</TileTitle>
        {!qState ? (
          <Notice tone="warning">
            <span className="flex flex-wrap items-center gap-3">
              {t.waves.needQuestionnaire}
              <LinkButton href={`/ngg/clients/${clientId}/projects/${projectId}/assessment`} variant="primary" size="sm">
                {t.nextStep.build_questionnaire.cta}
              </LinkButton>
            </span>
          </Notice>
        ) : activeWave ? (
          <Notice tone="info">
            <span className="flex flex-wrap items-center gap-3">
              {t.waves.waveInProgress}
              <LinkButton href={`/ngg/clients/${clientId}/projects/${projectId}/waves/${activeWave.id}`} variant="primary" size="sm">
                {activeWave.code}
              </LinkButton>
            </span>
          </Notice>
        ) : (
          <WaveForm
            t={t}
            locale={locale}
            clientId={clientId}
            projectId={projectId}
            type={type}
            departments={workspace.client.segmentTaxonomy.departments}
            versions={qState.versions.map((v) => ({ id: v.id, label: v.versionLabel, locked: Boolean(v.lockedAt) }))}
            previousWaveCode={latest?.code ?? null}
            defaultLocale={workspace.client.locale}
          />
        )}
      </Tile>
    </>
  );
}

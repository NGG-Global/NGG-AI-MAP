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

export const dynamic = "force-dynamic";

export default async function NewWavePage({ params, searchParams }: PageProps<"/ngg/clients/[clientId]/projects/[projectId]/waves/new">) {
  const { clientId, projectId } = await params;
  const sp = await searchParams;
  const { ctx, t, locale } = await nggPage();
  const workspace = await loadClientWorkspace(ctx, clientId, projectId);
  if (!canProject(ctx.actor, "wave.manage", { clientId, projectId })) notFound();
  const [qState, latest] = await Promise.all([getQuestionnaireState(ctx, projectId), getLatestWave(ctx, projectId)]);
  const type = sp.type === "follow_up" || latest ? "follow_up" : "baseline";
  return (
    <>
      <ClientWorkspaceHeader workspace={workspace} active="waves" t={t} locale={locale} canManage />
      <Tile padding="hero">
        <TileTitle>{type === "baseline" ? t.waves.newBaseline : t.waves.newFollowUp}</TileTitle>
        {!qState ? (
          <Notice tone="warning">{t.waves.needQuestionnaire}</Notice>
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

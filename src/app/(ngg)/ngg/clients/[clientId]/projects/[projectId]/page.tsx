import { nggPage } from "@/server/ui/page";
import { loadClientWorkspace } from "@/server/ui/workspace";
import { listNggUsers } from "@/server/services/users";
import { listProjectTeam } from "@/server/services/projects";
import { canProject } from "@/domain/authz/policy";
import { ClientWorkspaceHeader } from "@/components/ngg/ClientWorkspaceHeader";
import { Tile, TileTitle, InnerRow } from "@/components/ui/Tile";
import { Kpi } from "@/components/ui/Kpi";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton, Button } from "@/components/ui/Button";
import { ProjectForm } from "../../ProjectForm";
import { assignUserAction } from "../../actions";
import { formatDate, formatPercent } from "@/lib/format";
import { ProjectJourney } from "@/components/ngg/ProjectJourney";
import { ProjectResultsPreview } from "@/components/ngg/ProjectResultsPreview";

export const dynamic = "force-dynamic";

export default async function ProjectOverviewPage({ params }: PageProps<"/ngg/clients/[clientId]/projects/[projectId]">) {
  const { clientId, projectId } = await params;
  const { ctx, t, locale } = await nggPage();
  const workspace = await loadClientWorkspace(ctx, clientId, projectId);
  const project = workspace.project!;
  const summary = workspace.summary!;
  const canManage = canProject(ctx.actor, "project.update", { clientId, projectId });
  const [team, nggUsers] = await Promise.all([listProjectTeam(ctx, projectId), ctx.actor.role === "super_admin" || canManage ? listNggUsers(ctx) : Promise.resolve([])]);
  const manager = nggUsers.find((u) => u.id === project.managerUserId) ?? team.find((m) => m.userId === project.managerUserId);
  const current = summary.currentWave;
  const rate = current && current.invitedCount > 0 ? Math.round((summary.currentCompleted / current.invitedCount) * 100) : null;
  const base = `/ngg/clients/${clientId}/projects/${projectId}`;

  return (
    <>
      <ClientWorkspaceHeader workspace={workspace} active="overview" t={t} locale={locale} managerName={manager?.name} canManage={canManage} />

      {summary.waves.length === 0 ? (
        <Tile>
          <EmptyState title={t.clients.emptyTitle} body={t.clients.emptyBody} action={<LinkButton href={`${base}/assessment`} variant="cta">{t.clients.emptyCta}</LinkButton>} />
        </Tile>
      ) : (
        <div className="flex flex-wrap gap-4">
          <Tile tone="ink" className="flex flex-[1_1_220px] flex-col justify-between gap-4">
            <TileTitle className="mb-0">{t.projects.currentWave}</TileTitle>
            <div>
              <span className="text-[56px] font-black leading-none">{current?.code ?? "—"}</span>
              <p className="mt-2 text-[12px] text-on-dark-muted">
                {current ? `${t.waveStatus[current.status]}${current.closedAt ? ` · ${formatDate(current.closedAt, locale)}` : current.endAt ? ` · ${formatDate(current.endAt, locale)}` : ""}` : t.projects.noWave}
              </p>
            </div>
          </Tile>
          <Tile className="flex flex-[1_1_220px] flex-col justify-between gap-4">
            <TileTitle className="mb-0">{t.projects.responseRate}</TileTitle>
            <Kpi label="" value={rate == null ? "—" : formatPercent(rate, locale)} meta={current ? `${summary.currentCompleted} ${t.common.of} ${current.invitedCount || "—"} · ${summary.currentManagers} ${t.common.managers}` : undefined} />
          </Tile>
          <Tile className="flex flex-[1_1_220px] flex-col justify-between gap-4">
            <TileTitle className="mb-0">{t.projects.lastMeasurement}</TileTitle>
            <Kpi label="" value={summary.lastClosedWave?.code ?? "—"} meta={summary.lastClosedWave ? formatDate(summary.lastClosedWave.closedAt, locale) : undefined} />
          </Tile>
          <Tile className="flex flex-[1_1_220px] flex-col justify-between gap-4">
            <TileTitle className="mb-0">{t.projects.nextMeasurement}</TileTitle>
            <Kpi label="" value={project.nextFollowUpAt ? formatDate(project.nextFollowUpAt, locale, { month: "short", year: "numeric" }) : t.common.notSet} />
          </Tile>
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        <Tile className="flex-[1_1_320px]">
          <TileTitle trailing={<span className="text-[12px] text-text-muted">{t.projects.journeySubtitle}</span>}>{t.projects.journey}</TileTitle>
          <ProjectJourney waves={summary.waves} locale={locale} t={t} />
        </Tile>
        <ProjectResultsPreview ctx={ctx} projectId={projectId} clientId={clientId} t={t} locale={locale} className="flex-[2_1_420px]" />
      </div>

      {canManage ? (
        <div className="flex flex-wrap gap-4">
          <Tile className="flex-[2_1_420px]">
            <TileTitle>{t.projects.projectSettings}</TileTitle>
            <ProjectForm t={t} locale={locale} clientId={clientId} project={project} managers={nggUsers.filter((u) => u.nggRole !== "analyst").map((u) => ({ id: u.id, name: u.name }))} />
          </Tile>
          <Tile className="flex-[1_1_300px]">
            <TileTitle>{t.projects.team}</TileTitle>
            <ul className="flex flex-col gap-2">
              {team.map((member) => (
                <InnerRow as="li" key={member.userId} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold">{member.name}</p>
                    <p className="text-[12px] text-text-muted">{member.nggRole ? t.roles[member.nggRole] : ""}</p>
                  </div>
                  {member.userId !== project.managerUserId ? (
                    <form action={assignUserAction}>
                      <input type="hidden" name="clientId" value={clientId} />
                      <input type="hidden" name="projectId" value={projectId} />
                      <input type="hidden" name="userId" value={member.userId} />
                      <input type="hidden" name="mode" value="remove" />
                      <Button type="submit" variant="ghost" size="sm">{t.common.remove}</Button>
                    </form>
                  ) : null}
                </InnerRow>
              ))}
            </ul>
            {nggUsers.filter((u) => !team.some((m) => m.userId === u.id)).length ? (
              <form action={assignUserAction} className="mt-4 flex items-end gap-2">
                <input type="hidden" name="clientId" value={clientId} />
                <input type="hidden" name="projectId" value={projectId} />
                <label className="flex-1 text-[13px] font-semibold text-ink-2">
                  {t.projects.assignUser}
                  <select name="userId" className="mt-1.5 w-full rounded-[14px] border border-line bg-surface px-3 py-2.5 text-[14px] font-normal">
                    {nggUsers.filter((u) => !team.some((m) => m.userId === u.id)).map((u) => (
                      <option key={u.id} value={u.id}>{u.name} · {u.nggRole ? t.roles[u.nggRole] : ""}</option>
                    ))}
                  </select>
                </label>
                <Button type="submit" variant="secondary">{t.common.add}</Button>
              </form>
            ) : null}
          </Tile>
        </div>
      ) : null}
    </>
  );
}

import Link from "next/link";
import { nggPage } from "@/server/ui/page";
import { loadClientWorkspace } from "@/server/ui/workspace";
import { canProject } from "@/domain/authz/policy";
import { listProjectInsights } from "@/server/services/insights";
import { listComputedWaves } from "@/server/services/results";
import { loadMetricConfigs } from "@/server/services/library";
import { ClientWorkspaceHeader } from "@/components/ngg/ClientWorkspaceHeader";
import { Tile, TileTitle, InnerRow } from "@/components/ui/Tile";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { InsightBadge } from "@/components/insights/InsightView";
import { GenerateForm } from "./GenerateForm";
import { lt } from "@/domain/shared/localized";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InsightsPage({ params }: PageProps<"/ngg/clients/[clientId]/projects/[projectId]/insights">) {
  const { clientId, projectId } = await params;
  const { ctx, t, locale } = await nggPage();
  const workspace = await loadClientWorkspace(ctx, clientId, projectId);
  const canGenerate = canProject(ctx.actor, "insight.generate", { clientId, projectId });
  const [list, computedWaves, metrics] = await Promise.all([listProjectInsights(ctx, projectId), listComputedWaves(ctx, projectId), loadMetricConfigs(ctx.db)]);
  const i = t.insights;
  const base = `/ngg/clients/${clientId}/projects/${projectId}/insights`;
  const waveCode = (id: string | null) => workspace.summary?.waves.find((w) => w.id === id)?.code ?? "—";
  return (
    <>
      <ClientWorkspaceHeader workspace={workspace} active="insights" t={t} locale={locale} canManage={canGenerate} />
      {canGenerate ? (
        <Tile>
          <TileTitle>{i.generate}</TileTitle>
          <p className="mb-3 text-[12px] text-text-muted">{i.subtitle}</p>
          {computedWaves.length ? (
            <GenerateForm t={t} locale={locale} clientId={clientId} projectId={projectId} waves={computedWaves.map((w) => ({ id: w.id, code: w.code }))} metrics={metrics.filter((m) => m.group !== "manager_team_pair").map((m) => ({ id: m.id, name: lt(m.name, locale) }))} />
          ) : (
            <Notice tone="info">{i.noWave}</Notice>
          )}
        </Tile>
      ) : null}
      <Tile>
        <TileTitle trailing={<span className="text-[12px] text-text-muted">{list.length}</span>}>{i.title}</TileTitle>
        {list.length === 0 ? (
          <EmptyState title={i.none} />
        ) : (
          <ul className="flex flex-col gap-2">
            {list.map((insight) => (
              <InnerRow as="li" key={insight.id} className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <Link href={`${base}/${insight.id}`} className="text-[14px] font-bold text-ink no-underline hover:text-accent-text">
                    {i[insight.type]} · {waveCode(insight.waveId)}
                  </Link>
                  <p className="text-[12px] text-text-muted">{formatDateTime(insight.createdAt, locale)} · {insight.provider}{insight.model ? ` · ${insight.model}` : ""}</p>
                </div>
                {insight.validationWarnings.length ? <span className="text-[12px] text-warning-text">! {insight.validationWarnings.length}</span> : null}
                <InsightBadge status={insight.status} t={t} />
              </InnerRow>
            ))}
          </ul>
        )}
      </Tile>
    </>
  );
}

import Link from "next/link";
import { nggPage } from "@/server/ui/page";
import { listReviewQueue } from "@/server/services/insights";
import { listClients } from "@/server/services/clients";
import { listVisibleProjects } from "@/server/services/access";
import { TopBar } from "@/components/shell/TopBar";
import { Headline } from "@/components/ui/Headline";
import { Tile, InnerRow } from "@/components/ui/Tile";
import { EmptyState } from "@/components/ui/EmptyState";
import { InsightBadge } from "@/components/insights/InsightView";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InsightsQueuePage() {
  const { ctx, t, locale } = await nggPage();
  const [queue, clientList, projectList] = await Promise.all([listReviewQueue(ctx), listClients(ctx), listVisibleProjects(ctx)]);
  return (
    <>
      <TopBar crumbs={[{ label: "NGG", href: "/ngg" }, { label: t.nav.insights }]} ariaLabel={t.nav.breadcrumb} />
      <Tile padding="hero"><Headline eyebrow={t.insights.subtitle}>{t.insights.queue}</Headline></Tile>
      <Tile>
        {queue.length === 0 ? (
          <EmptyState title={t.insights.queueEmpty} />
        ) : (
          <ul className="flex flex-col gap-2">
            {queue.map((insight) => {
              const project = projectList.find((p) => p.id === insight.projectId);
              const client = clientList.find((c) => c.id === project?.clientId);
              return (
                <InnerRow as="li" key={insight.id} className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/ngg/clients/${client?.id}/projects/${insight.projectId}/insights/${insight.id}`} className="text-[14px] font-bold text-ink no-underline hover:text-accent-text">
                      {client?.name ?? "—"} · {t.insights[insight.type]}
                    </Link>
                    <p className="text-[12px] text-text-muted">{project?.name} · {formatDateTime(insight.createdAt, locale)}</p>
                  </div>
                  <InsightBadge status={insight.status} t={t} />
                </InnerRow>
              );
            })}
          </ul>
        )}
      </Tile>
    </>
  );
}

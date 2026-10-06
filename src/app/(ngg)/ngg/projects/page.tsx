import Link from "next/link";
import { nggPage } from "@/server/ui/page";
import { getPortfolioOverview } from "@/server/services/portfolio";
import { TopBar } from "@/components/shell/TopBar";
import { Headline } from "@/components/ui/Headline";
import { Tile, InnerRow } from "@/components/ui/Tile";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const { ctx, t, locale } = await nggPage();
  const overview = await getPortfolioOverview(ctx);
  return (
    <>
      <TopBar crumbs={[{ label: "NGG", href: "/ngg" }, { label: t.nav.projects }]} ariaLabel={t.nav.breadcrumb} />
      <Tile padding="hero">
        <Headline>{t.projects.title}</Headline>
      </Tile>
      <Tile>
        {overview.rows.length === 0 ? (
          <EmptyState title={t.portfolio.noClients} />
        ) : (
          <ul className="flex flex-col gap-2">
            {overview.rows.map((row) => (
              <InnerRow as="li" key={row.project.id} className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/ngg/clients/${row.client.id}/projects/${row.project.id}`} className="text-[14px] font-bold text-ink no-underline hover:text-accent-text">
                    {row.project.name}
                  </Link>
                  <p className="text-[12px] text-text-muted">
                    {row.client.name}
                    {row.managerName ? ` · ${row.managerName}` : ""}
                  </p>
                </div>
                <StatusPill tone="neutral">{t.projectStatus[row.project.status]}</StatusPill>
                <span className="w-16 text-[13px] font-bold">{row.currentWave?.code ?? "—"}</span>
                <span className="w-16 text-[13px] font-bold">{row.responseRate == null ? "—" : formatPercent(row.responseRate, locale)}</span>
              </InnerRow>
            ))}
          </ul>
        )}
      </Tile>
    </>
  );
}

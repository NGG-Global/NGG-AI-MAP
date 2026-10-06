import Link from "next/link";
import { inArray } from "drizzle-orm";
import { nggPage } from "@/server/ui/page";
import { listVisibleProjects } from "@/server/services/access";
import { listClients } from "@/server/services/clients";
import { goals } from "@/server/db/schema";
import { TopBar } from "@/components/shell/TopBar";
import { Headline } from "@/components/ui/Headline";
import { Tile, InnerRow } from "@/components/ui/Tile";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusPill } from "@/components/ui/StatusPill";
import { goalTone } from "@/components/goals/GoalCard";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function GoalsOverviewPage() {
  const { ctx, t, locale } = await nggPage();
  const [projectList, clientList] = await Promise.all([listVisibleProjects(ctx), listClients(ctx)]);
  const rows = projectList.length ? await ctx.db.select().from(goals).where(inArray(goals.projectId, projectList.map((p) => p.id))).orderBy(goals.dueDate) : [];
  const open = rows.filter((g) => g.status !== "archived" && g.status !== "completed");
  return (
    <>
      <TopBar crumbs={[{ label: "NGG", href: "/ngg" }, { label: t.nav.goals }]} ariaLabel={t.nav.breadcrumb} />
      <Tile padding="hero"><Headline eyebrow={t.goals.subtitle}>{t.goals.title}</Headline></Tile>
      <Tile>
        {open.length === 0 ? (
          <EmptyState title={t.goals.none} />
        ) : (
          <ul className="flex flex-col gap-2">
            {open.map((goal) => {
              const project = projectList.find((p) => p.id === goal.projectId);
              const client = clientList.find((c) => c.id === project?.clientId);
              return (
                <InnerRow as="li" key={goal.id} className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/ngg/clients/${client?.id}/projects/${goal.projectId}/goals`} className="text-[14px] font-bold text-ink no-underline hover:text-accent-text">{goal.title}</Link>
                    <p className="text-[12px] text-text-muted">{client?.name} · {goal.ownerName ?? "—"}{goal.dueDate ? ` · ${formatDate(goal.dueDate, locale)}` : ""}</p>
                  </div>
                  <StatusPill tone={goal.approvalState === "pending" ? "warning" : goalTone[goal.status]}>{goal.approvalState === "pending" ? t.goals.approvals.pending : t.goals.statuses[goal.status]}</StatusPill>
                </InnerRow>
              );
            })}
          </ul>
        )}
      </Tile>
    </>
  );
}

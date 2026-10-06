import { and, count, eq, inArray } from "drizzle-orm";
import { nggPage } from "@/server/ui/page";
import { NggShell } from "@/components/shell/NggShell";
import { insights } from "@/server/db/schema";
import { listClients } from "@/server/services/clients";
import { listVisibleProjects } from "@/server/services/access";

export default async function NggLayout({ children }: LayoutProps<"/ngg">) {
  const { ctx, t, locale, dir } = await nggPage();
  const [clientList, visibleProjects] = await Promise.all([listClients(ctx), listVisibleProjects(ctx)]);
  const projectIds = visibleProjects.map((p) => p.id);
  const pending = projectIds.length
    ? Number((await ctx.db.select({ n: count() }).from(insights).where(and(inArray(insights.projectId, projectIds), eq(insights.status, "draft"))))[0]?.n ?? 0)
    : 0;
  return (
    <NggShell
      t={t}
      locale={locale}
      dir={dir}
      userName={ctx.user.name}
      roleLabel={t.roles[ctx.actor.role]}
      isSuperAdmin={ctx.actor.role === "super_admin"}
      clientCount={clientList.length}
      pendingInsights={pending}
    >
      {children}
    </NggShell>
  );
}

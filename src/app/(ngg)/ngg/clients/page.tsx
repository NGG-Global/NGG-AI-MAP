import Link from "next/link";
import { nggPage } from "@/server/ui/page";
import { listClients } from "@/server/services/clients";
import { listVisibleProjects } from "@/server/services/access";
import { TopBar } from "@/components/shell/TopBar";
import { Headline } from "@/components/ui/Headline";
import { Tile, InnerRow } from "@/components/ui/Tile";
import { LinkButton } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icons } from "@/components/shell/icons";
import { fmt } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const { ctx, t } = await nggPage();
  const [clientList, projectList] = await Promise.all([listClients(ctx), listVisibleProjects(ctx)]);
  return (
    <>
      <TopBar crumbs={[{ label: "NGG", href: "/ngg" }, { label: t.nav.clients }]} ariaLabel={t.nav.breadcrumb} />
      <Tile padding="hero">
        <Headline
          eyebrow={fmt(t.clients.subtitle, { n: clientList.length })}
          actions={ctx.actor.role !== "analyst" ? <LinkButton href="/ngg/clients/new" variant="cta"><Icons.plus /> {t.clients.newClient}</LinkButton> : null}
        >
          {t.clients.title}
        </Headline>
      </Tile>
      <Tile>
        {clientList.length === 0 ? (
          <EmptyState title={t.portfolio.noClients} />
        ) : (
          <ul className="flex flex-col gap-2">
            {clientList.map((client) => {
              const projectsOfClient = projectList.filter((p) => p.clientId === client.id);
              return (
                <InnerRow as="li" key={client.id} className="flex flex-wrap items-center gap-4">
                  <Avatar text={client.branding.logoText ?? client.name} color={client.branding.primaryColor} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/ngg/clients/${client.id}`} className="text-[15px] font-bold text-ink no-underline hover:text-accent-text">
                      {client.name}
                    </Link>
                    <p className="text-[12px] text-text-muted">
                      {[client.industry, client.organizationSize ? `${client.organizationSize} ${t.clients.employees}` : null].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <span className="text-[13px] text-text-muted">
                    {projectsOfClient.length} {t.clients.projects}
                  </span>
                  <StatusPill tone={client.status === "active" ? "success" : "neutral"}>{client.status === "active" ? t.clients.active : t.clients.archived}</StatusPill>
                </InnerRow>
              );
            })}
          </ul>
        )}
      </Tile>
    </>
  );
}

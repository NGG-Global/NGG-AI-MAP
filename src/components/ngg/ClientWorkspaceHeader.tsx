import Link from "next/link";
import { Tile } from "@/components/ui/Tile";
import { Avatar } from "@/components/ui/Avatar";
import { StatusPill, type PillTone } from "@/components/ui/StatusPill";
import { LinkButton } from "@/components/ui/Button";
import { TopBar } from "@/components/shell/TopBar";
import { formatMonth } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/domain/shared/enums";
import type { ClientWorkspace } from "@/server/ui/workspace";

export type ClientTab = "overview" | "assessment" | "waves" | "results" | "insights" | "goals" | "access" | "settings";

export function ClientWorkspaceHeader({
  workspace,
  active,
  t,
  locale,
  managerName,
}: {
  workspace: ClientWorkspace;
  active: ClientTab;
  t: Dictionary;
  locale: Locale;
  managerName?: string | null;
  canManage?: boolean;
}) {
  const { client, project, summary } = workspace;
  const clientBase = `/ngg/clients/${client.id}`;
  const projectBase = project ? `${clientBase}/projects/${project.id}` : null;
  const tabs: Array<{ key: ClientTab; label: string; href: string | null }> = [
    { key: "overview", label: t.clientTabs.overview, href: projectBase ?? clientBase },
    { key: "assessment", label: t.clientTabs.assessment, href: projectBase ? `${projectBase}/assessment` : null },
    { key: "waves", label: t.clientTabs.waves, href: projectBase ? `${projectBase}/waves` : null },
    { key: "results", label: t.clientTabs.results, href: projectBase ? `${projectBase}/results` : null },
    { key: "insights", label: t.clientTabs.insights, href: projectBase ? `${projectBase}/insights` : null },
    { key: "goals", label: t.clientTabs.goals, href: projectBase ? `${projectBase}/goals` : null },
    { key: "access", label: t.clientTabs.access, href: `${clientBase}/access${project ? `?project=${project.id}` : ""}` },
    { key: "settings", label: t.clientTabs.settings, href: `${clientBase}/settings${project ? `?project=${project.id}` : ""}` },
  ];
  const currentWave = summary?.currentWave ?? null;
  const statusTone: PillTone = currentWave?.status === "open" ? "success" : currentWave?.status === "closed" ? "neutral" : "info";
  const meta = [
    client.industry,
    client.organizationSize ? `${client.organizationSize.toLocaleString(locale === "he" ? "he-IL" : "en-GB")} ${t.clients.employees}` : null,
    managerName ? `${t.clients.managedBy}: ${managerName}` : null,
    project ? `${t.clients.activeSince} ${formatMonth(project.createdAt, locale)}` : null,
  ].filter(Boolean);

  return (
    <>
      <TopBar
        crumbs={[{ label: "NGG", href: "/ngg" }, { label: client.name, href: clientBase }, ...(project ? [{ label: project.name }] : [])]}
        ariaLabel={t.nav.breadcrumb}
        actions={
          project ? (
            <>
              <LinkButton href={`/dashboard/${project.id}/overview?preview=1`} variant="secondary" size="sm">
                {t.clients.viewAsClient}
              </LinkButton>
            </>
          ) : null
        }
      />
      <Tile padding="hero" className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar text={client.branding.logoText ?? client.name} color={client.branding.primaryColor} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[32px] font-extrabold leading-none tracking-tight md:text-[40px]">{client.name}</h1>
              {currentWave ? (
                <StatusPill tone={statusTone}>
                  {currentWave.code} · {t.waveStatus[currentWave.status]}
                </StatusPill>
              ) : project ? (
                <StatusPill tone="neutral">{t.projectStatus[project.status]}</StatusPill>
              ) : null}
            </div>
            {meta.length ? <p className="mt-1 text-[13px] text-text-muted">{meta.join(" · ")}</p> : null}
          </div>
        </div>
        {workspace.projects.length > 1 && project ? (
          <nav aria-label={t.nav.projects} className="flex flex-wrap gap-2 text-[13px]">
            {workspace.projects.map((p) => (
              <Link
                key={p.id}
                href={`${clientBase}/projects/${p.id}`}
                className={cn("rounded-full px-3 py-1 font-semibold no-underline", p.id === project.id ? "bg-accent-soft text-accent-deep" : "bg-muted text-ink-2")}
              >
                {p.name}
              </Link>
            ))}
          </nav>
        ) : null}
        <nav aria-label={t.clients.overview} className="flex flex-wrap gap-1 rounded-full bg-muted p-1">
          {tabs.map((tab) => {
            const cls = cn(
              "inline-flex h-10 items-center rounded-full px-4 text-[13px] font-semibold no-underline",
              tab.key === active ? "bg-ink text-white" : tab.href ? "text-ink-2 hover:bg-line" : "cursor-not-allowed text-text-muted/60",
            );
            return tab.href ? (
              <Link key={tab.key} href={tab.href} className={cls} aria-current={tab.key === active ? "page" : undefined}>
                {tab.label}
              </Link>
            ) : (
              <span key={tab.key} className={cls} aria-disabled="true">
                {tab.label}
              </span>
            );
          })}
        </nav>
      </Tile>
    </>
  );
}

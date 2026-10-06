import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import { logoutAction } from "@/app/login/actions";
import { fmt, type Dictionary } from "@/lib/i18n";
import type { Locale } from "@/domain/shared/enums";
import type { Client, Project } from "@/server/db/schema";

export type ClientNavKey = keyof Dictionary["client"]["nav"];

/** Client executive shell: no sidebar, floating capsule navigation, max width 1320px (design §2). */
export function ClientShell({
  client,
  project,
  projects,
  active,
  t,
  locale,
  dir,
  isNggPreview,
  userName,
  children,
  headerExtra,
}: {
  client: Client;
  project: Project;
  projects: Project[];
  active: ClientNavKey;
  t: Dictionary;
  locale: Locale;
  dir: "rtl" | "ltr";
  isNggPreview: boolean;
  userName: string;
  children: ReactNode;
  headerExtra?: ReactNode;
}) {
  const nav: ClientNavKey[] = ["overview", "adoption", "management", "organization", "trends", "goals", "methodology"];
  const base = `/dashboard/${project.id}`;
  return (
    <div dir={dir} lang={locale} className="mx-auto flex min-h-screen w-full max-w-[1320px] flex-col gap-4 p-4">
      <header className="flex flex-wrap items-center gap-3">
        <div className="flex h-[52px] items-center gap-3 rounded-full bg-surface pe-5 ps-2">
          <Avatar text={client.branding.logoText ?? client.name} color={client.branding.primaryColor} />
          <div className="leading-tight">
            <p className="text-[14px] font-extrabold">{client.name}</p>
            <p className="text-[11px] text-text-muted">{project.name}</p>
          </div>
        </div>
        <nav aria-label={t.client.nav.overview} className="flex h-[52px] flex-wrap items-center gap-1 rounded-full bg-surface px-2">
          {nav.map((key) => (
            <Link
              key={key}
              href={`${base}/${key}`}
              aria-current={key === active ? "page" : undefined}
              className={cn("inline-flex h-10 items-center rounded-full px-4 text-[13px] font-semibold no-underline", key === active ? "bg-ink text-white" : "text-ink-2 hover:bg-muted")}
            >
              {t.client.nav[key]}
            </Link>
          ))}
        </nav>
        {headerExtra}
        <div className="ms-auto flex items-center gap-2">
          {projects.length > 1 ? (
            <nav aria-label={t.nav.projects} className="flex h-[52px] items-center gap-1 rounded-full bg-surface px-2">
              {projects.map((p) => (
                <Link key={p.id} href={`/dashboard/${p.id}/${active}`} className={cn("rounded-full px-3 py-1.5 text-[12px] font-semibold no-underline", p.id === project.id ? "bg-accent-soft text-accent-deep" : "text-ink-2")}>
                  {p.name}
                </Link>
              ))}
            </nav>
          ) : null}
          {isNggPreview ? (
            <Link href={`/ngg/clients/${client.id}/projects/${project.id}`} className="inline-flex h-[52px] items-center rounded-full bg-warning-bg px-4 text-[12px] font-semibold text-warning-text no-underline">
              {locale === "he" ? "תצוגת NGG · חזרה לסביבת העבודה" : "NGG preview · back to workspace"}
            </Link>
          ) : (
            <form action={logoutAction} className="flex h-[52px] items-center rounded-full bg-surface px-4 text-[12px]">
              <span className="me-3 font-semibold">{userName}</span>
              <button type="submit" className="font-semibold text-text-muted hover:text-ink">
                {t.client.logout}
              </button>
            </form>
          )}
        </div>
      </header>
      <main className="flex flex-col gap-4">{children}</main>
      <footer className="flex flex-wrap items-center gap-3 rounded-full bg-surface px-5 py-3 text-[12px] text-text-muted">
        <span aria-hidden="true">🔒</span>
        <span>{fmt(t.client.privacyFooter, { n: client.privacyThreshold })}</span>
        <Link href={`${base}/methodology`} className="ms-auto font-semibold">
          {t.client.methodologyLink} ←
        </Link>
      </footer>
    </div>
  );
}

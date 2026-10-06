import type { ReactNode } from "react";
import { NavItem } from "./NavItem";
import { NggLogo } from "./NggLogo";
import { Icons } from "./icons";
import { Avatar } from "@/components/ui/Avatar";
import { logoutAction } from "@/app/login/actions";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/domain/shared/enums";

export interface NggShellProps {
  t: Dictionary;
  locale: Locale;
  dir: "rtl" | "ltr";
  userName: string;
  roleLabel: string;
  isSuperAdmin: boolean;
  pendingInsights?: number;
  clientCount?: number;
  children: ReactNode;
}

/** NGG admin shell: floating sidebar + content column, wraps on narrow screens (design §2). */
export function NggShell({ t, locale, dir, userName, roleLabel, isSuperAdmin, pendingInsights, clientCount, children }: NggShellProps) {
  return (
    <div dir={dir} lang={locale} className="flex min-h-screen flex-wrap items-stretch gap-4 p-4">
      <aside className="flex flex-[1_1_232px] flex-col gap-5 rounded-[28px] bg-surface px-3.5 py-4.5 md:max-w-[260px]">
        <div className="pt-1">
          <NggLogo tagline={t.app.tagline} />
        </div>
        <nav aria-label={t.nav.mainNav} className="flex flex-col gap-1">
          <NavItem href="/ngg" exact icon={<Icons.overview />}>{t.nav.overview}</NavItem>
          <NavItem href="/ngg/clients" icon={<Icons.clients />} badge={clientCount}>{t.nav.clients}</NavItem>
          <NavItem href="/ngg/projects" icon={<Icons.projects />}>{t.nav.projects}</NavItem>
          <NavItem href="/ngg/questionnaires" icon={<Icons.questionnaires />}>{t.nav.questionnaires}</NavItem>
          <NavItem href="/ngg/measurements" icon={<Icons.measurements />}>{t.nav.measurements}</NavItem>
          <NavItem href="/ngg/insights" icon={<Icons.insights />} badge={pendingInsights || undefined}>{t.nav.insights}</NavItem>
          <NavItem href="/ngg/goals" icon={<Icons.goals />}>{t.nav.goals}</NavItem>
          {isSuperAdmin ? (
            <>
              <NavItem href="/ngg/users" icon={<Icons.users />}>{t.nav.users}</NavItem>
              <NavItem href="/ngg/audit" icon={<Icons.audit />}>{t.nav.audit}</NavItem>
              <NavItem href="/ngg/settings" icon={<Icons.settings />}>{t.nav.settings}</NavItem>
            </>
          ) : null}
        </nav>
        <div className="mt-auto flex items-center gap-3 rounded-[20px] bg-sunken p-3">
          <Avatar text={userName} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[14px] font-bold">{userName}</p>
            <p className="truncate text-[12px] text-text-muted">{roleLabel}</p>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="rounded-full px-2 py-1 text-[12px] font-semibold text-text-muted hover:bg-muted" title={t.auth.logout}>
              {t.auth.logout}
            </button>
          </form>
        </div>
      </aside>
      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">{children}</main>
    </div>
  );
}

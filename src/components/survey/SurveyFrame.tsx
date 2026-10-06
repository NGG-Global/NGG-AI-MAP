import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { NggLogo } from "@/components/shell/NggLogo";
import type { Client } from "@/server/db/schema";
import type { Locale } from "@/domain/shared/enums";

/** Mobile-first single column with the client's branding and NGG attribution (spec §19). */
export function SurveyFrame({ client, locale, dir, children, header, langHref, langLabel }: { client: Client; locale: Locale; dir: "rtl" | "ltr"; children: ReactNode; header?: ReactNode; langHref?: string; langLabel?: string }) {
  const accent = client.branding.primaryColor ?? "#15151f";
  return (
    <div dir={dir} lang={locale} className="mx-auto flex min-h-screen w-full max-w-[560px] flex-col gap-4 p-4" style={{ ["--client-accent" as string]: accent }}>
      <header className="flex items-center justify-between gap-3">
        {header ?? (
          <div className="flex items-center gap-2">
            <Avatar text={client.branding.logoText ?? client.name} color={accent} size="sm" />
            <span className="text-[14px] font-bold">{client.name}</span>
          </div>
        )}
        <div className="flex items-center gap-3 text-[12px] text-text-muted">
          {langHref ? <a href={langHref} className="font-semibold">{langLabel}</a> : null}
          <NggLogo compact />
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4">{children}</main>
    </div>
  );
}

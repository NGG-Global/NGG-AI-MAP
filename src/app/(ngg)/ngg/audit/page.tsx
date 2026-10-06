import { notFound } from "next/navigation";
import { nggPage } from "@/server/ui/page";
import { listAudit } from "@/server/services/audit";
import { canWorkspace } from "@/domain/authz/policy";
import { TopBar } from "@/components/shell/TopBar";
import { Headline } from "@/components/ui/Headline";
import { Tile, InnerRow } from "@/components/ui/Tile";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const { ctx, t, locale } = await nggPage();
  if (!canWorkspace(ctx.actor, "workspace.view_audit")) notFound();
  const entries = await listAudit(ctx, 200);
  return (
    <>
      <TopBar crumbs={[{ label: "NGG", href: "/ngg" }, { label: t.nav.audit }]} ariaLabel={t.nav.breadcrumb} />
      <Tile padding="hero">
        <Headline eyebrow={t.audit.subtitle}>{t.audit.title}</Headline>
      </Tile>
      <Tile>
        <div className="hidden grid-cols-[1fr_1fr_1.4fr_1.4fr] gap-3 px-4 text-[12px] font-semibold text-text-muted md:grid">
          <span>{t.audit.when}</span>
          <span>{t.audit.who}</span>
          <span>{t.audit.what}</span>
          <span>{t.audit.entity}</span>
        </div>
        <ul className="mt-2 flex flex-col gap-2">
          {entries.map((entry) => (
            <InnerRow as="li" key={entry.id} className="grid grid-cols-1 gap-2 text-[13px] md:grid-cols-[1fr_1fr_1.4fr_1.4fr]">
              <span className="text-text-muted">{formatDateTime(entry.createdAt, locale)}</span>
              <span dir="ltr" className="font-semibold">{entry.actorLabel ?? "system"}</span>
              <span dir="ltr" className="font-mono text-[12px]">{entry.action}</span>
              <span dir="ltr" className="truncate text-text-muted">{entry.entityType}{entry.entityId ? ` · ${entry.entityId.slice(0, 8)}` : ""}</span>
            </InnerRow>
          ))}
          {entries.length === 0 ? <li className="text-[13px] text-text-muted">{t.states.empty}</li> : null}
        </ul>
      </Tile>
    </>
  );
}

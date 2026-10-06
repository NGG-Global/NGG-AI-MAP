import { notFound } from "next/navigation";
import { nggPage } from "@/server/ui/page";
import { canWorkspace } from "@/domain/authz/policy";
import { env } from "@/server/shared/env";
import { TopBar } from "@/components/shell/TopBar";
import { Headline } from "@/components/ui/Headline";
import { Tile, InnerRow } from "@/components/ui/Tile";
import { DEFAULT_PRIVACY_THRESHOLD } from "@/domain/shared/enums";

export const dynamic = "force-dynamic";

export default async function WorkspaceSettingsPage() {
  const { ctx, t } = await nggPage();
  if (!canWorkspace(ctx.actor, "workspace.manage_settings")) notFound();
  const database = process.env.DATABASE_URL ? "PostgreSQL (DATABASE_URL)" : "PGlite (./.data/pglite)";
  return (
    <>
      <TopBar crumbs={[{ label: "NGG", href: "/ngg" }, { label: t.nav.settings }]} ariaLabel={t.nav.breadcrumb} />
      <Tile padding="hero">
        <Headline>{t.workspaceSettings.title}</Headline>
      </Tile>
      <Tile className="flex flex-col gap-2">
        <InnerRow className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[14px] font-bold">{t.workspaceSettings.aiProvider}</p>
            <p className="text-[12px] text-text-muted">{t.workspaceSettings.aiProviderHelp}</p>
          </div>
          <span dir="ltr" className="font-mono text-[13px]">{env.aiProvider}{env.aiModel ? ` · ${env.aiModel}` : ""}</span>
        </InnerRow>
        <InnerRow className="flex items-center justify-between gap-4">
          <p className="text-[14px] font-bold">{t.workspaceSettings.database}</p>
          <span dir="ltr" className="font-mono text-[13px]">{database}</span>
        </InnerRow>
        <InnerRow className="flex items-center justify-between gap-4">
          <p className="text-[14px] font-bold">{t.workspaceSettings.privacyDefault}</p>
          <span className="font-mono text-[13px]">n ≥ {DEFAULT_PRIVACY_THRESHOLD}</span>
        </InnerRow>
      </Tile>
    </>
  );
}

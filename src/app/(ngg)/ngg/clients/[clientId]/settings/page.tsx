import { notFound } from "next/navigation";
import { nggPage } from "@/server/ui/page";
import { loadClientWorkspace } from "@/server/ui/workspace";
import { canClient } from "@/domain/authz/policy";
import { ClientWorkspaceHeader } from "@/components/ngg/ClientWorkspaceHeader";
import { Tile, TileTitle } from "@/components/ui/Tile";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ params, searchParams }: PageProps<"/ngg/clients/[clientId]/settings">) {
  const { clientId } = await params;
  const sp = await searchParams;
  const projectId = typeof sp.project === "string" ? sp.project : undefined;
  const { ctx, t, locale } = await nggPage();
  const workspace = await loadClientWorkspace(ctx, clientId, projectId);
  if (!canClient(ctx.actor, "client.update_settings", { clientId })) notFound();
  return (
    <>
      <ClientWorkspaceHeader workspace={workspace} active="settings" t={t} locale={locale} canManage />
      <Tile>
        <TileTitle>{t.settings.title}</TileTitle>
        <SettingsForm t={t} locale={locale} client={workspace.client} canEditPrivacy={canClient(ctx.actor, "client.update_privacy", { clientId })} />
      </Tile>
    </>
  );
}

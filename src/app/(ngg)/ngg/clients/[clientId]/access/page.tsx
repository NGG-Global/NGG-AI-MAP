import { nggPage } from "@/server/ui/page";
import { loadClientWorkspace } from "@/server/ui/workspace";
import { listClientUsers } from "@/server/services/users";
import { listInvitations, pendingInvitations } from "@/server/services/invitations";
import { canClient } from "@/domain/authz/policy";
import { ClientWorkspaceHeader } from "@/components/ngg/ClientWorkspaceHeader";
import { Tile, TileTitle, InnerRow } from "@/components/ui/Tile";
import { StatusPill } from "@/components/ui/StatusPill";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";
import { InviteForm } from "./InviteForm";
import { revokeInvitationAction, toggleClientUserAction } from "../actions";
import { ForbiddenError } from "@/server/shared/errors";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AccessPage({ params, searchParams }: PageProps<"/ngg/clients/[clientId]/access">) {
  const { clientId } = await params;
  const sp = await searchParams;
  const projectId = typeof sp.project === "string" ? sp.project : undefined;
  const { ctx, t, locale } = await nggPage();
  const workspace = await loadClientWorkspace(ctx, clientId, projectId);
  if (!canClient(ctx.actor, "client.manage_access", { clientId })) notFound();
  let users: Awaited<ReturnType<typeof listClientUsers>> = [];
  let invitations: Awaited<ReturnType<typeof listInvitations>> = [];
  try {
    [users, invitations] = await Promise.all([listClientUsers(ctx, clientId), listInvitations(ctx, clientId)]);
  } catch (error) {
    if (!(error instanceof ForbiddenError)) throw error;
  }
  const pending = pendingInvitations(invitations);
  const projectName = (id: string) => workspace.projects.find((p) => p.id === id)?.name ?? id;

  return (
    <>
      <ClientWorkspaceHeader workspace={workspace} active="access" t={t} locale={locale} canManage />
      <Tile>
        <TileTitle>{t.access.inviteTitle}</TileTitle>
        <p className="mb-4 text-[13px] text-text-muted">{t.access.subtitle}</p>
        <InviteForm t={t} locale={locale} clientId={clientId} projects={workspace.projects.map((p) => ({ id: p.id, name: p.name }))} />
      </Tile>
      <div className="flex flex-wrap gap-4">
        <Tile className="flex-[2_1_420px]">
          <TileTitle trailing={<span className="text-[13px] text-text-muted">{users.length}</span>}>{t.access.users}</TileTitle>
          {users.length === 0 ? (
            <EmptyState title={t.access.noUsers} />
          ) : (
            <ul className="flex flex-col gap-2">
              {users.map((user) => (
                <InnerRow as="li" key={user.id} className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold">{user.name}</p>
                    <p className="text-[12px] text-text-muted" dir="ltr">{user.email}</p>
                    <p className="text-[12px] text-text-muted">{user.projectIds.length ? user.projectIds.map(projectName).join(" · ") : t.access.allProjects}</p>
                  </div>
                  <StatusPill tone={user.status === "active" ? "success" : "neutral"}>{user.clientRole ? t.roles[user.clientRole] : ""}{user.status !== "active" ? ` · ${t.access.revoked}` : ""}</StatusPill>
                  <form action={toggleClientUserAction}>
                    <input type="hidden" name="clientId" value={clientId} />
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="mode" value={user.status === "active" ? "revoke" : "restore"} />
                    <Button type="submit" variant={user.status === "active" ? "danger" : "secondary"} size="sm">
                      {user.status === "active" ? t.access.revoke : t.access.restore}
                    </Button>
                  </form>
                </InnerRow>
              ))}
            </ul>
          )}
        </Tile>
        <Tile className="flex-[1_1_300px]">
          <TileTitle trailing={<span className="text-[13px] text-text-muted">{pending.length}</span>}>{t.access.pending}</TileTitle>
          {pending.length === 0 ? (
            <p className="text-[13px] text-text-muted">{t.states.empty}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {pending.map((inv) => (
                <InnerRow as="li" key={inv.id} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold" dir="ltr">{inv.email}</p>
                    <p className="text-[12px] text-text-muted">
                      {t.roles[inv.clientRole]} · {t.access.expires} {formatDate(inv.expiresAt, locale)}
                    </p>
                  </div>
                  <form action={revokeInvitationAction}>
                    <input type="hidden" name="clientId" value={clientId} />
                    <input type="hidden" name="invitationId" value={inv.id} />
                    <Button type="submit" variant="ghost" size="sm">{t.common.cancel}</Button>
                  </form>
                </InnerRow>
              ))}
            </ul>
          )}
        </Tile>
      </div>
    </>
  );
}

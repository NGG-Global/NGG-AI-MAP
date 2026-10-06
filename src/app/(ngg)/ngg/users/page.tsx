import { notFound } from "next/navigation";
import { nggPage } from "@/server/ui/page";
import { listNggUsers } from "@/server/services/users";
import { canWorkspace } from "@/domain/authz/policy";
import { TopBar } from "@/components/shell/TopBar";
import { Headline } from "@/components/ui/Headline";
import { Tile, TileTitle, InnerRow } from "@/components/ui/Tile";
import { StatusPill } from "@/components/ui/StatusPill";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/format";
import { UserForm } from "./UserForm";
import { toggleNggUserAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const { ctx, t, locale } = await nggPage();
  if (!canWorkspace(ctx.actor, "workspace.manage_users")) notFound();
  const users = await listNggUsers(ctx);
  return (
    <>
      <TopBar crumbs={[{ label: "NGG", href: "/ngg" }, { label: t.nav.users }]} ariaLabel={t.nav.breadcrumb} />
      <Tile padding="hero">
        <Headline eyebrow={t.users.subtitle}>{t.users.title}</Headline>
      </Tile>
      <div className="flex flex-wrap gap-4">
        <Tile className="flex-[2_1_420px]">
          <TileTitle trailing={<span className="text-[13px] text-text-muted">{users.length}</span>}>{t.users.title}</TileTitle>
          <ul className="flex flex-col gap-2">
            {users.map((user) => (
              <InnerRow as="li" key={user.id} className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold">{user.name}</p>
                  <p className="text-[12px] text-text-muted" dir="ltr">{user.email}</p>
                  <p className="text-[12px] text-text-muted">{t.users.lastLogin}: {user.lastLoginAt ? formatDateTime(user.lastLoginAt, locale) : t.users.never}</p>
                </div>
                <StatusPill tone={user.status === "active" ? "success" : "neutral"}>{user.nggRole ? t.roles[user.nggRole] : ""}{user.status !== "active" ? ` · ${t.users.disabled}` : ""}</StatusPill>
                {user.id !== ctx.actor.userId ? (
                  <form action={toggleNggUserAction}>
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="mode" value={user.status === "active" ? "disable" : "enable"} />
                    <Button type="submit" variant={user.status === "active" ? "danger" : "secondary"} size="sm">{user.status === "active" ? t.users.disable : t.users.enable}</Button>
                  </form>
                ) : null}
              </InnerRow>
            ))}
          </ul>
        </Tile>
        <Tile className="flex-[1_1_320px]">
          <TileTitle>{t.users.newUser}</TileTitle>
          <UserForm t={t} locale={locale} />
        </Tile>
      </div>
    </>
  );
}

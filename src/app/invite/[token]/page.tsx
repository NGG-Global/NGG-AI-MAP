import { db } from "@/server/db/client";
import { getPendingInvitationByToken } from "@/server/services/invitations";
import { getDictionary } from "@/lib/i18n";
import { Tile } from "@/components/ui/Tile";
import { NggLogo } from "@/components/shell/NggLogo";
import { InviteForm } from "./InviteForm";
import { eq } from "drizzle-orm";
import { clients } from "@/server/db/schema";

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const database = await db();
  const invitation = await getPendingInvitationByToken(database, token);
  const [client] = invitation ? await database.select().from(clients).where(eq(clients.id, invitation.clientId)).limit(1) : [];
  const locale = client?.locale ?? "he";
  const t = getDictionary(locale);
  return (
    <main dir={locale === "he" ? "rtl" : "ltr"} lang={locale} className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Tile padding="hero" className="flex flex-col gap-6">
          <NggLogo tagline={t.app.tagline} />
          <div>
            <h1 className="text-[28px] font-extrabold leading-tight">{t.auth.inviteTitle}</h1>
            <p className="mt-1 text-[14px] text-text-muted">{invitation ? `${t.auth.inviteBody}${client ? ` · ${client.name}` : ""}` : t.auth.inviteInvalid}</p>
          </div>
          {invitation ? <InviteForm t={t.auth} locale={locale} token={token} email={invitation.email} /> : null}
        </Tile>
      </div>
    </main>
  );
}

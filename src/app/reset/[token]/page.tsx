import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { clients } from "@/server/db/schema";
import { getUserByResetToken } from "@/server/services/passwordResets";
import { getDictionary } from "@/lib/i18n";
import { Tile } from "@/components/ui/Tile";
import { NggLogo } from "@/components/shell/NggLogo";
import { ResetForm } from "./ResetForm";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ params }: PageProps<"/reset/[token]">) {
  const { token } = await params;
  const database = await db();
  const user = await getUserByResetToken(database, token);
  const [client] = user?.clientId ? await database.select().from(clients).where(eq(clients.id, user.clientId)).limit(1) : [];
  const locale = user?.locale ?? client?.locale ?? "he";
  const t = getDictionary(locale);
  return (
    <main dir={locale === "he" ? "rtl" : "ltr"} lang={locale} className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Tile padding="hero" className="flex flex-col gap-6">
          <NggLogo tagline={t.app.tagline} />
          <div>
            <h1 className="text-[28px] font-extrabold leading-tight">{t.auth.resetTitle}</h1>
            <p className="mt-1 text-[14px] text-text-muted">{user ? t.auth.resetBody : t.auth.resetInvalid}</p>
          </div>
          {user ? <ResetForm t={t.auth} locale={locale} token={token} email={user.email} /> : null}
        </Tile>
      </div>
    </main>
  );
}

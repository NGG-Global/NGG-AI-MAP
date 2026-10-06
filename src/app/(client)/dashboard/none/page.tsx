import { requireClientContext } from "@/server/auth/current";
import { getDictionary, dirFor } from "@/lib/i18n";
import { Tile } from "@/components/ui/Tile";
import { logoutAction } from "@/app/login/actions";
import { Button } from "@/components/ui/Button";

export default async function NoProjectPage() {
  const ctx = await requireClientContext();
  const t = getDictionary(ctx.user.locale);
  return (
    <main dir={dirFor(ctx.user.locale)} lang={ctx.user.locale} className="flex min-h-screen items-center justify-center p-4">
      <Tile padding="hero" className="flex max-w-md flex-col gap-4">
        <h1 className="text-[24px] font-extrabold">{t.client.nav.overview}</h1>
        <p className="text-[14px] text-text-muted">{t.client.noProject}</p>
        <form action={logoutAction}>
          <Button type="submit" variant="secondary">{t.client.logout}</Button>
        </form>
      </Tile>
    </main>
  );
}

import { nggPage } from "@/server/ui/page";
import { assertWorkspace } from "@/server/services/access";
import { TopBar } from "@/components/shell/TopBar";
import { Tile } from "@/components/ui/Tile";
import { Headline } from "@/components/ui/Headline";
import { ClientForm } from "./ClientForm";

export default async function NewClientPage() {
  const { ctx, t, locale } = await nggPage();
  assertWorkspace(ctx, "client.create");
  return (
    <>
      <TopBar crumbs={[{ label: "NGG", href: "/ngg" }, { label: t.nav.clients, href: "/ngg/clients" }, { label: t.clients.newClient }]} ariaLabel={t.nav.breadcrumb} />
      <Tile padding="hero" className="flex flex-col gap-6">
        <Headline>{t.clients.newClientTitle}</Headline>
        <ClientForm t={t} locale={locale} />
      </Tile>
    </>
  );
}

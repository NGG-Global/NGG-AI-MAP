import { nggPage } from "@/server/ui/page";
import { TopBar } from "@/components/shell/TopBar";
import { Headline } from "@/components/ui/Headline";
import { Tile } from "@/components/ui/Tile";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export default async function MeasurementsPage() {
  const { t } = await nggPage();
  return (
    <>
      <TopBar crumbs={[{ label: "NGG", href: "/ngg" }, { label: t.nav.measurements }]} ariaLabel={t.nav.breadcrumb} />
      <Tile padding="hero">
        <Headline>{t.nav.measurements}</Headline>
      </Tile>
      <Tile>
        <EmptyState title={t.states.empty} />
      </Tile>
    </>
  );
}

import { nggPage } from "@/server/ui/page";
import { loadMetricConfigs } from "@/server/services/library";
import { TopBar } from "@/components/shell/TopBar";
import { Headline } from "@/components/ui/Headline";
import { Tile, TileTitle } from "@/components/ui/Tile";
import { SourceBadge, StatusPill } from "@/components/ui/StatusPill";
import { lt } from "@/domain/shared/localized";
import type { MetricGroup } from "@/domain/measurement/config";

export const dynamic = "force-dynamic";

const GROUP_LABELS: Record<MetricGroup, { he: string; en: string }> = {
  core: { he: "פרופיל ליבה", en: "Core profile" },
  ai_literacy_dimension: { he: "ממדי אוריינות AI", en: "AI literacy dimensions" },
  agentic_management_dimension: { he: "ממדי ניהול אג׳נטי", en: "Agentic management dimensions" },
  enablement_dimension: { he: "ממדי אפשור ארגוני", en: "Enablement dimensions" },
  manager_team_pair: { he: "פערי מנהל–צוות", en: "Manager–team pairs" },
  adoption: { he: "אימוץ", en: "Adoption" },
  impact: { he: "תוצאות", en: "Outcomes" },
};

export default async function MeasurementsPage() {
  const { ctx, t, locale } = await nggPage();
  const metrics = await loadMetricConfigs(ctx.db);
  const groups = Object.keys(GROUP_LABELS) as MetricGroup[];
  return (
    <>
      <TopBar crumbs={[{ label: "NGG", href: "/ngg" }, { label: t.nav.measurements }]} ariaLabel={t.nav.breadcrumb} />
      <Tile padding="hero">
        <Headline eyebrow={t.builder.metricsSubtitle}>{t.builder.metrics}</Headline>
      </Tile>
      {groups.map((group) => {
        const rows = metrics.filter((m) => m.group === group);
        if (!rows.length) return null;
        return (
          <Tile key={group}>
            <TileTitle>{GROUP_LABELS[group][locale]}</TileTitle>
            <ul className="flex flex-col gap-2">
              {rows.map((m) => (
                <li key={m.id} className="grid grid-cols-1 gap-2 rounded-[16px] bg-sunken px-4 py-3 md:grid-cols-[1.4fr_0.8fr_0.8fr_2fr]">
                  <div>
                    <p className="text-[14px] font-bold">{lt(m.name, locale)}</p>
                    <p className="text-[11px] text-text-muted" dir="ltr">{m.id}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <SourceBadge sourceType={m.sourceType} locale={locale} />
                    {m.coreProfile ? <StatusPill tone="accent" dot={false}>{t.builder.core}</StatusPill> : null}
                  </div>
                  <p className="text-[12px] text-text-muted" dir="ltr">
                    {m.kind} · {m.scaleMin}–{m.scaleMax}
                    {m.audience !== "all" ? ` · ${m.audience}` : ""}
                  </p>
                  <p className="text-[11px] text-text-muted" dir="ltr">
                    {m.pair ? `${m.pair.managerItemId} ↔ ${m.pair.employeeItemId}` : `${m.itemCanonicalIds.length} ${t.builder.items}: ${m.itemCanonicalIds.join(", ")}`}
                    {m.reverseCodedIds.length ? ` · ${t.builder.reverseCoded}: ${m.reverseCodedIds.join(", ")}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </Tile>
        );
      })}
    </>
  );
}

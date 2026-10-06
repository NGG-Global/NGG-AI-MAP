import { Tile } from "@/components/ui/Tile";
import { Segmented } from "@/components/ui/Segmented";
import { SegmentFilter } from "@/components/results/SegmentFilter";
import { formatMonth } from "@/lib/format";
import { fmt, type Dictionary } from "@/lib/i18n";
import type { DashboardData } from "@/server/ui/dashboardData";
import type { Locale } from "@/domain/shared/enums";
import type { ReactNode } from "react";

/** Wave context + comparison selector + segment filters, shared by every dashboard page. */
export function DashboardHeader({ data, page, t, locale, headline, children, showFilters = true }: { data: DashboardData; page: string; t: Dictionary; locale: Locale; headline?: ReactNode; children?: ReactNode; showFilters?: boolean }) {
  const { view, selected, waves } = data;
  const closed = waves.filter((w) => w.status === "closed");
  return (
    <Tile padding="hero" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {selected && view ? (
            <p className="text-[13px] text-text-muted">{fmt(t.dashboard.waveInfo, { wave: selected.code, date: formatMonth(selected.closedAt ?? selected.endAt ?? selected.createdAt, locale), n: view.respondentCount })}</p>
          ) : null}
          {headline ? <h1 className="mt-1 text-[30px] font-extrabold leading-[1.15] tracking-tight md:text-[36px]">{headline}</h1> : null}
        </div>
        {closed.length > 1 ? (
          <div className="flex items-center gap-2 text-[12px] text-text-muted">
            <span>{t.dashboard.comparison}</span>
            <Segmented ariaLabel={t.dashboard.comparison} value={selected?.id ?? ""} options={closed.map((w) => ({ value: w.id, label: w.baselineWaveId ? `${w.code} ${t.results.comparedTo} ${closed.find((x) => x.id === w.baselineWaveId)?.code ?? ""}` : w.code, href: data.href(page, { wave: w.id }) }))} />
          </div>
        ) : null}
      </div>
      {children}
      {showFilters && view ? <SegmentFilter options={view.segmentOptions} current={data.segment} hrefFor={(seg) => data.href(page, { seg })} t={t} /> : null}
    </Tile>
  );
}

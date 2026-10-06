import { PrivacyProtected } from "@/components/ui/PrivacyProtected";
import { formatDelta, formatScore } from "@/lib/format";
import { lt } from "@/domain/shared/localized";
import type { Dictionary } from "@/lib/i18n";
import type { GapResult } from "@/domain/measurement/engine";
import type { MetricConfig } from "@/domain/measurement/config";
import type { Locale } from "@/domain/shared/enums";

/** Manager self-report vs team experience on one track per dimension (circle = managers, diamond = team). */
export function GapTable({ gaps, metrics, locale, t, threshold }: { gaps: GapResult[]; metrics: MetricConfig[]; locale: Locale; t: Dictionary; threshold: number }) {
  const pos = (v: number) => `${((v - 1) / 4) * 100}%`;
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[1.2fr_2fr_0.6fr_0.6fr_0.6fr] gap-3 px-1 text-[11px] font-semibold text-text-muted">
        <span />
        <span className="flex gap-4"><span>● {t.results.gapManagers}</span><span>◆ {t.results.gapTeam}</span></span>
        <span>{t.results.gapManagers}</span>
        <span>{t.results.gapTeam}</span>
        <span>{t.results.gapValue}</span>
      </div>
      <ul className="flex flex-col gap-2">
        {gaps.map((gap) => {
          const metric = metrics.find((m) => m.id === gap.pairId);
          return (
            <li key={gap.pairId} className="grid grid-cols-[1.2fr_2fr_0.6fr_0.6fr_0.6fr] items-center gap-3 rounded-[14px] bg-sunken px-3 py-2 text-[13px]">
              <span className="font-semibold">{metric ? lt(metric.name, locale) : gap.pairId}</span>
              {gap.suppressed ? (
                <div className="col-span-4"><PrivacyProtected locale={locale} compact threshold={threshold} /></div>
              ) : (
                <>
                  <div className="relative h-6" aria-hidden="true">
                    <div className="absolute inset-y-[10px] inset-x-0 rounded-full bg-line" />
                    {gap.managerScore != null ? <span className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-ink" style={{ insetInlineStart: `calc(${pos(gap.managerScore)} - 7px)` }} /> : null}
                    {gap.teamScore != null ? <span className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-45 bg-accent" style={{ insetInlineStart: `calc(${pos(gap.teamScore)} - 7px)` }} /> : null}
                  </div>
                  <span className="font-bold">{formatScore(gap.managerScore, locale)}</span>
                  <span className="font-bold">{formatScore(gap.teamScore, locale)}</span>
                  <span className={`font-extrabold ${gap.gap != null && gap.gap <= -0.5 ? "text-danger" : ""}`}>
                    <bdi dir="ltr">{formatDelta(gap.gap, locale)}</bdi>
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

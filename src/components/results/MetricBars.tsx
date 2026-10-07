import { Delta } from "@/components/ui/Delta";
import { PrivacyProtected } from "@/components/ui/PrivacyProtected";
import { formatScore } from "@/lib/format";
import { lt } from "@/domain/shared/localized";
import { fmt, type Dictionary } from "@/lib/i18n";
import type { ComparedMetric } from "@/domain/measurement/engine";
import { isPercentMetric, type MetricConfig } from "@/domain/measurement/config";
import type { Locale } from "@/domain/shared/enums";

export interface MetricBarsProps {
  metrics: MetricConfig[];
  compared: ComparedMetric[];
  locale: Locale;
  t: Dictionary;
  baselineCode?: string | null;
  currentCode?: string;
  threshold: number;
  /** Comparability per metric (shared/total items) for the caution note. */
  partial?: Record<string, { shared: number; total: number }>;
  showN?: boolean;
}

/**
 * Horizontal bars with a hollow baseline marker and a filled current marker (the design's "dumbbell").
 * Direction and magnitude are carried by text and glyphs, never colour alone.
 */
export function MetricBars({ metrics, compared, locale, t, baselineCode, currentCode, threshold, partial, showN = true }: MetricBarsProps) {
  return (
    <div className="flex flex-col gap-3">
      {baselineCode ? (
        <div className="flex items-center gap-4 text-[11px] text-text-muted">
          <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full border-2 border-baseline-mark bg-surface" aria-hidden="true" /> {baselineCode}</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-accent" aria-hidden="true" /> {currentCode}</span>
        </div>
      ) : null}
      <ul className="flex flex-col gap-2.5">
        {metrics.map((metric) => {
          const row = compared.find((c) => c.metricId === metric.id);
          const cur = row?.current;
          if (!cur) return null;
          const range = metric.scaleMax - metric.scaleMin;
          const pos = (v: number) => `${Math.max(0, Math.min(100, ((v - metric.scaleMin) / range) * 100))}%`;
          const partialInfo = partial?.[metric.id];
          return (
            <li key={metric.id} className="grid grid-cols-[1.3fr_2.2fr_0.6fr_1fr] items-center gap-3 text-[13px]">
              <div className="min-w-0">
                <p className="truncate font-semibold">{lt(metric.name, locale)}</p>
                {showN && !cur.suppressed ? <p className="text-[11px] text-text-muted">{fmt(t.results.n, { n: cur.n })}</p> : null}
              </div>
              {cur.suppressed ? (
                <div className="col-span-3"><PrivacyProtected locale={locale} compact threshold={threshold} /></div>
              ) : (
                <>
                  <div className="relative h-6" aria-hidden="true">
                    <div className="absolute inset-y-[10px] inset-x-0 rounded-full bg-muted" />
                    {row.baseline && row.comparable && row.baseline.score != null && cur.score != null ? (
                      <div
                        className="absolute inset-y-[10px] rounded-full bg-accent-tint"
                        style={{ insetInlineStart: pos(Math.min(row.baseline.score, cur.score)), width: `calc(${pos(Math.max(row.baseline.score, cur.score))} - ${pos(Math.min(row.baseline.score, cur.score))})` }}
                      />
                    ) : null}
                    {row.baseline && row.comparable && row.baseline.score != null ? (
                      <span className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-baseline-mark bg-surface" style={{ insetInlineStart: `calc(${pos(row.baseline.score)} - 7px)` }} />
                    ) : null}
                    {cur.score != null ? <span className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-accent" style={{ insetInlineStart: `calc(${pos(cur.score)} - 8px)` }} /> : null}
                  </div>
                  <span className="text-[16px] font-extrabold">
                    {formatScore(cur.score, locale)}
                    {isPercentMetric(metric) ? "%" : ""}
                  </span>
                  <div className="flex flex-col">
                    <Delta value={row.delta} locale={locale} notComparable={Boolean(row.baseline) && !row.comparable} suffix={isPercentMetric(metric) ? "%" : undefined} threshold={isPercentMetric(metric) ? 1 : undefined} neutral={metric.neutralDirection} />
                    {partialInfo && partialInfo.shared < partialInfo.total ? <span className="text-[10px] text-warning-text">{fmt(t.results.comparabilityNote, partialInfo)}</span> : null}
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

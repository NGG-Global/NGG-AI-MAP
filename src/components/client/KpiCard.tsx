import { Delta } from "@/components/ui/Delta";
import { PrivacyProtected } from "@/components/ui/PrivacyProtected";
import { formatScore } from "@/lib/format";
import { lt } from "@/domain/shared/localized";
import { fmt, type Dictionary } from "@/lib/i18n";
import type { ComparedMetric } from "@/domain/measurement/engine";
import type { MetricConfig } from "@/domain/measurement/config";
import type { Locale } from "@/domain/shared/enums";

/** "3.8 / 5 · ↑ 0.4 from baseline" — the spec's core KPI card (§23.3). */
export function KpiCard({ metric, row, locale, t, baselineCode, threshold, accent = false }: { metric: MetricConfig; row: ComparedMetric | undefined; locale: Locale; t: Dictionary; baselineCode: string | null; threshold: number; accent?: boolean }) {
  const cur = row?.current;
  const suppressed = !cur || cur.suppressed;
  return (
    <div className={`flex min-h-[132px] flex-col justify-between rounded-[24px] p-5 ${accent ? "bg-accent text-white" : "bg-surface"}`}>
      <p className={`text-[13px] font-semibold ${accent ? "text-white/80" : "text-text-muted"}`}>{lt(metric.name, locale)}</p>
      {suppressed ? (
        <PrivacyProtected locale={locale} compact threshold={threshold} className={accent ? "border-white/50 text-white" : ""} />
      ) : (
        <div>
          <p className="flex items-baseline gap-1">
            <span className="text-[36px] font-black leading-none">{formatScore(cur.score, locale)}</span>
            <span className={`text-[13px] ${accent ? "text-white/80" : "text-text-muted"}`}>/ {metric.scaleMax}</span>
          </p>
          <p className={`mt-1 flex items-center gap-2 text-[12px] ${accent ? "text-white/90" : "text-text-muted"}`}>
            {row.baseline && row.comparable ? (
              <>
                <Delta value={row.delta} locale={locale} notComparable={!row.comparable} className={accent ? "!text-white" : ""} />
                <span>{fmt(t.dashboard.fromBaseline, { wave: baselineCode ?? "" })}</span>
                <span>· {fmt(t.dashboard.was, { score: formatScore(row.baseline.score, locale) })}</span>
              </>
            ) : row.baseline && !row.comparable ? (
              <Delta value={null} locale={locale} notComparable className={accent ? "!text-white" : ""} />
            ) : (
              <span>{fmt(t.results.n, { n: cur.n })}</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

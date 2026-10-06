import { PrivacyProtected } from "@/components/ui/PrivacyProtected";
import { formatPercent } from "@/lib/format";
import { lt } from "@/domain/shared/localized";
import { cn } from "@/lib/cn";
import type { DistributionResult } from "@/server/db/schema";
import type { QuestionDefinition } from "@/domain/questionnaire/definition";
import type { Locale } from "@/domain/shared/enums";

/** Horizontal bars for option shares (use-case breadth, barriers, work patterns). */
export function DistributionBars({ distribution, question, locale, threshold, order = "asDefined", limit, emphasize, baseline }: { distribution: DistributionResult | undefined; question: QuestionDefinition | undefined; locale: Locale; threshold: number; order?: "asDefined" | "desc"; limit?: number; emphasize?: boolean; baseline?: DistributionResult | null }) {
  if (!distribution || distribution.suppressed) return <PrivacyProtected locale={locale} compact threshold={threshold} />;
  let entries = (question?.options ?? Object.keys(distribution.buckets).map((value) => ({ value, label: { he: value, en: value } }))).map((o) => ({
    value: o.value,
    label: lt(o.label, locale).split(" — ")[0]!,
    share: distribution.buckets[o.value] ?? 0,
    baselineShare: baseline && !baseline.suppressed ? baseline.buckets[o.value] : undefined,
  }));
  if (order === "desc") entries = [...entries].sort((a, b) => b.share - a.share);
  if (limit) entries = entries.slice(0, limit);
  const max = Math.max(1, ...entries.map((e) => e.share));
  return (
    <ul className="flex flex-col gap-2">
      {entries.map((e, i) => (
        <li key={e.value} className="grid grid-cols-[1.4fr_2fr_0.6fr] items-center gap-3 text-[13px]">
          <span className="truncate">{e.label}</span>
          <div className="relative h-5 rounded-full bg-muted" aria-hidden="true">
            <div className={cn("absolute inset-y-0 start-0 rounded-full", emphasize && i === entries.length - 1 ? "bg-accent" : "bg-ink")} style={{ width: `${(e.share / max) * 100}%` }} />
            {e.baselineShare != null ? <span className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-baseline-mark" style={{ insetInlineStart: `${(e.baselineShare / max) * 100}%` }} /> : null}
          </div>
          <span className="text-[15px] font-extrabold">{formatPercent(e.share, locale)}</span>
        </li>
      ))}
    </ul>
  );
}

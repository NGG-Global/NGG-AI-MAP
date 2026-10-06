import { PrivacyProtected } from "@/components/ui/PrivacyProtected";
import { lt } from "@/domain/shared/localized";
import type { DistributionResult } from "@/server/db/schema";
import type { QuestionDefinition } from "@/domain/questionnaire/definition";
import type { Locale } from "@/domain/shared/enums";

/** Rows = management activities, columns = human-led → autonomous; cell = share of managers (spec §25.3). */
export function DelegationHeatmap({ distribution, question, locale, threshold }: { distribution: DistributionResult | undefined; question: QuestionDefinition | undefined; locale: Locale; threshold: number }) {
  if (!distribution || distribution.suppressed || !question?.matrixRows || !question.matrixColumns) return <PrivacyProtected locale={locale} compact threshold={threshold} />;
  const shade = (v: number) => `rgba(21,21,31,${0.06 + Math.min(1, v / 100) * 0.84})`;
  return (
    <table className="w-full border-separate border-spacing-1 text-[12px]">
      <thead>
        <tr>
          <th className="text-start font-semibold text-text-muted"></th>
          {question.matrixColumns.map((c) => <th key={c.value} className="px-1 py-1 text-center font-semibold text-text-muted">{lt(c.label, locale)}</th>)}
        </tr>
      </thead>
      <tbody>
        {question.matrixRows.map((row) => (
          <tr key={row.key}>
            <th scope="row" className="pe-2 text-start font-semibold">{lt(row.label, locale)}</th>
            {question.matrixColumns!.map((c) => {
              const v = distribution.buckets[`${row.key}|${c.value}`] ?? 0;
              return (
                <td key={c.value} className="rounded-[10px] px-1 py-2 text-center font-bold" style={{ background: shade(v), color: v > 50 ? "#fff" : "#15151F" }} title={`${lt(row.label, locale)} · ${lt(c.label, locale)}: ${v}%`}>
                  {Math.round(v)}%
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

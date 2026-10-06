import { fmt, type Dictionary } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import type { QuestionnaireSummary, Comparability } from "@/domain/questionnaire/logic";

export function SummaryPanel({ summary, comparability, baselineCode, t }: { summary: QuestionnaireSummary; comparability: Comparability | null; baselineCode: string | null; t: Dictionary }) {
  const b = t.builder;
  const items: Array<{ label: string; value: string; meta?: string; tone?: "accent" | "warn" }> = [
    { label: b.estimatedTime, value: `${summary.estimatedMinutesEmployee}–${summary.estimatedMinutesManager} ${b.minutes}` },
    { label: b.questions, value: String(summary.totalQuestions), meta: `${summary.employeeQuestions} ${b.forEmployees} · ${summary.managerQuestions} ${b.forManagers}` },
    { label: b.validatedItems, value: String(summary.validatedItems) },
    { label: b.customItems, value: String(summary.customItems) },
    {
      label: baselineCode ? fmt(b.comparability, { wave: baselineCode }) : b.noBaseline,
      value: comparability ? `${comparability.percent}%` : "—",
      tone: comparability && comparability.percent < 100 ? "warn" : "accent",
    },
  ];
  return (
    <section aria-label={b.summary} className="flex flex-wrap gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "flex min-w-[150px] flex-[1_1_150px] flex-col gap-1 rounded-[20px] px-5 py-4",
            item.tone === "accent" ? "bg-accent-soft text-accent-deep" : item.tone === "warn" ? "bg-warning-bg text-warning-text" : "bg-surface",
          )}
        >
          <span className="text-[12px] font-medium opacity-80">{item.label}</span>
          <span className="text-[26px] font-black leading-none">{item.value}</span>
          {item.meta ? <span className="text-[11px] opacity-80">{item.meta}</span> : null}
        </div>
      ))}
    </section>
  );
}

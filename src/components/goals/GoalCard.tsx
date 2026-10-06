import { StatusPill, type PillTone } from "@/components/ui/StatusPill";
import { Delta } from "@/components/ui/Delta";
import { formatDate, formatScore } from "@/lib/format";
import { lt } from "@/domain/shared/localized";
import { fmt, type Dictionary } from "@/lib/i18n";
import type { Goal } from "@/server/db/schema";
import type { MetricConfig } from "@/domain/measurement/config";
import type { goalMeasurement } from "@/server/services/goals";
import type { Locale, GoalStatus } from "@/domain/shared/enums";
import type { ReactNode } from "react";

export const goalTone: Record<GoalStatus, PillTone> = { draft: "neutral", active: "info", in_progress: "accent", review: "warning", completed: "success", archived: "neutral" };

/** One goal with its measurement connection (spec §32). Used on the NGG side and the client dashboard. */
export function GoalCard({ goal, measurement, metrics, locale, t, actions, showInternal = false }: { goal: Goal; measurement: Awaited<ReturnType<typeof goalMeasurement>>; metrics: MetricConfig[]; locale: Locale; t: Dictionary; actions?: ReactNode; showInternal?: boolean }) {
  const g = t.goals;
  const done = goal.actions.filter((a) => a.done).length;
  return (
    <article className="flex flex-col gap-3 rounded-[20px] bg-sunken p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] font-bold leading-snug">{goal.title}</h3>
          {goal.description ? <p className="mt-1 text-[13px] text-ink-2">{goal.description}</p> : null}
          <p className="mt-1 text-[12px] text-text-muted">
            {goal.ownerName ? `${g.owner}: ${goal.ownerName} · ` : ""}{g.scopes[goal.scope]}{goal.dueDate ? ` · ${g.dueDate}: ${formatDate(goal.dueDate, locale)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusPill tone={goalTone[goal.status]}>{g.statuses[goal.status]}</StatusPill>
          {showInternal ? <StatusPill tone={goal.approvalState === "approved" ? "success" : goal.approvalState === "rejected" ? "danger" : "warning"} dot={false}>{g.approvals[goal.approvalState]}</StatusPill> : null}
          {showInternal ? <StatusPill tone="neutral" dot={false}>{g.sources[goal.source]}</StatusPill> : null}
          {showInternal && goal.publishedToClient ? <StatusPill tone="info" dot={false}>{g.publishedToClient}</StatusPill> : null}
        </div>
      </div>
      {measurement.length ? (
        <div className="grid gap-2 md:grid-cols-2">
          {measurement.map((m) => {
            const metric = metrics.find((x) => x.id === m.metricId);
            return (
              <div key={m.metricId} className="rounded-[14px] bg-surface px-3 py-2 text-[13px]">
                <p className="font-semibold">{metric ? lt(metric.name, locale) : m.metricId}</p>
                <p className="mt-1 flex flex-wrap items-center gap-3 text-[12px] text-text-muted">
                  <span>{g.baseline} {m.baseline?.waveCode ? `(${m.baseline.waveCode})` : ""}: <strong className="text-ink">{formatScore(m.baseline?.score, locale)}</strong></span>
                  {m.current && m.current.waveCode !== m.baseline?.waveCode ? <span>{g.current} ({m.current.waveCode}): <strong className="text-ink">{formatScore(m.current.score, locale)}</strong></span> : null}
                  {m.delta != null ? <Delta value={m.delta} locale={locale} invert={goal.targetDirection === "decrease"} /> : <span>{g.noMeasurement}</span>}
                </p>
              </div>
            );
          })}
        </div>
      ) : null}
      {goal.actions.length ? (
        <div>
          <p className="mb-1 text-[12px] font-semibold text-text-muted">{g.progress} · {fmt(g.actionsDone, { done, total: goal.actions.length })}</p>
          <div className="h-2 rounded-full bg-line"><div className="h-2 rounded-full bg-ink" style={{ width: `${(done / goal.actions.length) * 100}%` }} /></div>
          <ul className="mt-2 flex flex-col gap-1 text-[13px]">
            {goal.actions.map((a) => <li key={a.id} className={a.done ? "text-text-muted line-through" : ""}>{a.done ? "✓" : "○"} {a.text}</li>)}
          </ul>
        </div>
      ) : null}
      {goal.successEvidence.length ? <p className="text-[12px] text-text-muted">{g.successEvidence.split(" (")[0]}: {goal.successEvidence.join(" · ")}</p> : null}
      {actions}
    </article>
  );
}

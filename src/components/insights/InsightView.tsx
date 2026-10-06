import { StatusPill } from "@/components/ui/StatusPill";
import { Notice } from "@/components/ui/Notice";
import { formatDelta, formatScore } from "@/lib/format";
import { lt } from "@/domain/shared/localized";
import { fmt, type Dictionary } from "@/lib/i18n";
import type { Insight } from "@/server/db/schema";
import type { ExecutiveSummary, GoalSuggestions, MetricChangeExplanation, OpenTextThemes, EvidenceRef } from "@/domain/ai/contracts";
import type { MetricConfig } from "@/domain/measurement/config";
import type { Locale } from "@/domain/shared/enums";

export function InsightBadge({ status, t }: { status: Insight["status"]; t: Dictionary }) {
  return <StatusPill tone={status === "published" ? "success" : status === "rejected" ? "danger" : "accent"} dot={false}>{status === "published" ? t.insights.badgePublished : t.insights.status[status]}</StatusPill>;
}

export function EvidenceChips({ evidence, metrics, locale, ids }: { evidence: EvidenceRef[]; metrics: MetricConfig[]; locale: Locale; ids?: string[] }) {
  const rows = ids ? evidence.filter((e) => ids.includes(e.metricId)) : evidence;
  if (!rows.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {rows.map((e) => {
        const m = metrics.find((x) => x.id === e.metricId);
        return (
          <span key={`${e.metricId}-${e.waveCode}`} className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent-deep">
            {m ? lt(m.name, locale) : e.metricId} · {formatScore(e.score, locale)}
            {e.delta != null ? <bdi dir="ltr"> · {formatDelta(e.delta, locale)}</bdi> : null}
            <bdi dir="ltr"> · n={e.n}</bdi>
          </span>
        );
      })}
    </div>
  );
}

function Paragraph({ label, text, ids, insight, metrics, locale }: { label: string; text: string; ids?: string[]; insight: Insight; metrics: MetricConfig[]; locale: Locale }) {
  return (
    <div className="rounded-[16px] bg-sunken px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-1 text-[15px] leading-relaxed">{text}</p>
      <EvidenceChips evidence={insight.evidence} metrics={metrics} locale={locale} ids={ids} />
    </div>
  );
}

/** Renders any insight type as structured paragraphs with evidence chips (never raw HTML from the model). */
export function InsightView({ insight, metrics, locale, t, compact = false }: { insight: Insight; metrics: MetricConfig[]; locale: Locale; t: Dictionary; compact?: boolean }) {
  const i = t.insights;
  const insufficient = Boolean((insight.payload as { insufficientEvidence?: boolean }).insufficientEvidence);
  if (insufficient) return <Notice tone="warning">{i.insufficient}</Notice>;
  switch (insight.type) {
    case "executive_summary": {
      const p = insight.payload as ExecutiveSummary;
      const allIds = [...p.keyChanges, ...p.risks, ...p.opportunities].flatMap((k) => k.metricIds);
      return (
        <div className="flex flex-col gap-2">
          <Paragraph label={i.currentState} text={p.currentState} insight={insight} metrics={metrics} locale={locale} ids={allIds.length ? undefined : []} />
          <Paragraph label={i.biggestChange} text={p.biggestChange} ids={p.keyChanges.flatMap((k) => k.metricIds)} insight={insight} metrics={metrics} locale={locale} />
          <Paragraph label={i.primaryRisk} text={p.primaryRisk} ids={p.risks.flatMap((k) => k.metricIds)} insight={insight} metrics={metrics} locale={locale} />
          <Paragraph label={i.recommendedPriority} text={p.recommendedPriority} ids={[]} insight={insight} metrics={metrics} locale={locale} />
          {!compact && p.keyChanges.length ? (
            <div className="mt-2">
              <p className="mb-1 text-[12px] font-semibold text-text-muted">{i.keyChanges}</p>
              <ul className="flex flex-col gap-1 text-[13px]">{p.keyChanges.map((k, idx) => <li key={idx}>• {k.text}</li>)}</ul>
            </div>
          ) : null}
        </div>
      );
    }
    case "explain_change": {
      const p = insight.payload as MetricChangeExplanation;
      return (
        <div className="flex flex-col gap-2">
          <Paragraph label={i.whatChanged} text={p.whatChanged} ids={[p.metricId]} insight={insight} metrics={metrics} locale={locale} />
          {p.relatedChanges.length ? (
            <div className="rounded-[16px] bg-sunken px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{i.relatedChanges}</p>
              <ul className="mt-1 flex flex-col gap-1 text-[14px]">{p.relatedChanges.map((r) => <li key={r.metricId}>• {r.text}</li>)}</ul>
            </div>
          ) : null}
          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded-[16px] bg-success-bg px-4 py-3 text-[13px]"><p className="mb-1 font-semibold text-success">{i.canConclude}</p><ul>{p.canConclude.map((c, idx) => <li key={idx}>• {c}</li>)}</ul></div>
            <div className="rounded-[16px] bg-warning-bg px-4 py-3 text-[13px]"><p className="mb-1 font-semibold text-warning-text">{i.cannotConclude}</p><ul>{p.cannotConclude.map((c, idx) => <li key={idx}>• {c}</li>)}</ul></div>
          </div>
        </div>
      );
    }
    case "goal_suggestions": {
      const p = insight.payload as GoalSuggestions;
      return (
        <ol className="flex flex-col gap-2">
          {p.goals.map((g, idx) => (
            <li key={idx} className="rounded-[16px] bg-sunken px-4 py-3">
              <p className="text-[15px] font-bold">{g.title}</p>
              <p className="mt-1 text-[13px] text-ink-2">{g.rationale}</p>
              <EvidenceChips evidence={insight.evidence} metrics={metrics} locale={locale} ids={g.relatedMetrics} />
              <ul className="mt-2 flex flex-col gap-0.5 text-[13px]">{g.recommendedActions.map((a, ai) => <li key={ai}>→ {a}</li>)}</ul>
              <p className="mt-2 text-[12px] text-text-muted">{g.successEvidence.join(" · ")} · {g.suggestedReviewPeriod}</p>
            </li>
          ))}
        </ol>
      );
    }
    case "open_text_themes": {
      const p = insight.payload as OpenTextThemes;
      return (
        <div className="flex flex-col gap-2">
          <p className="text-[12px] text-text-muted">{i.responseCount}: {p.responseCount}</p>
          {p.themes.map((th) => (
            <div key={th.theme} className="rounded-[16px] bg-sunken px-4 py-3">
              <div className="flex items-center justify-between"><p className="text-[14px] font-bold">{th.theme}</p><span className="text-[12px] text-text-muted">{i.frequency}: {th.frequency}</span></div>
              {th.representativeParaphrases.length ? <ul className="mt-1 text-[12px] text-ink-2">{th.representativeParaphrases.map((s, idx) => <li key={idx}>· {s}</li>)}</ul> : null}
            </div>
          ))}
        </div>
      );
    }
  }
}

export function InsightChecks({ insight, threshold, t }: { insight: Insight; threshold: number; t: Dictionary }) {
  const warnings = insight.validationWarnings;
  const rows = [
    { ok: true, text: t.insights.checkSchema },
    { ok: true, text: fmt(t.insights.checkPrivacy, { n: threshold }) },
    ...(warnings.includes("causal_language") ? [{ ok: false, text: t.insights.checkCausal }] : []),
    ...(warnings.some((w) => w.startsWith("unknown_metric_ids")) ? [{ ok: false, text: t.insights.checkUnknownMetrics }] : []),
  ];
  return (
    <ul className="flex flex-col gap-1.5 text-[13px]">
      {rows.map((r, idx) => (
        <li key={idx} className="flex items-center gap-2">
          <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-black ${r.ok ? "bg-success-bg text-success" : "bg-warning-bg text-warning-text"}`} aria-hidden="true">{r.ok ? "✓" : "!"}</span>
          {r.text}
        </li>
      ))}
    </ul>
  );
}

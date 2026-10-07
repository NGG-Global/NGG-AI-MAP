import { lt } from "@/domain/shared/localized";
import { METHODOLOGY_LABELS } from "@/domain/questionnaire/methodology";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type PillTone = "neutral" | "success" | "warning" | "danger" | "info" | "accent" | "ink";

const toneClass: Record<PillTone, string> = {
  neutral: "bg-muted text-ink-2",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning-text",
  danger: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
  accent: "bg-accent-soft text-accent-deep",
  ink: "bg-ink text-white",
};

const dotClass: Record<PillTone, string> = {
  neutral: "bg-text-muted",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  accent: "bg-accent",
  ink: "bg-accent-on-dark",
};

/** Status is always text plus a dot: never colour alone. */
export function StatusPill({ tone = "neutral", children, className, dot = true, title }: { tone?: PillTone; children: ReactNode; className?: string; dot?: boolean; title?: string }) {
  return (
    <span title={title} className={cn("inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold", toneClass[tone], className)}>
      {dot ? <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", dotClass[tone])} /> : null}
      {children}
    </span>
  );
}

/** Research-status badge for sections and questions (spec §10). */
export function SourceBadge({ sourceType, researchStatus, locale }: { sourceType: "validated" | "ngg_measure" | "client_custom"; researchStatus?: "validated" | "ngg_measure" | "experimental" | "custom"; locale: "he" | "en" }) {
  // Client-facing labels and tooltips from the Master Questionnaire Copy §21.
  const labels = {
    he: { validated: "מבוסס על סולם מחקרי מתוקף", ngg_measure: "מדד NGG מבוסס מחקר", experimental: "מדד NGG ניסיוני", client_custom: "שאלה מותאמת ללקוח" },
    en: { validated: "Based on a validated research scale", ngg_measure: "NGG research-informed measure", experimental: "Experimental NGG measure", client_custom: "Client custom question" },
  } as const;
  const key = researchStatus === "experimental" ? "experimental" : sourceType;
  const tone: PillTone = key === "validated" ? "info" : key === "ngg_measure" ? "accent" : key === "experimental" ? "warning" : "neutral";
  const tooltip = lt(METHODOLOGY_LABELS[sourceType].tooltip, locale);
  return (
    <StatusPill tone={tone} dot={false} title={tooltip}>
      {key === "validated" ? <LockIcon /> : null}
      {labels[locale][key]}
    </StatusPill>
  );
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

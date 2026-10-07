import { LinkButton } from "@/components/ui/Button";
import { Tile } from "@/components/ui/Tile";
import { JOURNEY_STEPS, type NextStep, type StepPage } from "@/domain/projects/nextStep";
import { fmt, type Dictionary } from "@/lib/i18n";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Locale } from "@/domain/shared/enums";

/**
 * "What to do now" for a project: where the user is in the journey and the one action that moves it
 * forward. When the action lives on the current page the button is replaced by a short pointer.
 */
export function NextStepCard({
  step,
  projectBase,
  currentPage,
  currentWaveId,
  completed = 0,
  canAct,
  t,
  locale,
}: {
  step: NextStep;
  projectBase: string | null;
  currentPage: StepPage | "overview" | "waves";
  currentWaveId?: string;
  completed?: number;
  /** False for users who can view the project but not run it (e.g. analysts). */
  canAct: boolean;
  t: Dictionary;
  locale: Locale;
}) {
  const s = t.nextStep;
  const copy = s[step.key];
  const vars = { code: step.wave?.code ?? "", date: formatDate(step.wave?.startAt ?? null, locale), n: completed };
  const onPage = step.page === currentPage && (step.page !== "wave" || step.wave?.id === currentWaveId);
  const href = projectBase ? `${projectBase}${step.path}` : null;
  const followUp = step.key === "review_results" && projectBase ? `${projectBase}/waves/new?type=follow_up` : null;
  return (
    <Tile className="flex flex-col gap-4 border-s-4 border-accent" aria-label={fmt(s.eyebrow, { n: step.position, total: JOURNEY_STEPS })}>
      <ol className="flex flex-wrap gap-1.5" aria-hidden="true">
        {s.stages.map((label, i) => (
          <li
            key={label}
            className={cn(
              "rounded-full px-3 py-1 text-[11px] font-semibold",
              i + 1 < step.position ? "bg-success-bg text-success" : i + 1 === step.position ? "bg-accent text-white" : "bg-sunken text-text-muted",
            )}
          >
            {i + 1 < step.position ? "✓ " : ""}
            {label}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-[1_1_320px]">
          <p className="text-[12px] font-semibold text-accent-text">{fmt(s.eyebrow, { n: step.position, total: JOURNEY_STEPS })}</p>
          <h2 className="mt-1 text-[20px] font-extrabold leading-snug">{fmt(copy.title, vars)}</h2>
          <p className="mt-1 max-w-prose text-[14px] text-ink-2">{fmt(copy.body, vars)}</p>
        </div>
        {canAct ? (
          <div className="flex flex-wrap items-center gap-2">
            {onPage || !href ? (
              <span className="text-[13px] font-semibold text-text-muted">{s.onThisPage}</span>
            ) : (
              <LinkButton href={href} variant="cta">
                {copy.cta}
              </LinkButton>
            )}
            {followUp && "secondary" in copy ? (
              <LinkButton href={followUp} variant="secondary">
                {copy.secondary}
              </LinkButton>
            ) : null}
          </div>
        ) : null}
      </div>
    </Tile>
  );
}

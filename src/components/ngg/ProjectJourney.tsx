import { formatMonth } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/domain/shared/enums";
import type { Wave } from "@/server/db/schema";

/** The Measure → Understand → Act → Measure again timeline (spec §8.1). */
export function ProjectJourney({ waves, locale, t }: { waves: Array<Wave & { counts: { started: number; completed: number } }>; locale: Locale; t: Dictionary }) {
  if (waves.length === 0) return <p className="text-[14px] text-text-muted">{t.projects.noWave}</p>;
  return (
    <ol className="flex flex-col gap-2">
      {waves.map((wave) => {
        const done = wave.status === "closed";
        const now = wave.status === "open";
        return (
          <li key={wave.id} className={cn("flex items-center gap-3 rounded-[16px] px-4 py-3", now ? "bg-ink text-white" : "bg-sunken")}>
            <span
              aria-hidden="true"
              className={cn(
                "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-black",
                done ? "bg-success-bg text-success" : now ? "bg-accent text-white" : "border border-dashed border-line-dashed text-text-muted",
              )}
            >
              {done ? "✓" : wave.code}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-[14px] font-bold">
                {wave.code} · {wave.name}
              </p>
              <p className={cn("text-[12px]", now ? "text-on-dark-muted" : "text-text-muted")}>
                {formatMonth(wave.startAt ?? wave.createdAt, locale)} · {t.waveStatus[wave.status]}
                {wave.counts.completed ? ` · ${wave.counts.completed} ${t.projects.responses}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

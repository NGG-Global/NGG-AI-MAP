/** Progress bar that fills in reading direction (right → left in RTL). */
export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-[var(--client-accent,#15151f)]" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[12px] font-semibold text-text-muted" dir="ltr">
        {pct}%
      </span>
    </div>
  );
}

import { formatDelta } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Locale } from "@/domain/shared/enums";

export interface DeltaProps {
  value: number | null | undefined;
  locale: Locale;
  /** Deltas below this magnitude are shown as "no material change". */
  threshold?: number;
  digits?: number;
  suffix?: string;
  /** For metrics where a decrease is desirable (e.g. barriers). */
  invert?: boolean;
  className?: string;
  size?: "sm" | "md";
  notComparable?: boolean;
}

/**
 * Direction is always carried by an arrow glyph *and* text, never by colour alone (spec §23.3).
 * Negative numbers are isolated with <bdi dir="ltr"> so RTL text does not flip the sign.
 */
export function Delta({ value, locale, threshold = 0.15, digits = 1, suffix, invert = false, className, size = "md", notComparable }: DeltaProps) {
  const labels = locale === "he"
    ? { none: "ללא שינוי מהותי", na: "לא בר השוואה", up: "עלייה", down: "ירידה" }
    : { none: "No material change", na: "Not comparable", up: "Up", down: "Down" };
  const sizeClass = size === "sm" ? "text-[12px]" : "text-[13px]";
  if (notComparable) {
    return <span className={cn("inline-flex items-center gap-1 text-text-muted", sizeClass, className)}>⚠ {labels.na}</span>;
  }
  if (value == null || Number.isNaN(value)) return <span className={cn("text-text-muted", sizeClass, className)}>—</span>;
  const material = Math.abs(value) >= threshold;
  if (!material) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-text-muted", sizeClass, className)} title={labels.none}>
        ≈ <bdi dir="ltr">{formatDelta(value, locale, digits)}{suffix ?? ""}</bdi>
      </span>
    );
  }
  const positive = invert ? value < 0 : value > 0;
  const arrow = value > 0 ? "↑" : "↓";
  return (
    <span
      className={cn("inline-flex items-center gap-1 font-semibold", positive ? "text-success" : "text-danger", sizeClass, className)}
      aria-label={`${value > 0 ? labels.up : labels.down} ${formatDelta(value, locale, digits)}`}
    >
      <span aria-hidden="true">{arrow}</span>
      <bdi dir="ltr">{formatDelta(Math.abs(value), locale, digits).replace(/^[+−]/, "")}{suffix ?? ""}</bdi>
    </span>
  );
}

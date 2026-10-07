import { cn } from "@/lib/cn";
import type { Locale } from "@/domain/shared/enums";

/** The privacy-protected state: shown as hidden, never silently removed (design §1.6, spec §28). */
export function PrivacyProtected({ locale, compact = false, className, threshold }: { locale: Locale; compact?: boolean; className?: string; threshold?: number }) {
  const text = locale === "he"
    ? { body: "הנתונים בקבוצה זו אינם מוצגים כדי לשמור על פרטיות המשיבים.", hint: "ניתן לבחור פילוח רחב יותר כדי להציג את התוצאות.", n: threshold ? `n < ${threshold}` : "" }
    : { body: "Data for this group are not shown, to protect respondents' privacy.", hint: "Choose a broader segment to show the results.", n: threshold ? `n < ${threshold}` : "" };
  return (
    <div
      role="note"
      className={cn(
        "flex items-center gap-3 rounded-[16px] border border-dashed border-line-dashed text-text-muted",
        compact ? "px-3 py-2 text-[12px]" : "px-4 py-3 text-[13px]",
        className,
      )}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
      {/* Copy §20: primary line, plus the secondary hint where there is room. */}
      <span>
        <strong className="font-semibold">{text.body}</strong>
        {compact ? null : <span className="block">{text.hint}</span>}
        {text.n ? <bdi dir="ltr" className="ms-2 text-[12px]">{text.n}</bdi> : null}
      </span>
    </div>
  );
}

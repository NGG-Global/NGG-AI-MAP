import Link from "next/link";
import { cn } from "@/lib/cn";
import type { Dictionary } from "@/lib/i18n";
import type { SegmentRef } from "@/domain/measurement/engine";

/** Filter capsules. Each option is a link, so the filtered view is addressable and server-rendered. */
export function SegmentFilter({ options, current, hrefFor, t }: { options: Record<string, string[]>; current: SegmentRef; hrefFor: (seg: SegmentRef) => string; t: Dictionary }) {
  const keys = ["department", "role_family", "is_manager", "seniority", "location"] as const;
  const label = (key: string, value: string) => (key === "is_manager" ? (value === "true" ? t.results.managersValue : t.results.employeesValue) : value);
  const pill = (active: boolean) => cn("inline-flex h-9 items-center rounded-full px-3 text-[12px] font-semibold no-underline", active ? "bg-ink text-white" : "bg-surface text-ink-2 hover:bg-muted");
  return (
    <nav aria-label={t.results.segment} className="flex flex-wrap items-center gap-2">
      <Link href={hrefFor({ key: "all", value: "all" })} className={pill(current.key === "all")}>{t.results.allOrganization}</Link>
      {keys.map((key) => {
        const values = options[key];
        if (!values?.length) return null;
        return (
          <span key={key} className="flex flex-wrap items-center gap-1 rounded-full bg-sunken p-1 ps-3">
            <span className="me-1 text-[11px] text-text-muted">{t.results[key]}</span>
            {[...values].sort().map((value) => (
              <Link key={value} href={hrefFor({ key, value })} className={pill(current.key === key && current.value === value)}>{label(key, value)}</Link>
            ))}
          </span>
        );
      })}
    </nav>
  );
}

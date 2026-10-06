import Link from "next/link";
import { cn } from "@/lib/cn";

export interface SegmentedOption {
  value: string;
  label: string;
  href?: string;
}

/** Pill segmented control. Use `href` for navigation, or a form with `name` for filters. */
export function Segmented({ options, value, name, ariaLabel, className }: { options: SegmentedOption[]; value: string; name?: string; ariaLabel?: string; className?: string }) {
  return (
    <div role={name ? "radiogroup" : "tablist"} aria-label={ariaLabel} className={cn("inline-flex flex-wrap gap-1 rounded-full bg-muted p-1", className)}>
      {options.map((option) => {
        const active = option.value === value;
        const cls = cn("inline-flex h-9 items-center rounded-full px-4 text-[13px] font-semibold", active ? "bg-ink text-white" : "text-ink-2 hover:bg-line");
        if (option.href) {
          return (
            <Link key={option.value} href={option.href} role="tab" aria-selected={active} className={cls}>
              {option.label}
            </Link>
          );
        }
        return (
          <label key={option.value} className={cn(cls, "cursor-pointer")}>
            <input type="radio" name={name} value={option.value} defaultChecked={active} className="sr-only" />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

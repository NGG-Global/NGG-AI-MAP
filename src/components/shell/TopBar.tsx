import Link from "next/link";
import type { ReactNode } from "react";

export interface Crumb {
  label: string;
  href?: string;
}

/** Capsule top bar: breadcrumb capsule + optional actions capsule (design §3 "Capsule bar"). */
export function TopBar({ crumbs, ariaLabel, actions, demoLabel }: { crumbs: Crumb[]; ariaLabel: string; actions?: ReactNode; demoLabel?: string }) {
  return (
    <header className="flex flex-wrap items-center gap-3">
      <nav aria-label={ariaLabel} className="flex h-[52px] items-center gap-2 rounded-full bg-surface px-5 text-[14px]">
        {crumbs.map((crumb, index) => (
          <span key={`${crumb.label}-${index}`} className="flex items-center gap-2">
            {index > 0 ? <span aria-hidden="true" className="text-text-muted">/</span> : null}
            {crumb.href ? (
              <Link href={crumb.href} className="font-semibold text-ink-2 no-underline hover:text-ink">
                {crumb.label}
              </Link>
            ) : (
              <span className="font-bold">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>
      {demoLabel ? <span className="inline-flex h-[52px] items-center rounded-full bg-warning-bg px-4 text-[12px] font-semibold text-warning-text">{demoLabel}</span> : null}
      {actions ? <div className="ms-auto flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}

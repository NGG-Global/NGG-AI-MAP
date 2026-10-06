import type { ReactNode } from "react";

/** Sentence headline: says what is happening, not just the page name (design §1.2). */
export function Headline({ eyebrow, children, actions }: { eyebrow?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-[13px] font-medium text-text-muted">{eyebrow}</p> : null}
        <h1 className="text-[32px] font-extrabold leading-[1.1] tracking-tight md:text-[40px]">{children}</h1>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

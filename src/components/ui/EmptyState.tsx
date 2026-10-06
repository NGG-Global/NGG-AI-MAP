import type { ReactNode } from "react";

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[20px] border border-dashed border-line-dashed p-6">
      <p className="text-[16px] font-bold">{title}</p>
      {body ? <p className="max-w-prose text-[14px] text-text-muted">{body}</p> : null}
      {action}
    </div>
  );
}

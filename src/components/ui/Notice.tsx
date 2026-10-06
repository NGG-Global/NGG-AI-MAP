import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "info" | "warning" | "danger" | "success" | "accent";
const toneClass: Record<Tone, string> = {
  info: "bg-info-bg text-info",
  warning: "bg-warning-bg text-warning-text",
  danger: "bg-danger-bg text-danger",
  success: "bg-success-bg text-success",
  accent: "bg-accent-soft text-accent-deep",
};
const glyph: Record<Tone, string> = { info: "i", warning: "!", danger: "!", success: "✓", accent: "AI" };

export function Notice({ tone = "info", children, className, role }: { tone?: Tone; children: ReactNode; className?: string; role?: "alert" | "status" }) {
  return (
    <div role={role} className={cn("flex items-start gap-3 rounded-[16px] px-4 py-3 text-[13px]", toneClass[tone], className)}>
      <span aria-hidden="true" className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/70 px-1 text-[11px] font-black">
        {glyph[tone]}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

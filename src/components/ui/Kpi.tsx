import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Small KPI: big heavy number, quiet label. */
export function Kpi({ label, value, meta, className, tone = "default" }: { label: ReactNode; value: ReactNode; meta?: ReactNode; className?: string; tone?: "default" | "onDark" }) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className={cn("text-[13px] font-medium", tone === "onDark" ? "text-on-dark-muted" : "text-text-muted")}>{label}</span>
      <span className="text-[34px] font-black leading-none tracking-tight">{value}</span>
      {meta ? <span className={cn("text-[12px]", tone === "onDark" ? "text-on-dark-muted" : "text-text-muted")}>{meta}</span> : null}
    </div>
  );
}

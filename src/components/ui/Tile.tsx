import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "default" | "accent" | "ink" | "sunken" | "dashed";

const toneClass: Record<Tone, string> = {
  default: "bg-surface text-ink",
  accent: "bg-accent text-white",
  ink: "bg-ink text-white",
  sunken: "bg-sunken text-ink",
  dashed: "border border-dashed border-line-dashed bg-transparent text-text-muted",
};

export interface TileProps {
  tone?: Tone;
  className?: string;
  children: ReactNode;
  as?: "div" | "section" | "article" | "aside";
  padding?: "default" | "hero" | "none";
  "aria-label"?: string;
  role?: string;
}

/** The basic container of the design system: white rounded tile, no border, no shadow. */
export function Tile({ tone = "default", className, children, as = "section", padding = "default", ...rest }: TileProps) {
  const Component = as;
  return (
    <Component
      className={cn(
        "rounded-[28px]",
        padding === "default" && "p-6",
        padding === "hero" && "p-7 md:p-8",
        toneClass[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}

export function TileTitle({ children, className, trailing }: { children: ReactNode; className?: string; trailing?: ReactNode }) {
  return (
    <div className={cn("mb-4 flex items-center justify-between gap-3", className)}>
      <h2 className="text-[18px] font-bold leading-tight">{children}</h2>
      {trailing}
    </div>
  );
}

/** Sunken row inside a tile. Tables in the design are stacks of these. */
export function InnerRow({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: "div" | "li" }) {
  const Component = as;
  return <Component className={cn("rounded-[16px] bg-sunken px-4 py-3", className)}>{children}</Component>;
}

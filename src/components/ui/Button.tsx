import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "cta" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantClass: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-ink-2",
  cta: "bg-accent text-white hover:bg-accent-strong",
  secondary: "bg-muted text-ink hover:bg-line",
  ghost: "bg-transparent text-ink hover:bg-muted",
  danger: "bg-danger-bg text-danger hover:bg-[#f5d5db]",
};

const sizeClass: Record<Size, string> = {
  sm: "h-9 px-4 text-[13px]",
  md: "h-11 px-5 text-[14px]",
  lg: "h-[52px] px-6 text-[15px]",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = "primary", size = "md", className, type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={cn(base, variantClass[variant], sizeClass[size], className)} {...rest} />;
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  prefetch,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  prefetch?: boolean;
}) {
  return (
    <Link href={href} prefetch={prefetch} className={cn(base, variantClass[variant], sizeClass[size], className)}>
      {children}
    </Link>
  );
}

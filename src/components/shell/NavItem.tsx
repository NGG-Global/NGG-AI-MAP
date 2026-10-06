"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function NavItem({ href, children, icon, badge, exact = false }: { href: string; children: ReactNode; icon?: ReactNode; badge?: ReactNode; exact?: boolean }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-11 items-center gap-3 rounded-full px-4 text-[14px] font-semibold transition-colors",
        active ? "bg-ink text-white" : "text-ink-2 hover:bg-muted",
      )}
    >
      {icon ? <span aria-hidden="true" className={cn("inline-flex h-5 w-5 items-center justify-center", active ? "text-accent-on-dark" : "text-text-muted")}>{icon}</span> : null}
      <span className="flex-1">{children}</span>
      {badge != null ? <span className={cn("rounded-full px-2 text-[11px] font-bold", active ? "bg-ink-3 text-white" : "bg-muted text-ink-2")}>{badge}</span> : null}
    </Link>
  );
}

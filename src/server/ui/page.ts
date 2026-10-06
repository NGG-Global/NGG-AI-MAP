import "server-only";
import { getDictionary, dirFor, type Dictionary } from "@/lib/i18n";
import { requireClientContext, requireNggContext, type RequestContext } from "@/server/auth/current";
import type { Actor } from "@/domain/authz/policy";
import type { Locale } from "@/domain/shared/enums";

export interface PageContext<A extends Actor = Actor> {
  ctx: RequestContext & { actor: A };
  locale: Locale;
  dir: "rtl" | "ltr";
  t: Dictionary;
}

export async function nggPage(): Promise<PageContext<Extract<Actor, { kind: "ngg" }>>> {
  const ctx = await requireNggContext();
  const locale = ctx.user.locale;
  return { ctx, locale, dir: dirFor(locale), t: getDictionary(locale) };
}

export async function clientPage(): Promise<PageContext<Extract<Actor, { kind: "client" }>>> {
  const ctx = await requireClientContext();
  const locale = ctx.user.locale;
  return { ctx, locale, dir: dirFor(locale), t: getDictionary(locale) };
}

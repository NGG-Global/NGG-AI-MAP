import "server-only";
import { cookies } from "next/headers";
import { db } from "@/server/db/client";
import { resolveSurvey, type SurveyAccess, type SurveyClosedReason } from "@/server/services/survey";
import { getDictionary, dirFor, type Dictionary } from "@/lib/i18n";
import type { Locale } from "@/domain/shared/enums";
import { env } from "@/server/shared/env";

export const SURVEY_COOKIE_PREFIX = "ngg_survey_";

export interface SurveyPageContext {
  token: string;
  access: SurveyAccess | null;
  closed: SurveyClosedReason | null;
  locale: Locale;
  dir: "rtl" | "ltr";
  t: Dictionary;
}

export async function surveyPage(token: string, localeOverride?: string): Promise<SurveyPageContext> {
  const database = await db();
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(`${SURVEY_COOKIE_PREFIX}${token.slice(0, 16)}`)?.value;
  const result = await resolveSurvey(database, token, cookieToken);
  const access = "access" in result ? result.access : null;
  const closed = "closed" in result ? result.closed : null;
  const locale: Locale = localeOverride === "en" || localeOverride === "he" ? localeOverride : (access?.wave.locale ?? "he");
  return { token, access, closed, locale, dir: dirFor(locale), t: getDictionary(locale) };
}

export async function setSurveyCookie(token: string, respondentToken: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(`${SURVEY_COOKIE_PREFIX}${token.slice(0, 16)}`, respondentToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    maxAge: 60 * 60 * 24 * 30,
    path: `/survey/${token}`,
  });
}

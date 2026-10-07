import { surveyPage } from "@/server/ui/survey";
import { SurveyFrame } from "@/components/survey/SurveyFrame";
import { SurveyClosed } from "@/components/survey/SurveyClosed";
import { summarizeQuestionnaire } from "@/domain/questionnaire/logic";
import { startSurveyAction } from "./actions";
import { lt } from "@/domain/shared/localized";
import { pipe } from "@/domain/questionnaire/piping";
import { fmt } from "@/lib/i18n";
import { Icons } from "@/components/shell/icons";

export const dynamic = "force-dynamic";

export default async function SurveyLanding({ params, searchParams }: PageProps<"/survey/[token]">) {
  const { token } = await params;
  const sp = await searchParams;
  const lang = typeof sp.lang === "string" ? sp.lang : "";
  const ctx = await surveyPage(token, lang);
  const { t, locale, dir } = ctx;
  if (!ctx.access) return <SurveyClosed reason={ctx.closed ?? "invalid"} t={t.survey} locale={locale} dir={dir} />;
  if (ctx.access.kind === "respondent" && ctx.access.respondent.status === "completed") return <SurveyClosed reason="completed" t={t.survey} locale={locale} dir={dir} />;
  const { client, definition, wave } = ctx.access;
  const summary = summarizeQuestionnaire(definition);
  const resuming = ctx.access.kind === "respondent" && ctx.access.respondent.status === "started";
  const sections = definition.sections.length;
  const otherLang = locale === "he" ? "en" : "he";
  const piping = { orgName: client.name, minutes: summary.estimatedMinutesEmployee };
  const privacy = definition.privacyNote
    ? [pipe(definition.privacyNote, undefined, locale, piping), wave.privacyMode === "pseudonymous" && definition.privacyNotePseudonymous ? lt(definition.privacyNotePseudonymous, locale) : ""].filter(Boolean).join("\n\n")
    : fmt(t.survey.protectedBody, { n: client.privacyThreshold });
  return (
    <SurveyFrame client={client} locale={locale} dir={dir} langHref={`/survey/${token}?lang=${otherLang}`} langLabel={t.survey.langSwitch}>
      <section className="rounded-[32px] bg-surface p-7">
        <p className="text-[12px] font-semibold text-text-muted">
          {t.survey.mappingSurvey} · {client.name}
        </p>
        <h1 className="mt-2 text-[34px] font-black leading-[1.1] tracking-tight">{lt(definition.title, locale)}</h1>
        {definition.intro ? <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-2">{pipe(definition.intro, undefined, locale, piping)}</p> : null}
        <div className="mt-6 grid grid-cols-3 gap-2">
          <div className="rounded-[20px] bg-sunken p-4 text-center">
            <p className="text-[28px] font-black leading-none">{summary.estimatedMinutesEmployee}</p>
            <p className="mt-1 text-[11px] text-text-muted">{t.survey.minutesApprox}</p>
          </div>
          <div className="rounded-[20px] bg-sunken p-4 text-center">
            <p className="text-[28px] font-black leading-none">{sections}</p>
            <p className="mt-1 text-[11px] text-text-muted">{t.survey.shortParts}</p>
          </div>
          <div className="rounded-[20px] bg-sunken p-4 text-center">
            <p className="flex justify-center text-ink" aria-hidden="true"><Icons.lock /></p>
            <p className="mt-1 text-[11px] text-text-muted">{wave.privacyMode === "anonymous" ? t.survey.anonymous : t.survey.pseudonymous}</p>
          </div>
        </div>
      </section>
      <section className="rounded-[28px] bg-surface p-6">
        <h2 className="text-[16px] font-bold">{t.survey.protectedTitle}</h2>
        <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed text-ink-2">{privacy}</p>
        <p className="mt-3 flex items-center gap-2 text-[12px] text-text-muted">
          <Icons.check width={14} height={14} /> {t.survey.autosave}
        </p>
      </section>
      <form action={startSurveyAction} className="mt-auto flex flex-col gap-3">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="lang" value={lang} />
        <button type="submit" className="flex h-[58px] items-center justify-center gap-2 rounded-full bg-[var(--client-accent,#ec2a8c)] text-[16px] font-bold text-white">
          {resuming ? t.survey.resume : definition.startLabel ? lt(definition.startLabel, locale) : t.survey.start}
          <Icons.forward />
        </button>
        {client.surveyContact ? (
          <a href={`mailto:${client.surveyContact}`} className="text-center text-[12px] text-text-muted">
            {t.survey.contact}
          </a>
        ) : null}
      </form>
    </SurveyFrame>
  );
}

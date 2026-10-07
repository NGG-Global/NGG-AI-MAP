import { redirect } from "next/navigation";
import { db } from "@/server/db/client";
import { surveyPage } from "@/server/ui/survey";
import { computeProgress, loadAnswers } from "@/server/services/survey";
import { SurveyFrame } from "@/components/survey/SurveyFrame";
import { SurveyClosed } from "@/components/survey/SurveyClosed";
import { SectionForm } from "@/components/survey/SectionForm";
import { ProgressBar } from "@/components/survey/ProgressBar";
import { lt } from "@/domain/shared/localized";
import { fmt } from "@/lib/i18n";
import { SECONDS_PER_QUESTION } from "@/domain/questionnaire/library";
import { audienceMatches } from "@/domain/questionnaire/logic";
import { pipe, resolvePrimaryTool } from "@/domain/questionnaire/piping";

export const dynamic = "force-dynamic";

export default async function SurveySectionPage({ params, searchParams }: PageProps<"/survey/[token]/s/[index]">) {
  const { token, index: indexRaw } = await params;
  const sp = await searchParams;
  const lang = typeof sp.lang === "string" ? sp.lang : "";
  const ctx = await surveyPage(token, lang);
  const { t, locale, dir } = ctx;
  if (!ctx.access) return <SurveyClosed reason={ctx.closed ?? "invalid"} t={t.survey} locale={locale} dir={dir} />;
  if (ctx.access.kind !== "respondent") redirect(`/survey/${token}${lang ? `?lang=${lang}` : ""}`);
  const { client, definition, respondent } = ctx.access;
  if (respondent.status === "completed") return <SurveyClosed reason="completed" t={t.survey} locale={locale} dir={dir} />;
  const answers = await loadAnswers(await db(), respondent.id);
  const progress = computeProgress(definition, respondent, answers);
  const requested = Number(indexRaw);
  // Respondents can revisit earlier sections but never skip ahead of the first incomplete one.
  const index = Number.isInteger(requested) ? Math.max(0, Math.min(requested, progress.nextIndex, progress.routed.length - 1)) : 0;
  if (index !== requested) redirect(`/survey/${token}/s/${index}${lang ? `?lang=${lang}` : ""}`);
  const entry = progress.routed[index]!;
  const isManager = respondent.segmentAttributes.is_manager;
  const sectionQuestions = entry.section.questions.filter((q) => audienceMatches(q.audience, isManager));
  const missing = sp.missing === "1";
  const minutes = Math.max(1, Math.round(entry.questions.reduce((s, q) => s + (SECONDS_PER_QUESTION[q.type] ?? 10), 0) / 60));
  const scale = entry.questions.find((q) => q.scale)?.scale;
  const primaryAiTool = resolvePrimaryTool(definition, answers, locale);
  const intro = entry.section.clientNote ? lt(entry.section.clientNote, locale) : pipe(entry.section.intro, entry.section.fallbackIntro, locale, { primaryAiTool, orgName: client.name });
  const offersPnta = sectionQuestions.some((q) => q.allowPreferNotToAnswer);
  return (
    <SurveyFrame
      client={client}
      locale={locale}
      dir={dir}
      header={
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold">{lt(entry.section.displayTitle ?? entry.section.title, locale)}</p>
          <ProgressBar value={progress.answeredCount} max={progress.totalCount} label={t.survey.progress} />
        </div>
      }
    >
      <section className="rounded-[28px] bg-surface p-6">
        <p className="text-[12px] font-semibold text-text-muted">{fmt(t.survey.partOf, { n: index + 1, total: progress.routed.length })}</p>
        <h1 className="mt-1 text-[26px] font-black leading-tight">{lt(entry.section.displayTitle ?? entry.section.title, locale)}</h1>
        {intro ? <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-ink-2">{intro}</p> : null}
        <p className="mt-3 flex flex-wrap gap-2 text-[12px] text-text-muted">
          <span className="rounded-full bg-muted px-3 py-1">{fmt(t.survey.aboutMinutes, { n: minutes })}</span>
          {scale ? <span className="rounded-full bg-muted px-3 py-1">{fmt(t.survey.scale, { min: scale.min, max: scale.max })}</span> : null}
        </p>
        {entry.section.allowPreferNotToAnswer && offersPnta ? <p className="mt-3 text-[12px] text-text-muted">{t.survey.sectionHint}</p> : null}
      </section>
      <SectionForm
        token={token}
        lang={lang}
        index={index}
        isLast={index === progress.routed.length - 1}
        questions={sectionQuestions}
        answers={answers}
        attributes={respondent.segmentAttributes as Record<string, string | boolean>}
        missing={missing}
        primaryAiTool={primaryAiTool}
        t={t.survey}
        locale={locale}
      />
    </SurveyFrame>
  );
}

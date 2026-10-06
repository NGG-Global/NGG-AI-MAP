import { surveyPage } from "@/server/ui/survey";
import { SurveyFrame } from "@/components/survey/SurveyFrame";
import { SurveyClosed } from "@/components/survey/SurveyClosed";
import { NggLogo } from "@/components/shell/NggLogo";
import { formatDate } from "@/lib/format";
import { fmt } from "@/lib/i18n";
import { Icons } from "@/components/shell/icons";

export const dynamic = "force-dynamic";

export default async function SurveyDonePage({ params, searchParams }: PageProps<"/survey/[token]/done">) {
  const { token } = await params;
  const sp = await searchParams;
  const ctx = await surveyPage(token, typeof sp.lang === "string" ? sp.lang : "");
  const { t, locale, dir } = ctx;
  if (!ctx.access) return <SurveyClosed reason={ctx.closed === "completed" ? "completed" : (ctx.closed ?? "invalid")} t={t.survey} locale={locale} dir={dir} />;
  const { client, wave } = ctx.access;
  const steps = [wave.endAt ? fmt(t.survey.step1, { date: formatDate(wave.endAt, locale) }) : t.survey.step1NoDate, t.survey.step2, t.survey.step3];
  return (
    <SurveyFrame client={client} locale={locale} dir={dir}>
      <section className="rounded-[32px] bg-surface p-7">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-success-bg text-success" aria-hidden="true">
          <Icons.check />
        </span>
        <h1 className="mt-4 text-[34px] font-black leading-[1.1]">
          {t.survey.thanksTitle}
          <br />
          {t.survey.thanksSaved}
        </h1>
        <p className="mt-3 text-[15px] text-ink-2">{t.survey.thanksBody}</p>
      </section>
      <section className="rounded-[28px] bg-surface p-6">
        <h2 className="text-[16px] font-bold">{t.survey.whatNext}</h2>
        <ol className="mt-3 flex flex-col gap-2">
          {steps.map((step, i) => (
            <li key={i} className="flex items-center gap-3 rounded-[16px] bg-sunken px-4 py-3 text-[14px]">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-[12px] font-black text-white" dir="ltr">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </section>
      <section className="flex items-center gap-3 rounded-[28px] bg-surface p-5 text-[12px] text-text-muted" aria-label="NGG">
        <NggLogo compact />
        <span>{t.survey.aboutNgg}</span>
      </section>
    </SurveyFrame>
  );
}

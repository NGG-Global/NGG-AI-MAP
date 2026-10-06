import { nggPage } from "@/server/ui/page";
import { listLibrary } from "@/server/services/library";
import { TopBar } from "@/components/shell/TopBar";
import { Headline } from "@/components/ui/Headline";
import { Tile, TileTitle } from "@/components/ui/Tile";
import { SourceBadge, StatusPill } from "@/components/ui/StatusPill";
import { lt } from "@/domain/shared/localized";
import { fmt } from "@/lib/i18n";
import { SECTION_CATEGORIES } from "@/domain/shared/enums";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<(typeof SECTION_CATEGORIES)[number], { he: string; en: string }> = {
  core_context: { he: "הקשר ליבה", en: "Core Context" },
  ai_adoption: { he: "אימוץ AI", en: "AI Adoption" },
  validated_measures: { he: "מדדים מתוקפים", en: "Validated Measures" },
  ngg_measures: { he: "מדדי NGG", en: "NGG Measures" },
  outcomes: { he: "תוצאות", en: "Outcomes" },
  qualitative: { he: "איכותני", en: "Qualitative" },
  custom: { he: "מותאם", en: "Custom" },
};

export default async function QuestionnairesPage() {
  const { ctx, t, locale } = await nggPage();
  const library = await listLibrary(ctx);
  return (
    <>
      <TopBar crumbs={[{ label: "NGG", href: "/ngg" }, { label: t.nav.questionnaires }]} ariaLabel={t.nav.breadcrumb} />
      <Tile padding="hero">
        <Headline eyebrow={t.builder.libraryPageSubtitle}>{t.builder.library}</Headline>
      </Tile>
      {SECTION_CATEGORIES.map((category) => {
        const entries = library.filter((e) => e.section.category === category);
        if (!entries.length) return null;
        return (
          <Tile key={category}>
            <TileTitle>{CATEGORY_LABELS[category][locale]}</TileTitle>
            <ul className="flex flex-col gap-2">
              {entries.map(({ section, questions }) => (
                <li key={section.key} className="rounded-[16px] bg-sunken px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14px] font-bold">{lt(section.name, locale)}</p>
                    <SourceBadge sourceType={section.sourceType} researchStatus={section.researchStatus} locale={locale} />
                    {section.audience === "managers" ? <StatusPill tone="ink" dot={false}>{t.builder.manager}</StatusPill> : null}
                    {section.recommendedCore ? <StatusPill tone="neutral" dot={false}>{t.builder.recommendedCore}</StatusPill> : null}
                    {section.mandatory ? <StatusPill tone="warning" dot={false}>{t.common.required}</StatusPill> : null}
                    <span className="ms-auto text-[12px] text-text-muted" dir="ltr">
                      v{section.version} · {fmt(t.builder.questionsCount, { n: questions.length })}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-text-muted">{lt(section.description, locale)}</p>
                  {section.sourceReference ? (
                    <p className="mt-1 text-[11px] text-text-muted">
                      {t.builder.sourceReference}: {section.sourceReference}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </Tile>
        );
      })}
    </>
  );
}

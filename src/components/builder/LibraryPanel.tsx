import { Tile, TileTitle } from "@/components/ui/Tile";
import { SourceBadge, StatusPill } from "@/components/ui/StatusPill";
import { Button } from "@/components/ui/Button";
import { lt } from "@/domain/shared/localized";
import { fmt, type Dictionary } from "@/lib/i18n";
import type { Locale } from "@/domain/shared/enums";
import type { LibrarySectionWithQuestions } from "@/server/services/library";
import { addSectionAction } from "@/app/(ngg)/ngg/clients/[clientId]/projects/[projectId]/assessment/actions";

export function LibraryPanel({
  library,
  usedKeys,
  baselineKeys,
  versionId,
  clientId,
  projectId,
  editable,
  t,
  locale,
}: {
  library: LibrarySectionWithQuestions[];
  usedKeys: Set<string>;
  baselineKeys: Set<string>;
  versionId: string;
  clientId: string;
  projectId: string;
  editable: boolean;
  t: Dictionary;
  locale: Locale;
}) {
  const b = t.builder;
  const available = library.filter((e) => !usedKeys.has(e.section.key));
  return (
    <Tile as="aside" className="flex flex-col gap-3">
      <TileTitle trailing={<span className="text-[13px] font-bold text-text-muted">{available.length}</span>}>{b.library}</TileTitle>
      <ul className="flex flex-col gap-2">
        {available.map(({ section, questions }) => (
          <li key={section.key} className="flex items-start gap-3 rounded-[16px] bg-sunken px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold">{lt(section.name, locale)}</p>
              <p className="mt-0.5 line-clamp-2 text-[12px] text-text-muted">{lt(section.description, locale)}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-text-muted">
                <SourceBadge sourceType={section.sourceType} researchStatus={section.researchStatus} locale={locale} />
                {section.audience === "managers" ? <StatusPill tone="ink" dot={false}>{b.manager}</StatusPill> : null}
                {baselineKeys.has(section.key) ? <StatusPill tone="warning" dot={false}>{locale === "he" ? "היה ב-Baseline" : "Was in baseline"}</StatusPill> : null}
                <span>{fmt(b.questionsCount, { n: questions.length })}</span>
              </div>
            </div>
            {editable ? (
              <form action={addSectionAction}>
                <input type="hidden" name="clientId" value={clientId} />
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="versionId" value={versionId} />
                <input type="hidden" name="sectionKey" value={section.key} />
                <Button type="submit" variant="secondary" size="sm" aria-label={`${b.addSection}: ${lt(section.name, locale)}`}>
                  +
                </Button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="text-[12px] text-text-muted">{fmt(b.libraryInQuestionnaire, { n: usedKeys.size })}</p>
    </Tile>
  );
}

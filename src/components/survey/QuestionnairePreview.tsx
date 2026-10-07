import { routeQuestionnaire, type RoutingContext } from "@/domain/questionnaire/logic";
import { lt } from "@/domain/shared/localized";
import { previewText } from "@/domain/questionnaire/piping";
import { StatusPill } from "@/components/ui/StatusPill";
import type { QuestionnaireDefinition, QuestionDefinition } from "@/domain/questionnaire/definition";
import type { Locale } from "@/domain/shared/enums";

function scaleLabels(q: QuestionDefinition) {
  if (!q.scale) return [];
  const { min, max, labels } = q.scale;
  return labels ?? Array.from({ length: max - min + 1 }, (_, i) => ({ he: String(i + min), en: String(i + min) }));
}

/** Read-only rendering of the routed questionnaire for a persona (spec §16). */
export function QuestionnairePreview({ definition, persona, locale }: { definition: QuestionnaireDefinition; persona: RoutingContext; locale: Locale }) {
  const routed = routeQuestionnaire(definition, persona);
  return (
    <div className="flex flex-col gap-4">
      <header className="rounded-[28px] bg-surface p-6">
        <h1 className="text-[26px] font-extrabold">{lt(definition.title, locale)}</h1>
        {definition.intro ? <p className="mt-2 whitespace-pre-line text-[14px] text-text-muted">{previewText(definition.intro, locale)}</p> : null}
        {definition.privacyNote ? <p className="mt-2 whitespace-pre-line text-[12px] text-text-muted">{previewText(definition.privacyNote, locale)}</p> : null}
      </header>
      {routed.map(({ section, questions }, index) => (
        <section key={section.id} className="rounded-[28px] bg-surface p-6">
          <p className="text-[12px] font-semibold text-text-muted" dir="ltr">
            {index + 1} / {routed.length}
          </p>
          <h2 className="text-[20px] font-bold">{lt(section.displayTitle ?? section.title, locale)}</h2>
          <p className="mt-1 whitespace-pre-line text-[13px] text-text-muted">{section.clientNote ? lt(section.clientNote, locale) : previewText(section.intro ?? section.description, locale)}</p>
          <ol className="mt-4 flex flex-col gap-3">
            {questions.map((q, qi) => (
              <li key={q.id} className="rounded-[16px] bg-sunken px-4 py-3">
                <p className="text-[14px] font-semibold">
                  <span className="me-2 text-text-muted" dir="ltr">
                    {qi + 1}.
                  </span>
                  {previewText(q.text, locale)}
                  {q.required ? <span className="ms-1 text-accent-text">*</span> : null}
                </p>
                {q.helpText ? <p className="mt-1 text-[12px] text-text-muted">{lt(q.helpText, locale)}</p> : null}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {q.scale ? (
                    <>
                      {scaleLabels(q).map((label, i) => (
                        <StatusPill key={i} tone="neutral" dot={false}>
                          <bdi dir="ltr">{i + (q.scale?.min ?? 1)}</bdi> {lt(label, locale)}
                        </StatusPill>
                      ))}
                      {q.naOption ? <StatusPill tone="neutral" dot={false} className="border border-dashed border-line-dashed bg-transparent">{lt(q.naOption, locale)}</StatusPill> : null}
                    </>
                  ) : q.options ? (
                    q.options.map((o) => (
                      <StatusPill key={o.value} tone="neutral" dot={false}>
                        {lt(o.label, locale)}
                      </StatusPill>
                    ))
                  ) : q.matrixRows ? (
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr>
                          <th className="text-start"></th>
                          {q.matrixColumns?.map((c) => (
                            <th key={c.value} className="px-2 py-1 font-semibold">
                              {lt(c.label, locale)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {q.matrixRows.map((row) => (
                          <tr key={row.key} className="border-t border-line">
                            <td className="py-1 font-semibold">{lt(row.label, locale)}</td>
                            {q.matrixColumns?.map((c) => (
                              <td key={c.value} className="px-2 py-1 text-center text-text-muted">
                                ○
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <span className="w-full rounded-[10px] border border-dashed border-line-dashed px-3 py-2 text-[12px] text-text-muted">{q.type === "numeric" ? "123" : "…"}</span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

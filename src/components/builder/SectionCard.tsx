"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { moveSectionAction, removeSectionAction } from "@/app/(ngg)/ngg/clients/[clientId]/projects/[projectId]/assessment/actions";
import { SourceBadge, StatusPill } from "@/components/ui/StatusPill";
import { Button } from "@/components/ui/Button";
import { ActionNotice } from "@/components/forms/ActionNotice";
import { QuestionRow } from "./QuestionRow";
import { CustomQuestionForm } from "./CustomQuestionForm";
import { lt } from "@/domain/shared/localized";
import { fmt, type Dictionary } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import type { SectionDefinition } from "@/domain/questionnaire/definition";
import type { Locale } from "@/domain/shared/enums";

const PREVIEW_COUNT = 3;

export function SectionCard({
  section,
  index,
  total,
  selected,
  versionId,
  clientId,
  projectId,
  editable,
  selectHref,
  t,
  locale,
}: {
  section: SectionDefinition;
  index: number;
  total: number;
  selected: boolean;
  versionId: string;
  clientId: string;
  projectId: string;
  editable: boolean;
  selectHref: string;
  t: Dictionary;
  locale: Locale;
}) {
  const b = t.builder;
  const [expanded, setExpanded] = useState(false);
  const [removeState, removeAction] = useActionState(removeSectionAction, null);
  const hidden = (
    <>
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="versionId" value={versionId} />
      <input type="hidden" name="sectionId" value={section.id} />
    </>
  );
  const routingNote =
    section.audience === "managers"
      ? b.managersOnly
      : section.audience === "employees"
        ? b.employeesOnly
        : section.displayRules.some((r) => r.field === "q:USE_01")
          ? b.skipNonUsers
          : b.allRespondents;
  const shown = expanded ? section.questions : section.questions.slice(0, PREVIEW_COUNT);
  return (
    <li className={cn("rounded-[20px] bg-sunken p-4", selected && "ring-2 ring-accent")}>
      <div className="flex items-start gap-3">
        <span className="mt-1 w-6 text-[13px] font-black text-text-muted" dir="ltr">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <Link href={selectHref} scroll={false} className="text-[15px] font-bold text-ink no-underline hover:text-accent-text">
            {lt(section.displayTitle ?? section.title, locale)}
          </Link>
          <p className="text-[12px] text-text-muted">
            {fmt(b.questionsCount, { n: section.questions.length })} · {routingNote}
            {section.sourceType === "validated" ? ` · ${b.lockedNote}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <SourceBadge sourceType={section.sourceType} researchStatus={section.researchStatus} locale={locale} />
            {section.recommendedCore ? <StatusPill tone="neutral" dot={false}>{b.recommendedCore}</StatusPill> : null}
            {section.displayRules.length ? <StatusPill tone="neutral" dot={false}>{b.routing}</StatusPill> : null}
          </div>
        </div>
        {editable ? (
          <div className="flex shrink-0 items-center gap-1">
            <form action={moveSectionAction}>
              {hidden}
              <input type="hidden" name="direction" value="up" />
              <Button type="submit" variant="ghost" size="sm" disabled={index === 0} aria-label={b.moveUp}>
                ↑
              </Button>
            </form>
            <form action={moveSectionAction}>
              {hidden}
              <input type="hidden" name="direction" value="down" />
              <Button type="submit" variant="ghost" size="sm" disabled={index === total - 1} aria-label={b.moveDown}>
                ↓
              </Button>
            </form>
            <form action={removeAction}>
              {hidden}
              <Button type="submit" variant="ghost" size="sm" aria-label={`${b.remove}: ${lt(section.title, locale)}`}>
                ×
              </Button>
            </form>
          </div>
        ) : null}
      </div>
      <ActionNotice state={removeState} locale={locale} messages={{ section_protected: b.protectedSection, section_mandatory: b.mandatorySection }} />
      <ul className="mt-3 flex flex-col gap-1.5">
        {shown.map((q, qi) => (
          <QuestionRow key={q.id} question={q} index={qi} versionId={versionId} clientId={clientId} projectId={projectId} editable={editable} t={t} locale={locale} />
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {section.questions.length > PREVIEW_COUNT ? (
          <button type="button" className="text-[12px] font-semibold text-accent-text" onClick={() => setExpanded((v) => !v)}>
            {expanded ? b.moreItemsHide : fmt(b.moreItems, { n: section.questions.length - PREVIEW_COUNT })}
          </button>
        ) : null}
        {editable ? <CustomQuestionForm versionId={versionId} sectionId={section.id} clientId={clientId} projectId={projectId} t={t} locale={locale} /> : null}
      </div>
    </li>
  );
}

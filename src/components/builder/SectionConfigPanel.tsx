"use client";

import { useActionState } from "react";
import { updateSectionConfigAction } from "@/app/(ngg)/ngg/clients/[clientId]/projects/[projectId]/assessment/actions";
import { Field, Input, Select, Checkbox, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ActionNotice } from "@/components/forms/ActionNotice";
import { DisplayRulesEditor } from "./DisplayRulesEditor";
import { lt } from "@/domain/shared/localized";
import { fmt, type Dictionary } from "@/lib/i18n";
import type { SectionDefinition } from "@/domain/questionnaire/definition";
import type { Locale } from "@/domain/shared/enums";

export interface SectionComparabilityInfo {
  level: "full" | "partial" | "none" | "new";
  baselineCode: string | null;
}

export function SectionConfigPanel({
  section,
  index,
  versionId,
  clientId,
  projectId,
  editable,
  comparability,
  valueOptions,
  t,
  locale,
}: {
  section: SectionDefinition;
  index: number;
  versionId: string;
  clientId: string;
  projectId: string;
  editable: boolean;
  comparability: SectionComparabilityInfo;
  valueOptions: Record<string, string[]>;
  t: Dictionary;
  locale: Locale;
}) {
  const b = t.builder;
  const [state, action] = useActionState(updateSectionConfigAction, null);
  const compLabel =
    comparability.level === "full"
      ? b.fullyComparable
      : comparability.level === "partial"
        ? b.partiallyComparable
        : comparability.level === "none"
          ? b.notComparable
          : comparability.baselineCode
            ? locale === "he"
              ? "חדש — לא היה ב-Baseline"
              : "New — not in baseline"
            : "—";
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="versionId" value={versionId} />
      <input type="hidden" name="sectionId" value={section.id} />
      <div>
        <p className="text-[12px] font-semibold text-text-muted">{fmt(b.sectionSettings, { n: index + 1 })}</p>
        <h2 className="text-[18px] font-bold">{lt(section.title, locale)}</h2>
      </div>
      <Field label={b.displayTitle} htmlFor="displayTitle">
        <Input id="displayTitle" name="displayTitle" defaultValue={section.displayTitle?.he ?? ""} placeholder={section.title.he} disabled={!editable} />
      </Field>
      <Field label={b.clientNote} htmlFor="clientNote">
        <Textarea id="clientNote" name="clientNote" defaultValue={section.clientNote?.he ?? ""} disabled={!editable} className="min-h-16" />
      </Field>
      <Field label={b.audience} htmlFor="audience">
        <Select id="audience" name="audience" defaultValue={section.audience} disabled={!editable}>
          <option value="all">{t.common.everyone}</option>
          <option value="managers">{t.common.managers}</option>
          <option value="employees">{t.common.employees}</option>
        </Select>
      </Field>
      <div>
        <p className="mb-1.5 text-[13px] font-semibold text-ink-2">{b.showWhen}</p>
        <DisplayRulesEditor initial={section.displayRules} t={b} valueOptions={valueOptions} />
      </div>
      <div className="flex flex-col gap-2">
        <Checkbox name="required" label={b.required} defaultChecked={section.required} disabled={!editable} />
        <Checkbox name="allowPnta" label={b.allowPnta} defaultChecked={section.allowPreferNotToAnswer} disabled={!editable} />
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-[16px] bg-sunken px-4 py-3 text-[12px]">
        <dt className="text-text-muted">{b.researchStatus}</dt>
        <dd className="font-semibold">{section.sourceType === "validated" ? t.builder.libraryValidated : section.sourceType === "ngg_measure" ? "NGG" : b.customItems}</dd>
        <dt className="text-text-muted">{b.version}</dt>
        <dd className="font-semibold" dir="ltr">
          {section.templateVersion ?? "1.0"}
          {comparability.level === "full" && comparability.baselineCode ? ` · ${fmt(b.sameAsBaseline, { wave: comparability.baselineCode })}` : ""}
        </dd>
        <dt className="text-text-muted">{t.clientTabs.results}</dt>
        <dd className="font-semibold">{compLabel}</dd>
      </dl>
      <p className="text-[12px] text-text-muted">{b.wordingNote}</p>
      <ActionNotice state={state} locale={locale} />
      {editable ? <SubmitButton size="sm">{t.common.save}</SubmitButton> : null}
    </form>
  );
}

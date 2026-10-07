"use client";

import { useActionState, useState } from "react";
import { addCustomQuestionAction } from "@/app/(ngg)/ngg/clients/[clientId]/projects/[projectId]/assessment/actions";
import { Field, Input, Select, Textarea, Checkbox } from "@/components/ui/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ActionNotice } from "@/components/forms/ActionNotice";
import { Button } from "@/components/ui/Button";
import type { Dictionary } from "@/lib/i18n";
import type { Locale, QuestionType } from "@/domain/shared/enums";
import { CUSTOM_QUESTION_TYPES } from "@/domain/shared/enums";

export function CustomQuestionForm({ versionId, sectionId, clientId, projectId, t, locale }: { versionId: string; sectionId: string; clientId: string; projectId: string; t: Dictionary; locale: Locale }) {
  const b = t.builder;
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<QuestionType>("likert_5");
  const [state, action] = useActionState(addCustomQuestionAction, null);
  if (!open) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {b.addCustomQuestion}
      </Button>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-3 rounded-[14px] bg-surface p-3">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="versionId" value={versionId} />
      <input type="hidden" name="sectionId" value={sectionId} />
      <Field label={b.questionText} htmlFor={`cq-text-${sectionId}`}>
        <Textarea id={`cq-text-${sectionId}`} name="text" required className="min-h-16" />
      </Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label={b.questionTextEn} htmlFor={`cq-en-${sectionId}`}>
          <Input id={`cq-en-${sectionId}`} name="textEn" dir="ltr" />
        </Field>
        <Field label={b.questionType} htmlFor={`cq-type-${sectionId}`}>
          <Select id={`cq-type-${sectionId}`} name="type" value={type} onChange={(e) => setType(e.target.value as QuestionType)}>
            {CUSTOM_QUESTION_TYPES.map((qt) => (
              <option key={qt} value={qt}>
                {b.typeLabels[qt]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {type === "single_choice" || type === "multi_select" ? (
        <Field label={b.options} htmlFor={`cq-options-${sectionId}`}>
          <Textarea id={`cq-options-${sectionId}`} name="options" required />
        </Field>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <Field label={b.helpText} htmlFor={`cq-help-${sectionId}`}>
          <Input id={`cq-help-${sectionId}`} name="helpText" />
        </Field>
        <Field label={b.audience} htmlFor={`cq-aud-${sectionId}`}>
          <Select id={`cq-aud-${sectionId}`} name="audience" defaultValue="all">
            <option value="all">{t.common.everyone}</option>
            <option value="managers">{t.common.managers}</option>
            <option value="employees">{t.common.employees}</option>
          </Select>
        </Field>
      </div>
      <Checkbox name="required" label={b.required} defaultChecked />
      <ActionNotice state={state} locale={locale} />
      <div className="flex gap-2">
        <SubmitButton size="sm" variant="cta">
          {b.saveQuestion}
        </SubmitButton>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          {t.common.cancel}
        </Button>
      </div>
    </form>
  );
}

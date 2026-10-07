"use client";

import { useActionState, useState } from "react";
import { updateIntroAction } from "@/app/(ngg)/ngg/clients/[clientId]/projects/[projectId]/assessment/actions";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ActionNotice } from "@/components/forms/ActionNotice";
import { Button } from "@/components/ui/Button";
import type { Dictionary } from "@/lib/i18n";
import type { QuestionnaireDefinition } from "@/domain/questionnaire/definition";

export function IntroForm({ definition, versionId, clientId, projectId, editable, t, locale }: { definition: QuestionnaireDefinition; versionId: string; clientId: string; projectId: string; editable: boolean; t: Dictionary; locale: "he" | "en" }) {
  const b = t.builder;
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(updateIntroAction, null);
  return (
    <div className="rounded-[20px] bg-sunken p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold text-text-muted">{b.intro}</p>
          <p className="text-[15px] font-bold">{definition.title.he}</p>
        </div>
        {editable ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>
            {t.common.edit}
          </Button>
        ) : null}
      </div>
      {open ? (
        <form action={action} className="mt-3 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="clientId" value={clientId} />
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="versionId" value={versionId} />
          <Field label={b.introTitle} htmlFor="introTitle"><Input id="introTitle" name="title" defaultValue={definition.title.he} required /></Field>
          <Field label={`${b.introTitle} (EN)`} htmlFor="introTitleEn"><Input id="introTitleEn" name="titleEn" defaultValue={definition.title.en ?? ""} dir="ltr" /></Field>
          <Field label={b.introText} htmlFor="introText"><Textarea id="introText" name="intro" defaultValue={definition.intro?.he ?? ""} /></Field>
          <Field label={`${b.introText} (EN)`} htmlFor="introTextEn"><Textarea id="introTextEn" name="introEn" defaultValue={definition.intro?.en ?? ""} dir="ltr" /></Field>
          <Field label={b.completionNote} htmlFor="completionNote">
            <Textarea id="completionNote" name="completionNote" defaultValue={definition.completionNote?.he ?? ""} placeholder={b.completionNotePlaceholder} />
          </Field>
          <Field label={`${b.completionNote} (EN)`} htmlFor="completionNoteEn"><Textarea id="completionNoteEn" name="completionNoteEn" defaultValue={definition.completionNote?.en ?? ""} dir="ltr" /></Field>
          {definition.privacyNote ? (
            <div className="md:col-span-2 rounded-[16px] bg-surface px-4 py-3">
              <p className="text-[12px] font-semibold text-text-muted">{b.privacyNote}</p>
              <p className="mt-1 whitespace-pre-line text-[13px] text-ink-2">{definition.privacyNote.he}</p>
              <p className="mt-2 text-[12px] text-text-muted">{b.privacyNoteFixed}</p>
            </div>
          ) : null}
          <div className="md:col-span-2"><ActionNotice state={state} locale={locale} /></div>
          <div className="md:col-span-2"><SubmitButton size="sm">{t.common.save}</SubmitButton></div>
        </form>
      ) : null}
    </div>
  );
}

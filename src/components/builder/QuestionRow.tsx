"use client";

import { useActionState, useState } from "react";
import { removeQuestionAction, updateQuestionAction, createCustomCopyAction } from "@/app/(ngg)/ngg/clients/[clientId]/projects/[projectId]/assessment/actions";
import { Field, Input, Textarea, Checkbox } from "@/components/ui/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ActionNotice } from "@/components/forms/ActionNotice";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { Notice } from "@/components/ui/Notice";
import { lt } from "@/domain/shared/localized";
import { fmt, type Dictionary } from "@/lib/i18n";
import type { QuestionDefinition } from "@/domain/questionnaire/definition";
import type { Locale } from "@/domain/shared/enums";

export function QuestionRow({ question, index, versionId, clientId, projectId, editable, t, locale }: { question: QuestionDefinition; index: number; versionId: string; clientId: string; projectId: string; editable: boolean; t: Dictionary; locale: Locale }) {
  const b = t.builder;
  const [editing, setEditing] = useState(false);
  const [lockedAttempt, setLockedAttempt] = useState(false);
  const [state, action] = useActionState(updateQuestionAction, null);
  const [removeState, removeAction] = useActionState(removeQuestionAction, null);
  const hidden = (
    <>
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="versionId" value={versionId} />
      <input type="hidden" name="questionId" value={question.id} />
    </>
  );
  return (
    <li className="rounded-[14px] bg-surface px-3 py-2.5 text-[13px]">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 w-6 shrink-0 text-[11px] font-bold text-text-muted" dir="ltr">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className={question.wordingStatus === "placeholder" ? "text-text-muted" : ""}>{lt(question.text, locale)}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-text-muted">
            <span>{b.typeLabels[question.type]}</span>
            {question.locked ? <StatusPill tone="info" dot={false}>🔒 {b.locked}</StatusPill> : null}
            {question.sourceType === "client_custom" ? <StatusPill tone="neutral" dot={false}>{b.customItems}</StatusPill> : null}
            {question.derivedFromCanonicalId ? <span>{fmt(b.customCopyOf, { id: question.derivedFromCanonicalId })}</span> : null}
            {question.wordingStatus === "placeholder" ? <StatusPill tone="warning" dot={false}>{b.placeholderWording}</StatusPill> : null}
            {question.reverseCoded ? <span>· {b.reverseCoded}</span> : null}
            {question.audience && question.audience !== "all" ? <span>· {question.audience === "managers" ? b.managersOnly : b.employeesOnly}</span> : null}
            {question.metricId ? <span dir="ltr">· {question.metricId}</span> : null}
          </div>
        </div>
        {editable ? (
          <div className="flex shrink-0 items-center gap-1">
            {question.locked ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setLockedAttempt((v) => !v)}>
                {b.editQuestion}
              </Button>
            ) : (
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing((v) => !v)}>
                {b.editQuestion}
              </Button>
            )}
            {!question.locked ? (
              <form action={removeAction}>
                {hidden}
                <Button type="submit" variant="ghost" size="sm" aria-label={`${b.deleteQuestion}: ${lt(question.text, locale)}`}>
                  ×
                </Button>
              </form>
            ) : null}
          </div>
        ) : null}
      </div>
      {lockedAttempt ? (
        <Notice tone="info" className="mt-2">
          <p>{b.lockedItemMessage}</p>
          <form action={createCustomCopyAction} className="mt-2">
            {hidden}
            <Button type="submit" variant="secondary" size="sm">
              {b.createCustomCopy}
            </Button>
          </form>
        </Notice>
      ) : null}
      <ActionNotice state={removeState} locale={locale} messages={{ locked_item: b.lockedItemMessage }} />
      {editing ? (
        <form action={action} className="mt-3 flex flex-col gap-3 rounded-[12px] bg-sunken p-3">
          {hidden}
          <Field label={b.questionText} htmlFor={`text-${question.id}`}>
            <Textarea id={`text-${question.id}`} name="text" defaultValue={question.text.he} required className="min-h-16" />
          </Field>
          <Field label={b.questionTextEn} htmlFor={`textEn-${question.id}`}>
            <Input id={`textEn-${question.id}`} name="textEn" defaultValue={question.text.en ?? ""} dir="ltr" />
          </Field>
          <Field label={b.helpText} htmlFor={`help-${question.id}`}>
            <Input id={`help-${question.id}`} name="helpText" defaultValue={question.helpText?.he ?? ""} />
          </Field>
          {question.type === "single_choice" || question.type === "multi_select" ? (
            <Field label={b.options} htmlFor={`options-${question.id}`}>
              <Textarea id={`options-${question.id}`} name="options" defaultValue={(question.options ?? []).map((o) => o.label.he).join("\n")} />
            </Field>
          ) : null}
          <Checkbox name="required" label={b.required} defaultChecked={question.required} />
          {question.sourceType === "ngg_measure" ? <p className="text-[12px] text-warning-text">{b.wordingNote}</p> : null}
          <ActionNotice state={state} locale={locale} messages={{ locked_item: b.lockedItemMessage }} />
          <div className="flex gap-2">
            <SubmitButton size="sm">{b.saveQuestion}</SubmitButton>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
              {t.common.cancel}
            </Button>
          </div>
        </form>
      ) : null}
    </li>
  );
}

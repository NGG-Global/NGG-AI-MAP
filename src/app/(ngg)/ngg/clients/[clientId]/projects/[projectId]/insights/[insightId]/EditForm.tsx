"use client";

import { useActionState } from "react";
import { editInsightAction } from "../actions";
import { Field, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ActionNotice } from "@/components/forms/ActionNotice";
import type { Dictionary } from "@/lib/i18n";

export function EditForm({ t, locale, clientId, projectId, insightId, payload, fields }: { t: Dictionary; locale: "he" | "en"; clientId: string; projectId: string; insightId: string; payload: Record<string, unknown>; fields: Array<{ key: string; label: string }> }) {
  const [state, action] = useActionState(editInsightAction, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="insightId" value={insightId} />
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />
      <p className="text-[12px] text-text-muted">{t.insights.editHelp}</p>
      {fields.map((f) => (
        <Field key={f.key} label={f.label} htmlFor={`f-${f.key}`}>
          <Textarea id={`f-${f.key}`} name={`f.${f.key}`} defaultValue={String(payload[f.key] ?? "")} className="min-h-20" />
        </Field>
      ))}
      <ActionNotice state={state} locale={locale} />
      <div><SubmitButton size="sm">{t.insights.save}</SubmitButton></div>
    </form>
  );
}

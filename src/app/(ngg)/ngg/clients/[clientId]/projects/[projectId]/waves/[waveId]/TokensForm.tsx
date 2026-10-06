"use client";

import { useActionState } from "react";
import { generateTokensAction } from "../actions";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ActionNotice } from "@/components/forms/ActionNotice";
import { Notice } from "@/components/ui/Notice";
import type { Dictionary } from "@/lib/i18n";

export function TokensForm({ t, locale, clientId, projectId, waveId }: { t: Dictionary; locale: "he" | "en"; clientId: string; projectId: string; waveId: string }) {
  const w = t.waves;
  const [state, action] = useActionState(generateTokensAction, null);
  const csv = state?.ok ? state.data?.csv : undefined;
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="waveId" value={waveId} />
      <p className="text-[12px] text-text-muted">{w.tokensHelp}</p>
      <Field label={w.tokensCount} htmlFor="tokenCount"><Input id="tokenCount" name="count" type="number" min={0} max={5000} defaultValue={50} /></Field>
      <Field label={w.tokensEmails} htmlFor="tokenEmails"><Textarea id="tokenEmails" name="emails" dir="ltr" /></Field>
      {csv ? (
        <Notice tone="success" role="status">
          <p className="mb-2">{state?.ok ? state.data?.count : ""} ✓</p>
          <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`} download={`survey-links-${waveId.slice(0, 8)}.csv`} className="font-semibold">
            {w.downloadCsv}
          </a>
        </Notice>
      ) : (
        <ActionNotice state={state} locale={locale} />
      )}
      <div><SubmitButton variant="secondary" size="sm">{w.generateTokens}</SubmitButton></div>
    </form>
  );
}

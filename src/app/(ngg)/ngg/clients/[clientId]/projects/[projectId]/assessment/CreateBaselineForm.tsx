"use client";

import { useActionState } from "react";
import { createBaselineAction } from "./actions";
import { Field, Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ActionNotice } from "@/components/forms/ActionNotice";
import type { Dictionary } from "@/lib/i18n";

export function CreateBaselineForm({ clientId, projectId, defaultName, t, locale }: { clientId: string; projectId: string; defaultName: string; t: Dictionary; locale: "he" | "en" }) {
  const [state, action] = useActionState(createBaselineAction, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="projectId" value={projectId} />
      <p className="max-w-prose text-[14px] text-text-muted">{t.builder.createBaselineHelp}</p>
      <Field label={t.builder.introTitle} htmlFor="qname">
        <Input id="qname" name="name" defaultValue={defaultName} />
      </Field>
      <ActionNotice state={state} locale={locale} />
      <div>
        <SubmitButton variant="cta" size="lg">
          {t.builder.createBaseline}
        </SubmitButton>
      </div>
    </form>
  );
}

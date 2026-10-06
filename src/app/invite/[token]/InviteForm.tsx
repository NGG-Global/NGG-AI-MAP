"use client";

import { useActionState } from "react";
import { acceptInviteAction } from "./actions";
import { Field, Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ActionNotice } from "@/components/forms/ActionNotice";
import type { Dictionary } from "@/lib/i18n";

export function InviteForm({ t, locale, token, email }: { t: Dictionary["auth"]; locale: "he" | "en"; token: string; email: string }) {
  const [state, action] = useActionState(acceptInviteAction, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <Field label={t.email}>
        <Input value={email} readOnly dir="ltr" />
      </Field>
      <Field label={t.chooseName} htmlFor="name">
        <Input id="name" name="name" required minLength={2} autoComplete="name" />
      </Field>
      <Field label={t.choosePassword} htmlFor="password">
        <Input id="password" name="password" type="password" required minLength={10} autoComplete="new-password" dir="ltr" />
      </Field>
      <ActionNotice state={state} locale={locale} messages={{ not_found: t.inviteInvalid }} />
      <SubmitButton variant="cta" size="lg" className="w-full">
        {t.activate}
      </SubmitButton>
    </form>
  );
}

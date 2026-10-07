"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "./actions";
import { Field, Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ActionNotice } from "@/components/forms/ActionNotice";
import type { Dictionary } from "@/lib/i18n";

export function ResetForm({ t, locale, token, email }: { t: Dictionary["auth"]; locale: "he" | "en"; token: string; email: string }) {
  const [state, action] = useActionState(resetPasswordAction, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <Field label={t.email}>
        <Input value={email} readOnly dir="ltr" />
      </Field>
      <Field label={t.newPassword} htmlFor="password">
        <Input id="password" name="password" type="password" required minLength={10} autoComplete="new-password" dir="ltr" />
      </Field>
      <Field label={t.confirmPassword} htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" required minLength={10} autoComplete="new-password" dir="ltr" />
      </Field>
      <ActionNotice state={state} locale={locale} messages={{ not_found: t.resetInvalid, mismatch: t.passwordMismatch, rate_limited: t.rateLimited }} />
      <SubmitButton variant="cta" size="lg" className="w-full">
        {t.resetSubmit}
      </SubmitButton>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import { Field, Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ActionNotice } from "@/components/forms/ActionNotice";
import type { Dictionary } from "@/lib/i18n";

export function LoginForm({ t, locale, next }: { t: Dictionary["auth"]; locale: "he" | "en"; next?: string }) {
  const [state, action] = useActionState(loginAction, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label={t.email} htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required dir="ltr" />
      </Field>
      <Field label={t.password} htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required dir="ltr" />
      </Field>
      <ActionNotice state={state} locale={locale} messages={{ invalid_credentials: t.invalidCredentials, rate_limited: t.rateLimited }} />
      <SubmitButton variant="cta" size="lg" className="mt-2 w-full">
        {t.login}
      </SubmitButton>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { setupAction } from "./actions";
import { Field, Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ActionNotice } from "@/components/forms/ActionNotice";

export function SetupForm({ locale }: { locale: "he" | "en" }) {
  const [state, action] = useActionState(setupAction, null);
  const he = locale === "he";
  const keep = state && !state.ok ? (state.keep ?? {}) : {};
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label={he ? "קוד הקמה (SETUP_TOKEN)" : "Setup token (SETUP_TOKEN)"} htmlFor="token" help={he ? "הערך שהגדרת במשתני הסביבה של האתר." : "The value you set in the site's environment variables."}>
        <Input id="token" name="token" required dir="ltr" autoComplete="off" />
      </Field>
      <Field label={he ? "שם מלא" : "Full name"} htmlFor="name"><Input id="name" name="name" required minLength={2} defaultValue={keep.name ?? ""} /></Field>
      <Field label={he ? "דוא״ל" : "Email"} htmlFor="email"><Input id="email" name="email" type="email" required dir="ltr" defaultValue={keep.email ?? ""} /></Field>
      <Field label={he ? "סיסמה (12 תווים לפחות)" : "Password (at least 12 characters)"} htmlFor="password"><Input id="password" name="password" type="password" required minLength={12} dir="ltr" autoComplete="new-password" /></Field>
      <ActionNotice
        state={state}
        locale={locale}
        messages={{
          already_set_up: he ? "ההקמה כבר בוצעה. היכנסו דרך דף הכניסה." : "Setup was already completed. Use the login page.",
          bad_token: he ? "קוד ההקמה אינו נכון או שלא הוגדר SETUP_TOKEN." : "The setup token is wrong or SETUP_TOKEN is not configured.",
          short_password: he ? "הסיסמה חייבת להכיל 12 תווים לפחות." : "The password must be at least 12 characters.",
          invalid: he ? "בדקו את השם וכתובת הדוא״ל." : "Check the name and email address.",
        }}
      />
      <SubmitButton variant="cta" size="lg" className="w-full" pendingLabel={he ? "מקים…" : "Setting up…"}>
        {he ? "הקמת המערכת" : "Set up the platform"}
      </SubmitButton>
    </form>
  );
}

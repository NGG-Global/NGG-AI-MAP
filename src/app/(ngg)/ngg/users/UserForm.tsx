"use client";

import { useActionState } from "react";
import { createNggUserAction } from "./actions";
import { Field, Input, Select } from "@/components/ui/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ActionNotice } from "@/components/forms/ActionNotice";
import type { Dictionary } from "@/lib/i18n";

export function UserForm({ t, locale }: { t: Dictionary; locale: "he" | "en" }) {
  const [state, action] = useActionState(createNggUserAction, null);
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <Field label={t.common.name} htmlFor="uName"><Input id="uName" name="name" required minLength={2} /></Field>
      <Field label={t.common.email} htmlFor="uEmail"><Input id="uEmail" name="email" type="email" required dir="ltr" /></Field>
      <Field label={t.common.role} htmlFor="uRole">
        <Select id="uRole" name="nggRole" defaultValue="project_manager">
          <option value="super_admin">{t.roles.super_admin}</option>
          <option value="project_manager">{t.roles.project_manager}</option>
          <option value="analyst">{t.roles.analyst}</option>
        </Select>
      </Field>
      <Field label={t.users.password} htmlFor="uPassword"><Input id="uPassword" name="password" type="password" required minLength={10} dir="ltr" autoComplete="new-password" /></Field>
      <Field label={t.common.language} htmlFor="uLocale">
        <Select id="uLocale" name="locale" defaultValue="he">
          <option value="he">{t.common.hebrew}</option>
          <option value="en">{t.common.english}</option>
        </Select>
      </Field>
      <div className="md:col-span-2"><ActionNotice state={state} locale={locale} messages={{ email: locale === "he" ? "כתובת הדוא״ל כבר קיימת." : "This email already exists." }} /></div>
      <div className="md:col-span-2"><SubmitButton variant="cta">{t.users.newUser}</SubmitButton></div>
    </form>
  );
}

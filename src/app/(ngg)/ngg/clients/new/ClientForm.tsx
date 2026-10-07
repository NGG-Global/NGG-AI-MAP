"use client";

import { useActionState, useState } from "react";
import { createClientAction } from "../actions";
import { Field, Input, Select } from "@/components/ui/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ActionNotice } from "@/components/forms/ActionNotice";
import { slugify } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";

function fieldLabels(t: Dictionary): Record<string, string> {
  return { name: t.clients.name, slug: t.clients.slug, industry: t.clients.industry, organizationSize: t.clients.organizationSize, surveyContact: t.clients.surveyContact, primaryColor: t.clients.primaryColor, logoText: t.clients.logoText };
}

export function ClientForm({ t, locale }: { t: Dictionary; locale: "he" | "en" }) {
  const [state, action] = useActionState(createClientAction, null);
  // Until the user types an identifier, the field stays empty and shows the derived one as a hint;
  // the server derives it from the name and adds a suffix if it is already taken.
  const [slug, setSlug] = useState("");
  const [derived, setDerived] = useState("");
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <Field label={t.clients.name} htmlFor="name" className="md:col-span-2">
        <Input id="name" name="name" required minLength={2} onChange={(e) => setDerived(slugify(e.target.value))} />
      </Field>
      <Field label={t.clients.slug} htmlFor="slug" help={t.clients.slugHelp}>
        {/* Normalised as typed; the server normalises again and derives one from the name when empty. */}
        <Input
          id="slug"
          name="slug"
          dir="ltr"
          maxLength={60}
          autoComplete="off"
          value={slug}
          placeholder={derived}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[\s_]+/g, "-"))}
          onBlur={() => setSlug(slugify(slug))}
        />
      </Field>
      <Field label={t.clients.industry} htmlFor="industry">
        <Input id="industry" name="industry" />
      </Field>
      <Field label={t.clients.organizationSize} htmlFor="organizationSize">
        <Input id="organizationSize" name="organizationSize" type="number" min={1} inputMode="numeric" />
      </Field>
      <Field label={t.clients.locale} htmlFor="locale">
        <Select id="locale" name="locale" defaultValue={locale}>
          <option value="he">{t.common.hebrew}</option>
          <option value="en">{t.common.english}</option>
        </Select>
      </Field>
      <Field label={t.clients.surveyContact} htmlFor="surveyContact">
        <Input id="surveyContact" name="surveyContact" />
      </Field>
      <Field label={t.clients.primaryColor} htmlFor="primaryColor">
        <Input id="primaryColor" name="primaryColor" type="color" defaultValue="#15151f" className="h-11 p-1" />
      </Field>
      <Field label={t.clients.logoText} htmlFor="logoText">
        <Input id="logoText" name="logoText" maxLength={4} />
      </Field>
      <div className="md:col-span-2">
        <ActionNotice state={state} locale={locale} messages={{ slug: t.clients.slugTaken }} fieldLabels={fieldLabels(t)} />
      </div>
      <div className="md:col-span-2">
        <SubmitButton variant="cta" size="lg">
          {t.clients.createAndContinue}
        </SubmitButton>
      </div>
    </form>
  );
}

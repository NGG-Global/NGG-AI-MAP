"use client";

import { useActionState } from "react";
import { updateClientSettingsAction } from "../actions";
import { Field, Input, Select, Textarea, Checkbox } from "@/components/ui/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ActionNotice } from "@/components/forms/ActionNotice";
import type { Dictionary } from "@/lib/i18n";
import type { Client } from "@/server/db/schema";

export function SettingsForm({ t, locale, client, canEditPrivacy }: { t: Dictionary; locale: "he" | "en"; client: Client; canEditPrivacy: boolean }) {
  const [state, action] = useActionState(updateClientSettingsAction, null);
  const tax = client.segmentTaxonomy;
  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="clientId" value={client.id} />
      <section className="grid gap-4 md:grid-cols-2">
        <h3 className="text-[15px] font-bold md:col-span-2">{t.settings.general}</h3>
        <Field label={t.clients.name} htmlFor="name"><Input id="name" name="name" required defaultValue={client.name} /></Field>
        <Field label={t.clients.slug} htmlFor="slug"><Input id="slug" name="slug" required pattern="[a-z0-9-]+" dir="ltr" defaultValue={client.slug} /></Field>
        <Field label={t.clients.industry} htmlFor="industry"><Input id="industry" name="industry" defaultValue={client.industry ?? ""} /></Field>
        <Field label={t.clients.organizationSize} htmlFor="organizationSize"><Input id="organizationSize" name="organizationSize" type="number" min={1} defaultValue={client.organizationSize ?? ""} /></Field>
        <Field label={t.clients.locale} htmlFor="locale">
          <Select id="locale" name="locale" defaultValue={client.locale}>
            <option value="he">{t.common.hebrew}</option>
            <option value="en">{t.common.english}</option>
          </Select>
        </Field>
        <Field label={t.clients.surveyContact} htmlFor="surveyContact"><Input id="surveyContact" name="surveyContact" defaultValue={client.surveyContact ?? ""} /></Field>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <h3 className="text-[15px] font-bold md:col-span-2">{t.settings.branding}</h3>
        <Field label={t.clients.primaryColor} htmlFor="primaryColor"><Input id="primaryColor" name="primaryColor" type="color" defaultValue={client.branding.primaryColor ?? "#15151f"} className="h-11 p-1" /></Field>
        <Field label={t.clients.logoText} htmlFor="logoText"><Input id="logoText" name="logoText" maxLength={4} defaultValue={client.branding.logoText ?? ""} /></Field>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <h3 className="text-[15px] font-bold">{t.settings.taxonomy}</h3>
          <p className="text-[12px] text-text-muted">{t.settings.taxonomyHelp}</p>
        </div>
        <Field label={t.settings.departments} htmlFor="departments"><Textarea id="departments" name="departments" defaultValue={tax.departments.join(", ")} /></Field>
        <Field label={t.settings.roleFamilies} htmlFor="roleFamilies"><Textarea id="roleFamilies" name="roleFamilies" defaultValue={tax.roleFamilies.join(", ")} /></Field>
        <Field label={t.settings.seniorityGroups} htmlFor="seniorityGroups"><Textarea id="seniorityGroups" name="seniorityGroups" defaultValue={tax.seniorityGroups.join(", ")} /></Field>
        <Field label={t.settings.locations} htmlFor="locations"><Textarea id="locations" name="locations" defaultValue={tax.locations.join(", ")} /></Field>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <h3 className="text-[15px] font-bold md:col-span-2">{t.settings.privacy}</h3>
        <Field label={t.settings.privacyThreshold} htmlFor="privacyThreshold" help={t.settings.privacyThresholdHelp}>
          <Input id="privacyThreshold" name="privacyThreshold" type="number" min={5} max={50} defaultValue={client.privacyThreshold} disabled={!canEditPrivacy} />
        </Field>
        <div className="flex items-end pb-3">
          <Checkbox name="allowClientInvites" label={t.access.allowClientInvites} defaultChecked={client.allowClientInvites} />
        </div>
      </section>
      <ActionNotice state={state} locale={locale} />
      <div>
        <SubmitButton>{t.common.save}</SubmitButton>
      </div>
    </form>
  );
}

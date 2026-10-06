"use client";

import { useActionState } from "react";
import { inviteUserAction } from "../actions";
import { Field, Input, Select, Checkbox } from "@/components/ui/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ActionNotice } from "@/components/forms/ActionNotice";
import { Notice } from "@/components/ui/Notice";
import { CopyField } from "@/components/forms/CopyField";
import type { Dictionary } from "@/lib/i18n";

export function InviteForm({ t, locale, clientId, projects }: { t: Dictionary; locale: "he" | "en"; clientId: string; projects: Array<{ id: string; name: string }> }) {
  const [state, action] = useActionState(inviteUserAction, null);
  const link = state?.ok ? state.data?.link : undefined;
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="clientId" value={clientId} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t.access.email} htmlFor="inviteEmail">
          <Input id="inviteEmail" name="email" type="email" required dir="ltr" />
        </Field>
        <Field label={t.access.name} htmlFor="inviteName">
          <Input id="inviteName" name="name" />
        </Field>
        <Field label={t.access.role} htmlFor="clientRole">
          <Select id="clientRole" name="clientRole" defaultValue="viewer">
            <option value="viewer">{t.roles.viewer}</option>
            <option value="admin">{t.roles.admin}</option>
          </Select>
        </Field>
        <Field label={t.access.restrictProjects} help={t.access.restrictHelp}>
          <div className="flex flex-col gap-1 pt-2">
            {projects.map((p) => (
              <Checkbox key={p.id} name="projectIds" value={p.id} label={p.name} />
            ))}
          </div>
        </Field>
      </div>
      {link ? (
        <Notice tone="success" role="status">
          <p className="mb-2">{t.access.linkCreated}</p>
          <CopyField value={link} copyLabel={t.common.copy} copiedLabel={t.common.copied} />
        </Notice>
      ) : (
        <ActionNotice state={state} locale={locale} messages={{ email: locale === "he" ? "למשתמש עם כתובת זו כבר יש חשבון." : "A user with this email already exists." }} />
      )}
      <div>
        <SubmitButton variant="cta">{t.access.send}</SubmitButton>
      </div>
    </form>
  );
}

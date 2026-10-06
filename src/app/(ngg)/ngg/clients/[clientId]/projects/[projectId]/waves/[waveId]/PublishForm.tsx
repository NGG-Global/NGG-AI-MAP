"use client";

import { useActionState } from "react";
import { publishWaveAction } from "../actions";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ActionNotice } from "@/components/forms/ActionNotice";
import type { Dictionary } from "@/lib/i18n";

export function PublishForm({ t, locale, clientId, projectId, waveId }: { t: Dictionary; locale: "he" | "en"; clientId: string; projectId: string; waveId: string }) {
  const [state, action] = useActionState(publishWaveAction, null);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="waveId" value={waveId} />
      <ActionNotice state={state} locale={locale} messages={{ empty_questionnaire: t.waves.needQuestionnaire }} />
      <SubmitButton variant="cta">{t.waves.publish}</SubmitButton>
    </form>
  );
}

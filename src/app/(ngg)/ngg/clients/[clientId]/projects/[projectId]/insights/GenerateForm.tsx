"use client";

import { useActionState } from "react";
import { generateInsightAction } from "./actions";
import { Field, Select } from "@/components/ui/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ActionNotice } from "@/components/forms/ActionNotice";
import type { Dictionary } from "@/lib/i18n";

export function GenerateForm({ t, locale, clientId, projectId, waves, metrics }: { t: Dictionary; locale: "he" | "en"; clientId: string; projectId: string; waves: Array<{ id: string; code: string }>; metrics: Array<{ id: string; name: string }> }) {
  const [state, action] = useActionState(generateInsightAction, null);
  const i = t.insights;
  return (
    <form action={action} className="grid gap-3 md:grid-cols-4">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="projectId" value={projectId} />
      <Field label={i.forWave} htmlFor="gWave">
        <Select id="gWave" name="waveId" defaultValue={waves[waves.length - 1]?.id}>
          {waves.map((w) => <option key={w.id} value={w.id}>{w.code}</option>)}
        </Select>
      </Field>
      <Field label={t.builder.type} htmlFor="gType">
        <Select id="gType" name="type" defaultValue="executive_summary">
          <option value="executive_summary">{i.executive_summary}</option>
          <option value="explain_change">{i.explain_change}</option>
          <option value="goal_suggestions">{i.goal_suggestions}</option>
          <option value="open_text_themes">{i.open_text_themes}</option>
        </Select>
      </Field>
      <Field label={i.forMetric} htmlFor="gMetric">
        <Select id="gMetric" name="metricId" defaultValue="gail_total">
          {metrics.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </Select>
      </Field>
      <div className="flex items-end"><SubmitButton variant="cta" pendingLabel="…">{i.generate}</SubmitButton></div>
      <div className="md:col-span-4"><ActionNotice state={state} locale={locale} messages={{ ai_unavailable: i.aiUnavailable, ai_output: i.aiUnavailable }} /></div>
    </form>
  );
}

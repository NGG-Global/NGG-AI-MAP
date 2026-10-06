"use client";

import { useActionState, useState } from "react";
import { saveGoalAction } from "@/app/(ngg)/ngg/clients/[clientId]/projects/[projectId]/goals/actions";
import { Field, Input, Select, Textarea, Checkbox } from "@/components/ui/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ActionNotice } from "@/components/forms/ActionNotice";
import { Button } from "@/components/ui/Button";
import { toDateInputValue } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import type { Goal } from "@/server/db/schema";

export function GoalForm({ t, locale, clientId, projectId, metrics, goal, startOpen = false }: { t: Dictionary; locale: "he" | "en"; clientId: string; projectId: string; metrics: Array<{ id: string; name: string }>; goal?: Goal; startOpen?: boolean }) {
  const g = t.goals;
  const [open, setOpen] = useState(startOpen);
  const [state, action] = useActionState(saveGoalAction, null);
  if (!open) return <Button type="button" variant={goal ? "ghost" : "cta"} size="sm" onClick={() => setOpen(true)}>{goal ? t.common.edit : g.newGoal}</Button>;
  return (
    <form action={action} className="grid gap-3 rounded-[20px] bg-sunken p-4 md:grid-cols-2">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="projectId" value={projectId} />
      {goal ? <input type="hidden" name="goalId" value={goal.id} /> : null}
      <Field label={g.titleField} htmlFor={`gt-${goal?.id ?? "new"}`} className="md:col-span-2"><Input id={`gt-${goal?.id ?? "new"}`} name="title" required minLength={3} defaultValue={goal?.title ?? ""} /></Field>
      <Field label={g.description} htmlFor="gdesc" className="md:col-span-2"><Textarea id="gdesc" name="description" defaultValue={goal?.description ?? ""} className="min-h-16" /></Field>
      <Field label={g.owner} htmlFor="gowner"><Input id="gowner" name="ownerName" defaultValue={goal?.ownerName ?? ""} /></Field>
      <Field label={g.scope} htmlFor="gscope">
        <Select id="gscope" name="scope" defaultValue={goal?.scope ?? "management"}>
          {(["organization", "unit", "management", "team"] as const).map((s) => <option key={s} value={s}>{g.scopes[s]}</option>)}
        </Select>
      </Field>
      <Field label={g.relatedMetrics} className="md:col-span-2">
        <div className="grid grid-cols-2 gap-1 pt-1 md:grid-cols-3">
          {metrics.map((m) => <Checkbox key={m.id} name="relatedMetricIds" value={m.id} label={m.name} defaultChecked={goal?.relatedMetricIds.includes(m.id)} />)}
        </div>
      </Field>
      <Field label={g.direction} htmlFor="gdir">
        <Select id="gdir" name="targetDirection" defaultValue={goal?.targetDirection ?? "increase"}>
          {(["increase", "decrease", "maintain"] as const).map((d) => <option key={d} value={d}>{g.directions[d]}</option>)}
        </Select>
      </Field>
      <Field label={g.targetValue} htmlFor="gtv"><Input id="gtv" name="targetValue" type="number" step="0.1" defaultValue={goal?.targetValue ?? ""} /></Field>
      <Field label={g.actions} htmlFor="gact"><Textarea id="gact" name="actions" defaultValue={goal?.actions.map((a) => a.text).join("\n") ?? ""} /></Field>
      <Field label={g.successEvidence} htmlFor="gev"><Textarea id="gev" name="successEvidence" defaultValue={goal?.successEvidence.join("\n") ?? ""} /></Field>
      <Field label={g.dueDate} htmlFor="gdue"><Input id="gdue" name="dueDate" type="date" defaultValue={toDateInputValue(goal?.dueDate)} /></Field>
      <Field label={g.notes} htmlFor="gnotes"><Input id="gnotes" name="notes" defaultValue={goal?.notes ?? ""} /></Field>
      <div className="md:col-span-2"><ActionNotice state={state} locale={locale} /></div>
      <div className="flex gap-2 md:col-span-2">
        <SubmitButton size="sm">{g.save}</SubmitButton>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>{t.common.cancel}</Button>
      </div>
    </form>
  );
}

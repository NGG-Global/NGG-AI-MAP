"use client";

import { useActionState, useState } from "react";
import { createWaveAction, updateWaveAction } from "../actions";
import { Field, Input, Select, Checkbox } from "@/components/ui/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ActionNotice } from "@/components/forms/ActionNotice";
import { Notice } from "@/components/ui/Notice";
import { toDateInputValue } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import type { Wave } from "@/server/db/schema";

export interface WaveFormProps {
  t: Dictionary;
  locale: "he" | "en";
  clientId: string;
  projectId: string;
  type: "baseline" | "follow_up";
  departments: string[];
  versions: Array<{ id: string; label: string; locked: boolean }>;
  previousWaveCode: string | null;
  defaultLocale: "he" | "en";
  wave?: Wave;
}

function Step({ n, title }: { n: number; title: string }) {
  return (
    <h3 className="flex items-center gap-2 text-[15px] font-bold">
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[12px] text-white" dir="ltr">
        {n}
      </span>
      {title}
    </h3>
  );
}

export function WaveForm({ t, locale, clientId, projectId, type, departments, versions, previousWaveCode, defaultLocale, wave }: WaveFormProps) {
  const w = t.waves;
  const [state, action] = useActionState(wave ? updateWaveAction : createWaveAction, null);
  const [scope, setScope] = useState(wave?.audience.scope ?? "all_organization");
  const [distribution, setDistribution] = useState(wave?.distributionMode ?? "public_link");
  const editable = !wave || wave.status === "draft";
  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="projectId" value={projectId} />
      {wave ? <input type="hidden" name="waveId" value={wave.id} /> : <input type="hidden" name="type" value={type} />}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-3"><Step n={1} title={w.step1} /></div>
        <Field label={w.name} htmlFor="wname" className="md:col-span-1">
          <Input id="wname" name="name" required defaultValue={wave?.name ?? (type === "baseline" ? "Baseline" : previousWaveCode ? `Follow-up` : "")} />
        </Field>
        <Field label={w.startAt} htmlFor="startAt"><Input id="startAt" name="startAt" type="date" defaultValue={toDateInputValue(wave?.startAt)} /></Field>
        <Field label={w.endAt} htmlFor="endAt"><Input id="endAt" name="endAt" type="date" defaultValue={toDateInputValue(wave?.endAt)} /></Field>
        <p className="text-[12px] text-text-muted md:col-span-3">{w.type}: <strong>{w[type]}</strong></p>
      </section>
      {!wave ? (
        <section className="flex flex-col gap-3">
          <Step n={2} title={w.step2} />
          <div className="flex flex-col gap-2">
            {type === "follow_up" ? (
              <label className="flex items-start gap-2 text-[14px]">
                <input type="radio" name="questionnaireSource" value="duplicate" defaultChecked className="mt-1 accent-[#ec2a8c]" />
                <span>{w.sourceDuplicate}{previousWaveCode ? ` (${previousWaveCode})` : ""}</span>
              </label>
            ) : null}
            <label className="flex items-start gap-2 text-[14px]">
              <input type="radio" name="questionnaireSource" value="draft" defaultChecked={type === "baseline"} className="mt-1 accent-[#ec2a8c]" />
              <span>{w.sourceDraft}</span>
            </label>
            {versions.filter((v) => v.locked).map((v) => (
              <label key={v.id} className="flex items-start gap-2 text-[14px]">
                <input type="radio" name="questionnaireSource" value={v.id} className="mt-1 accent-[#ec2a8c]" />
                <span>{w.sourceVersion}: {v.label}</span>
              </label>
            ))}
          </div>
        </section>
      ) : null}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2"><Step n={wave ? 2 : 3} title={w.step3} /></div>
        <Field label={w.audience} htmlFor="audienceScope">
          <Select id="audienceScope" name="audienceScope" value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}>
            {(["all_organization", "selected_units", "managers_only", "employee_sample"] as const).map((s) => (
              <option key={s} value={s}>{w[s]}</option>
            ))}
          </Select>
        </Field>
        {scope === "selected_units" ? (
          <Field label={w.audienceUnits}>
            <div className="flex flex-wrap gap-3 pt-2">
              {departments.map((d) => (
                <Checkbox key={d} name="audienceUnits" value={d} label={d} defaultChecked={wave?.audience.units?.includes(d)} />
              ))}
            </div>
          </Field>
        ) : (
          <Field label={w.audienceNote} htmlFor="audienceNote"><Input id="audienceNote" name="audienceNote" defaultValue={wave?.audience.note ?? ""} /></Field>
        )}
        <Field label={w.invitedCount} htmlFor="invitedCount"><Input id="invitedCount" name="invitedCount" type="number" min={0} defaultValue={wave?.invitedCount ?? ""} /></Field>
        <Field label={w.locale} htmlFor="wlocale">
          <Select id="wlocale" name="locale" defaultValue={wave?.locale ?? defaultLocale} disabled={!editable}>
            <option value="he">{t.common.hebrew}</option>
            <option value="en">{t.common.english}</option>
          </Select>
        </Field>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2"><Step n={wave ? 3 : 4} title={w.step4} /></div>
        <Field label={w.distribution} htmlFor="distributionMode">
          <Select id="distributionMode" name="distributionMode" value={distribution} onChange={(e) => setDistribution(e.target.value as typeof distribution)} disabled={!editable}>
            <option value="public_link">{w.public_link}</option>
            <option value="unique_tokens">{w.unique_tokens}</option>
          </Select>
        </Field>
        <div className="md:col-span-2"><Step n={wave ? 4 : 5} title={w.step5} /></div>
        <Field label={w.privacy} htmlFor="privacyMode">
          <Select id="privacyMode" name="privacyMode" defaultValue={wave?.privacyMode ?? "anonymous"} disabled={!editable}>
            <option value="anonymous">{w.anonymous}</option>
            <option value="pseudonymous" disabled={distribution === "public_link"}>{w.pseudonymous}</option>
            <option value="identified" disabled>{w.identified}</option>
          </Select>
        </Field>
      </section>
      <section className="flex flex-col gap-3">
        <Step n={wave ? 5 : 6} title={w.step6} />
        <Notice tone="info">{wave ? w.draftNotice : w.publishHelp}</Notice>
        <ActionNotice state={state} locale={locale} messages={{ wave_in_progress: w.waveInProgress, baseline_exists: w.baselineExists, no_questionnaire: w.needQuestionnaire, dates: locale === "he" ? "תאריך הסיום חייב להיות אחרי תאריך ההתחלה." : "End date must be after the start date." }} />
        <div>
          <SubmitButton variant={wave ? "primary" : "cta"} size="lg">{wave ? t.common.save : w.create}</SubmitButton>
        </div>
      </section>
    </form>
  );
}

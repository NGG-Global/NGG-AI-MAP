"use client";

import { useState } from "react";
import { lt } from "@/domain/shared/localized";
import { cn } from "@/lib/cn";
import type { QuestionDefinition } from "@/domain/questionnaire/definition";
import type { ResponseValue } from "@/server/db/schema";
import type { Locale } from "@/domain/shared/enums";

export interface QuestionInputProps {
  question: QuestionDefinition;
  locale: Locale;
  initial: ResponseValue | undefined;
  hasAnswer: boolean;
  labels: { pnta: string; chooseMany: string; chooseOne: string; number: string; textPlaceholder: string };
  onAutosave: (questionId: string, value: unknown) => void;
}

const optionBase = "flex min-h-[56px] w-full items-center gap-3 rounded-[16px] border px-4 py-3 text-start text-[15px] font-medium transition-colors";
const optionIdle = "border-line bg-surface hover:border-ink";
const optionActive = "border-ink bg-ink text-white";

/** Accessible, touch-friendly controls. Values are posted as form fields and autosaved on change. */
export function QuestionInput({ question, locale, initial, hasAnswer, labels, onAutosave }: QuestionInputProps) {
  const [pnta, setPnta] = useState(hasAnswer && initial === null);
  const [value, setValue] = useState<ResponseValue | undefined>(initial);
  const name = `a.${question.canonicalId}`;
  const save = (v: unknown) => {
    setPnta(false);
    setValue(v as ResponseValue);
    onAutosave(question.canonicalId, v);
  };
  const togglePnta = () => {
    const next = !pnta;
    setPnta(next);
    if (next) {
      setValue(null);
      onAutosave(question.canonicalId, null);
    }
  };

  let control: React.ReactNode;
  switch (question.type) {
    case "likert_5":
    case "likert_7": {
      const min = question.scale?.min ?? 1;
      const max = question.scale?.max ?? (question.type === "likert_5" ? 5 : 7);
      const labelsArr = question.scale?.labels ?? [];
      control = (
        <div role="radiogroup" aria-label={lt(question.text, locale)} className="flex flex-col gap-2">
          {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n, i) => {
            const active = !pnta && value === n;
            return (
              <label key={n} className={cn(optionBase, active ? optionActive : optionIdle, "cursor-pointer")}>
                <input type="radio" name={name} value={n} checked={active} onChange={() => save(n)} className="sr-only" />
                <span className={cn("inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-black", active ? "bg-white/20" : "bg-muted")} dir="ltr">
                  {n}
                </span>
                <span>{labelsArr[i] ? lt(labelsArr[i], locale) : ""}</span>
              </label>
            );
          })}
        </div>
      );
      break;
    }
    case "single_choice":
      control = (
        <div role="radiogroup" aria-label={lt(question.text, locale)} className="flex flex-col gap-2">
          {(question.options ?? []).map((o) => {
            const active = !pnta && value === o.value;
            return (
              <label key={o.value} className={cn(optionBase, active ? optionActive : optionIdle, "cursor-pointer")}>
                <input type="radio" name={name} value={o.value} checked={active} onChange={() => save(o.value)} className="sr-only" />
                <span>{lt(o.label, locale)}</span>
              </label>
            );
          })}
        </div>
      );
      break;
    case "multi_select": {
      const selected = Array.isArray(value) ? value : [];
      control = (
        <div role="group" aria-label={lt(question.text, locale)} className="flex flex-col gap-2">
          <p className="text-[12px] text-text-muted">{labels.chooseMany}</p>
          {(question.options ?? []).map((o) => {
            const active = !pnta && selected.includes(o.value);
            return (
              <label key={o.value} className={cn(optionBase, active ? optionActive : optionIdle, "cursor-pointer")}>
                <input
                  type="checkbox"
                  name={`${name}[]`}
                  value={o.value}
                  checked={active}
                  onChange={() => save(active ? selected.filter((v) => v !== o.value) : [...selected, o.value])}
                  className="sr-only"
                />
                <span aria-hidden="true" className={cn("inline-flex h-5 w-5 items-center justify-center rounded-[6px] border text-[12px]", active ? "border-white bg-white/20" : "border-line")}>
                  {active ? "✓" : ""}
                </span>
                <span>{lt(o.label, locale)}</span>
              </label>
            );
          })}
          <input type="hidden" name={`${name}[]`} value="" />
        </div>
      );
      break;
    }
    case "matrix": {
      const current = (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, number>;
      const columns = question.matrixColumns ?? [];
      control = (
        <div className="flex flex-col gap-3">
          {(question.matrixRows ?? []).map((row) => (
            <fieldset key={row.key} className="rounded-[16px] bg-sunken p-3">
              <legend className="mb-2 px-1 text-[14px] font-semibold">{lt(row.label, locale)}</legend>
              <div className="grid grid-cols-2 gap-2">
                {columns.map((c, ci) => {
                  const active = !pnta && current[row.key] === ci;
                  return (
                    <label key={c.value} className={cn("flex min-h-[44px] cursor-pointer items-center justify-center rounded-[12px] border px-2 text-center text-[13px] font-medium", active ? optionActive : optionIdle)}>
                      <input type="radio" name={`${name}.${row.key}`} value={c.value} checked={active} onChange={() => save({ ...current, [row.key]: ci })} className="sr-only" />
                      {lt(c.label, locale)}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
          {/* hidden mirror so the form carries column values rather than indices */}
          {(question.matrixRows ?? []).map((row) => (
            <input key={row.key} type="hidden" name={`${name}.${row.key}`} value={pnta || current[row.key] == null ? "" : (columns[current[row.key]!]?.value ?? "")} />
          ))}
        </div>
      );
      break;
    }
    case "numeric":
      control = (
        <input
          type="number"
          name={name}
          inputMode="numeric"
          defaultValue={typeof value === "number" ? value : ""}
          onBlur={(e) => e.target.value !== "" && save(Number(e.target.value))}
          placeholder={labels.number}
          className="min-h-[56px] w-full rounded-[16px] border border-line bg-surface px-4 text-[16px]"
          aria-label={lt(question.text, locale)}
        />
      );
      break;
    case "short_text":
    case "long_text":
      control = (
        <textarea
          name={name}
          defaultValue={typeof value === "string" ? value : ""}
          onBlur={(e) => save(e.target.value)}
          placeholder={labels.textPlaceholder}
          rows={question.type === "long_text" ? 5 : 2}
          className="w-full rounded-[16px] border border-line bg-surface px-4 py-3 text-[16px]"
          aria-label={lt(question.text, locale)}
        />
      );
      break;
  }

  return (
    <div className="flex flex-col gap-3">
      {control}
      {question.allowPreferNotToAnswer ? (
        <label className={cn("inline-flex min-h-[44px] cursor-pointer items-center gap-2 self-start rounded-full px-4 text-[13px] font-semibold", pnta ? "bg-ink text-white" : "bg-muted text-ink-2")}>
          <input type="checkbox" name={`pnta.${question.canonicalId}`} value="1" checked={pnta} onChange={togglePnta} className="sr-only" />
          {pnta ? "✓ " : ""}
          {labels.pnta}
        </label>
      ) : null}
    </div>
  );
}

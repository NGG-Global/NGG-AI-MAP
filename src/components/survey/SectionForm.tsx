"use client";

import { useActionState, useCallback, useRef, useState } from "react";
import { submitSectionAction } from "@/app/survey/[token]/actions";
import { QuestionInput } from "./QuestionInput";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { lt } from "@/domain/shared/localized";
import { rulesPass, type RoutingContext } from "@/domain/questionnaire/logic";
import type { QuestionDefinition } from "@/domain/questionnaire/definition";
import type { ResponseValue } from "@/server/db/schema";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/domain/shared/enums";

export function SectionForm({
  token,
  lang,
  index,
  isLast,
  questions,
  answers,
  attributes,
  missing,
  t,
  locale,
}: {
  token: string;
  lang: string;
  index: number;
  isLast: boolean;
  /** All audience-eligible questions of the section; display rules are evaluated live on the client. */
  questions: QuestionDefinition[];
  answers: Record<string, ResponseValue>;
  attributes: RoutingContext["attributes"];
  missing: boolean;
  t: Dictionary["survey"];
  locale: Locale;
}) {
  const [state, action] = useActionState(submitSectionAction, null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [live, setLive] = useState<Record<string, unknown>>(answers);
  const routing: RoutingContext = { attributes, answers: live as RoutingContext["answers"] };
  const visible = questions.filter((q) => rulesPass(q.displayRules, routing));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosave = useCallback(
    (questionId: string, value: unknown) => {
      setLive((prev) => ({ ...prev, [questionId]: value }));
      setSaveState("saving");
      fetch(`/survey/${token}/answer`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ questionId, value }) })
        .then((r) => setSaveState(r.ok ? "saved" : "idle"))
        .catch(() => setSaveState("idle"));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setSaveState("idle"), 2500);
    },
    [token],
  );
  const labels = { pnta: t.pnta, chooseMany: t.chooseMany, chooseOne: t.chooseOne, number: t.number, textPlaceholder: t.textPlaceholder };
  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="index" value={index} />
      <ol className="flex flex-col gap-5">
        {visible.map((q, i) => (
          <li key={q.id} className="rounded-[24px] bg-surface p-5">
            <p className="mb-1 text-[12px] font-semibold text-text-muted" dir="ltr">
              {i + 1} / {visible.length}
            </p>
            <h2 className="mb-1 text-[18px] font-bold leading-snug">
              {lt(q.text, locale)}
              {q.required ? <span className="ms-1 text-accent-text" aria-hidden="true">*</span> : null}
            </h2>
            {q.helpText ? <p className="mb-3 text-[13px] text-text-muted">{lt(q.helpText, locale)}</p> : <div className="mb-3" />}
            <QuestionInput question={q} locale={locale} initial={answers[q.canonicalId]} hasAnswer={q.canonicalId in answers} labels={labels} onAutosave={autosave} />
          </li>
        ))}
      </ol>
      {(state && !state.ok) || missing ? (
        <Notice tone="warning" role="alert">
          {t.requiredMissing}
        </Notice>
      ) : null}
      <div className="sticky bottom-3 flex items-center gap-2 rounded-full bg-surface p-2 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
        {index > 0 ? (
          <Button type="submit" name="direction" value="back" variant="secondary" size="lg" className="shrink-0">
            {t.previous}
          </Button>
        ) : null}
        <span className="flex-1 text-center text-[12px] text-text-muted" aria-live="polite">
          {saveState === "saving" ? t.saving : saveState === "saved" ? t.saved : ""}
        </span>
        <SubmitButton name="direction" value="next" variant="cta" size="lg" className="min-w-[140px] bg-[var(--client-accent,#ec2a8c)]">
          {isLast ? t.submit : t.next}
        </SubmitButton>
      </div>
    </form>
  );
}

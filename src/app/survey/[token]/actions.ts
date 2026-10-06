"use server";

import { redirect } from "next/navigation";
import { db } from "@/server/db/client";
import { completeRespondent, loadAnswers, computeProgress, markStarted, saveAnswers, startPublicRespondent, AnswerValidationError } from "@/server/services/survey";
import { setSurveyCookie, surveyPage } from "@/server/ui/survey";
import { field, runAction, type ActionState } from "@/server/ui/actions";

export async function startSurveyAction(formData: FormData): Promise<void> {
  const token = field(formData, "token");
  const lang = field(formData, "lang");
  const ctx = await surveyPage(token, lang);
  if (!ctx.access) redirect(`/survey/${token}`);
  const database = await db();
  if (ctx.access.kind === "public") {
    const { token: respondentToken } = await startPublicRespondent(database, ctx.access);
    await setSurveyCookie(token, respondentToken);
    redirect(`/survey/${token}/s/0${lang ? `?lang=${lang}` : ""}`);
  }
  const respondent = await markStarted(database, ctx.access.respondent);
  const answers = await loadAnswers(database, respondent.id);
  const progress = computeProgress(ctx.access.definition, respondent, answers);
  const index = Math.min(progress.nextIndex, Math.max(0, progress.routed.length - 1));
  redirect(`/survey/${token}/s/${index}${lang ? `?lang=${lang}` : ""}`);
}

/** Parses the section form: inputs are named `a.<canonicalId>` (scalars), `a.<id>[]` (multi) or `a.<id>.<row>` (matrix). */
function parseSectionForm(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, raw] of formData.entries()) {
    if (!key.startsWith("a.") || typeof raw !== "string") continue;
    const rest = key.slice(2);
    if (rest.endsWith("[]")) {
      const id = rest.slice(0, -2);
      const list = (out[id] as string[] | undefined) ?? [];
      if (raw) list.push(raw);
      out[id] = list;
    } else if (rest.includes(".")) {
      const [id, row] = rest.split(".", 2) as [string, string];
      const obj = (out[id] as Record<string, string> | undefined) ?? {};
      if (raw) obj[row] = raw;
      out[id] = obj;
    } else if (raw !== "") {
      out[rest] = raw;
    }
  }
  // "prefer not to answer" overrides any value for that question
  for (const [key, raw] of formData.entries()) {
    if (key.startsWith("pnta.") && raw === "1") out[key.slice(5)] = null;
  }
  return out;
}

export async function submitSectionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const token = field(formData, "token");
    const lang = field(formData, "lang");
    const index = Number(field(formData, "index") || 0);
    const direction = field(formData, "direction") === "back" ? "back" : "next";
    const ctx = await surveyPage(token, lang);
    if (!ctx.access || ctx.access.kind !== "respondent") redirect(`/survey/${token}`);
    const database = await db();
    const suffix = lang ? `?lang=${lang}` : "";
    try {
      const { progress } = await saveAnswers(database, ctx.access, parseSectionForm(formData));
      if (direction === "back") redirect(`/survey/${token}/s/${Math.max(0, index - 1)}${suffix}`);
      const sectionDone = progress.nextIndex > index;
      if (!sectionDone) redirect(`/survey/${token}/s/${index}?missing=1${lang ? `&lang=${lang}` : ""}`);
      if (index + 1 >= progress.routed.length) {
        const done = await completeRespondent(database, { ...ctx.access });
        if (done.ok) redirect(`/survey/${token}/done${suffix}`);
        redirect(`/survey/${token}/s/${done.nextIndex}${suffix}`);
      }
      redirect(`/survey/${token}/s/${index + 1}${suffix}`);
    } catch (error) {
      if (error instanceof AnswerValidationError) return { ok: false, error: "invalid_answer", fields: [error.questionId] };
      throw error;
    }
  });
}

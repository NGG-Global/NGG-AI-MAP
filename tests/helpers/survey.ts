import { eq } from "drizzle-orm";
import type { Db } from "@/server/db/connection";
import { respondents } from "@/server/db/schema";
import { completeRespondent, computeProgress, loadAnswers, resolveSurvey, saveAnswers, startPublicRespondent } from "@/server/services/survey";

export interface AnswerProfile {
  department: string;
  isManager: boolean;
  /** USE_01 value. */
  usage: string;
  /** Answer for every scale item (valid on both 1–5 and 1–7 scales). */
  likert: number;
  /** Answer for manager self-report items (AM_*); defaults to `likert`. */
  managerLikert?: number;
  text?: string;
}

/**
 * Takes one public-link respondent through the whole questionnaire, page by page as the runtime
 * reveals follow-up questions, and completes it. Returns whether completion succeeded.
 */
export async function answerEverything(db: Db, publicToken: string, profile: AnswerProfile): Promise<boolean> {
  const start = await resolveSurvey(db, publicToken);
  if (!("access" in start) || start.access.kind !== "public") throw new Error("public access expected");
  const { token } = await startPublicRespondent(db, start.access);
  const resolved = await resolveSurvey(db, publicToken, token);
  if (!("access" in resolved) || resolved.access.kind !== "respondent") throw new Error("respondent expected");
  let access = resolved.access;
  await saveAnswers(db, access, { CTX_01: profile.department, CTX_02: "Pro", CTX_03: profile.isManager ? "yes" : "no", CTX_05: "<2y", USE_01: profile.usage, USE_02: ["chatgpt"] });
  const [resp] = await db.select().from(respondents).where(eq(respondents.id, access.respondent.id));
  access = { ...access, respondent: resp! };
  for (let round = 0; round < 5; round += 1) {
    const answers = await loadAnswers(db, resp!.id);
    const payload: Record<string, unknown> = {};
    for (const entry of computeProgress(access.definition, resp!, answers).routed) {
      for (const q of entry.questions) {
        if (q.canonicalId in answers) continue;
        if (q.type === "likert_5" || q.type === "likert_7") payload[q.canonicalId] = q.canonicalId.startsWith("AM_") ? (profile.managerLikert ?? profile.likert) : profile.likert;
        else if (q.type === "single_choice") payload[q.canonicalId] = q.options?.[0]?.value;
        else if (q.type === "multi_select") payload[q.canonicalId] = (q.options ?? []).filter((o) => !o.exclusive).slice(0, 2).map((o) => o.value);
        else if (q.type === "matrix") payload[q.canonicalId] = Object.fromEntries((q.matrixRows ?? []).map((r) => [r.key, q.matrixColumns?.[1]?.value]));
        else payload[q.canonicalId] = profile.text ?? "free text";
      }
    }
    if (Object.keys(payload).length === 0) break;
    await saveAnswers(db, access, payload);
  }
  return (await completeRespondent(db, access)).ok;
}

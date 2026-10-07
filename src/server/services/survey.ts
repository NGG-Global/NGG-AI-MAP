import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@/server/db/connection";
import { clients, projects, questionnaireVersions, respondents, responses, waves, type Client, type Respondent, type ResponseValue, type Wave } from "@/server/db/schema";
import { generateToken, hashToken } from "@/server/auth/tokens";
import { newId } from "@/lib/ids";
import { routeQuestionnaire, type RoutingContext } from "@/domain/questionnaire/logic";
import type { QuestionDefinition, QuestionnaireDefinition, SectionDefinition } from "@/domain/questionnaire/definition";
import type { SegmentAttributes } from "@/domain/measurement/types";
import { recordSystemAudit } from "./audit";

/**
 * Respondent-facing runtime. There is no actor: access is granted by the survey token alone.
 * Nothing here ever exposes scores, dashboards or other respondents' data.
 */

export type SurveyAccess =
  | { kind: "public"; wave: Wave; client: Client; definition: QuestionnaireDefinition; workspaceId: string }
  | { kind: "respondent"; wave: Wave; client: Client; definition: QuestionnaireDefinition; respondent: Respondent; workspaceId: string };

export type SurveyClosedReason = "invalid" | "not_open" | "completed";

async function loadWaveBundle(db: Db, wave: Wave) {
  if (!wave.questionnaireVersionId) return null;
  const [version] = await db.select().from(questionnaireVersions).where(eq(questionnaireVersions.id, wave.questionnaireVersionId)).limit(1);
  const [row] = await db
    .select({ client: clients })
    .from(projects)
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .where(eq(projects.id, wave.projectId))
    .limit(1);
  if (!version || !row) return null;
  return { definition: version.definition, client: row.client, workspaceId: row.client.workspaceId };
}

/** Resolves a survey link. `cookieToken` is the respondent token stored for public-link sessions. */
export async function resolveSurvey(db: Db, token: string, cookieToken?: string): Promise<{ access: SurveyAccess } | { closed: SurveyClosedReason }> {
  // 1) unique respondent token (or a public-link session cookie)
  const candidates = [token, cookieToken].filter((x): x is string => Boolean(x));
  for (const candidate of candidates) {
    const [respondent] = await db.select().from(respondents).where(eq(respondents.tokenHash, hashToken(candidate))).limit(1);
    if (!respondent) continue;
    const [wave] = await db.select().from(waves).where(eq(waves.id, respondent.waveId)).limit(1);
    if (!wave) continue;
    // a session cookie only applies to its own wave's public link
    if (candidate === cookieToken && wave.publicToken !== token) continue;
    const bundle = await loadWaveBundle(db, wave);
    if (!bundle) return { closed: "invalid" };
    if (!isWaveAccepting(wave)) return respondent.status === "completed" ? { closed: "completed" } : { closed: "not_open" };
    return { access: { kind: "respondent", wave, respondent, ...bundle } };
  }
  // 2) public link
  const [wave] = await db.select().from(waves).where(eq(waves.publicToken, token)).limit(1);
  if (!wave) return { closed: "invalid" };
  const bundle = await loadWaveBundle(db, wave);
  if (!bundle) return { closed: "invalid" };
  if (!isWaveAccepting(wave)) return { closed: "not_open" };
  return { access: { kind: "public", wave, ...bundle } };
}

export function isWaveAccepting(wave: Wave): boolean {
  if (wave.status !== "open") return false;
  const now = Date.now();
  if (wave.startAt && wave.startAt.getTime() > now) return false;
  if (wave.endAt && wave.endAt.getTime() + 86_400_000 < now) return false;
  return true;
}

/** Public link: creates an anonymous respondent and returns the clear session token for the cookie. */
export async function startPublicRespondent(db: Db, access: Extract<SurveyAccess, { kind: "public" }>): Promise<{ respondent: Respondent; token: string }> {
  const token = generateToken(24);
  const [respondent] = await db
    .insert(respondents)
    .values({
      id: newId(),
      waveId: access.wave.id,
      tokenHash: hashToken(token),
      pseudoIdentifier: null,
      segmentAttributes: {},
      status: "started",
      locale: access.wave.locale,
      startedAt: new Date(),
    })
    .returning();
  return { respondent: respondent!, token };
}

export async function markStarted(db: Db, respondent: Respondent): Promise<Respondent> {
  if (respondent.status !== "invited") return respondent;
  const [updated] = await db
    .update(respondents)
    .set({ status: "started", startedAt: new Date(), updatedAt: new Date() })
    .where(eq(respondents.id, respondent.id))
    .returning();
  return updated!;
}

/* -------------------------------------------------------------- answers */

export async function loadAnswers(db: Db, respondentId: string): Promise<Record<string, ResponseValue>> {
  const rows = await db.select().from(responses).where(eq(responses.respondentId, respondentId));
  return Object.fromEntries(rows.map((r) => [r.questionCanonicalId, r.value]));
}

export function routingContextFor(respondent: Respondent, answers: Record<string, ResponseValue>): RoutingContext {
  return { attributes: respondent.segmentAttributes as RoutingContext["attributes"], answers };
}

export interface SurveyProgress {
  routed: Array<{ section: SectionDefinition; questions: QuestionDefinition[] }>;
  /** Index of the first section with an unanswered required question, or routed.length when complete. */
  nextIndex: number;
  answeredCount: number;
  totalCount: number;
}

export function computeProgress(definition: QuestionnaireDefinition, respondent: Respondent, answers: Record<string, ResponseValue>): SurveyProgress {
  const routed = routeQuestionnaire(definition, routingContextFor(respondent, answers));
  let nextIndex = routed.length;
  let answered = 0;
  let total = 0;
  for (const [index, entry] of routed.entries()) {
    let sectionComplete = true;
    for (const q of entry.questions) {
      total += 1;
      const value = answers[q.canonicalId];
      // An empty multi-select does not count as an answer.
      const has = q.canonicalId in answers && !(Array.isArray(value) && value.length === 0);
      if (has) answered += 1;
      if (q.required && !has) sectionComplete = false;
    }
    if (!sectionComplete && index < nextIndex) nextIndex = index;
  }
  return { routed, nextIndex, answeredCount: answered, totalCount: total };
}

export class AnswerValidationError extends Error {
  constructor(readonly questionId: string, readonly reason: string) {
    super(`${questionId}:${reason}`);
  }
}

/** The value stored for a scale item's non-numeric option ("Not relevant", "Don't know"). */
export const NA_VALUE = "na";

/** Options a respondent may choose, narrowed to an earlier answer when the question pipes them (USE_03). */
export function availableOptions(question: QuestionDefinition, answers: Record<string, ResponseValue> = {}) {
  const options = question.options ?? [];
  if (!question.optionsFromAnswer) return options;
  const earlier = answers[question.optionsFromAnswer];
  const chosen = new Set(Array.isArray(earlier) ? earlier : []);
  return options.filter((o) => chosen.has(o.value));
}

/**
 * Validates one raw value against its question definition. `null` = prefer not to answer.
 * `answers` holds the respondent's earlier answers, for questions whose options depend on them.
 */
export function validateAnswer(question: QuestionDefinition, raw: unknown, answers: Record<string, ResponseValue> = {}): ResponseValue {
  if (raw === null || raw === "__pnta__") {
    if (!question.allowPreferNotToAnswer) throw new AnswerValidationError(question.canonicalId, "pnta_not_allowed");
    return null;
  }
  switch (question.type) {
    case "likert_5":
    case "likert_7": {
      if (raw === NA_VALUE) {
        if (!question.naOption) throw new AnswerValidationError(question.canonicalId, "na_not_allowed");
        return NA_VALUE;
      }
      const n = Number(raw);
      const { min, max } = question.scale ?? { min: 1, max: question.type === "likert_5" ? 5 : 7 };
      if (!Number.isInteger(n) || n < min || n > max) throw new AnswerValidationError(question.canonicalId, "scale");
      return n;
    }
    case "numeric": {
      const n = Number(raw);
      if (!Number.isFinite(n)) throw new AnswerValidationError(question.canonicalId, "numeric");
      return n;
    }
    case "single_choice": {
      const v = String(raw);
      if (!availableOptions(question, answers).some((o) => o.value === v)) throw new AnswerValidationError(question.canonicalId, "option");
      return v;
    }
    case "multi_select": {
      const list = [...new Set(Array.isArray(raw) ? raw.map(String) : String(raw).split(",").filter(Boolean))];
      const options = question.options ?? [];
      if (list.some((v) => !options.some((o) => o.value === v))) throw new AnswerValidationError(question.canonicalId, "option");
      // An exclusive option ("No significant barrier") cannot be combined with any other selection.
      const exclusive = list.filter((v) => options.find((o) => o.value === v)?.exclusive);
      if (exclusive.length > 0 && list.length > 1) throw new AnswerValidationError(question.canonicalId, "exclusive");
      if (question.maxSelections && list.length > question.maxSelections) throw new AnswerValidationError(question.canonicalId, "max_selections");
      return list;
    }
    case "matrix": {
      const obj = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
      const out: Record<string, number> = {};
      const columns = question.matrixColumns ?? [];
      for (const row of question.matrixRows ?? []) {
        const v = obj[row.key];
        if (v == null || v === "") continue;
        const colIndex = columns.findIndex((c) => c.value === String(v));
        if (colIndex < 0) throw new AnswerValidationError(question.canonicalId, "matrix");
        out[row.key] = colIndex;
      }
      return out;
    }
    case "short_text":
    case "long_text": {
      const s = String(raw).trim().slice(0, question.type === "short_text" ? 300 : 4000);
      return s;
    }
  }
}

/**
 * Saves answers for a respondent. Only questions that are visible under the current routing are
 * accepted, so a respondent cannot answer hidden (e.g. manager-only) items by crafting requests.
 */
export async function saveAnswers(
  db: Db,
  access: Extract<SurveyAccess, { kind: "respondent" }>,
  input: Record<string, unknown>,
): Promise<{ answers: Record<string, ResponseValue>; progress: SurveyProgress }> {
  const { respondent, definition } = access;
  let answers = await loadAnswers(db, respondent.id);
  let attributes: SegmentAttributes = { ...respondent.segmentAttributes };
  const now = new Date();
  const pending = new Map(Object.entries(input));
  // Several passes: an answer on this page can reveal a follow-up on the same page (CTX_03 → CTX_04).
  for (let pass = 0; pass < 10 && pending.size > 0; pass += 1) {
    const routed = routeQuestionnaire(definition, { attributes: attributes as RoutingContext["attributes"], answers });
    const visible = new Map(routed.flatMap((e) => e.questions.map((q) => [q.canonicalId, q] as const)));
    let accepted = 0;
    for (const [canonicalId, raw] of pending) {
      const question = visible.get(canonicalId);
      if (!question) continue;
      pending.delete(canonicalId);
      accepted += 1;
      const value = validateAnswer(question, raw, answers);
      await db
        .insert(responses)
        .values({ id: newId(), respondentId: respondent.id, waveId: respondent.waveId, questionCanonicalId: canonicalId, questionVersion: question.version, value, answeredAt: now })
        .onConflictDoUpdate({ target: [responses.respondentId, responses.questionCanonicalId], set: { value, questionVersion: question.version, answeredAt: now } });
      answers = { ...answers, [canonicalId]: value };
      if (question.segmentKey) attributes = applySegment(attributes, question.segmentKey, value);
    }
    if (accepted === 0) break;
  }
  // Answers to questions the respondent can no longer see (e.g. after changing USE_01 to "none") are
  // discarded so hidden items never reach the measurement engine. The same applies to a piped choice
  // whose source answer changed (USE_03 after editing USE_02).
  const visibleNow = routeQuestionnaire(definition, { attributes: attributes as RoutingContext["attributes"], answers }).flatMap((e) => e.questions);
  const stillValid = new Set(
    visibleNow
      .filter((q) => !q.optionsFromAnswer || typeof answers[q.canonicalId] !== "string" || availableOptions(q, answers).some((o) => o.value === answers[q.canonicalId]))
      .map((q) => q.canonicalId),
  );
  const stale = Object.keys(answers).filter((id) => !stillValid.has(id));
  if (stale.length > 0) {
    await db.delete(responses).where(and(eq(responses.respondentId, respondent.id), inArray(responses.questionCanonicalId, stale)));
    answers = Object.fromEntries(Object.entries(answers).filter(([id]) => stillValid.has(id)));
  }
  const [updated] = await db
    .update(respondents)
    .set({ segmentAttributes: attributes, updatedAt: now, status: respondent.status === "invited" ? "started" : respondent.status, startedAt: respondent.startedAt ?? now })
    .where(eq(respondents.id, respondent.id))
    .returning();
  const progress = computeProgress(definition, updated!, answers);
  await db.update(respondents).set({ currentSectionIndex: Math.min(progress.nextIndex, progress.routed.length) }).where(eq(respondents.id, respondent.id));
  return { answers, progress };
}

function applySegment(attributes: SegmentAttributes, key: NonNullable<QuestionDefinition["segmentKey"]>, value: ResponseValue): SegmentAttributes {
  const next = { ...attributes };
  if (value == null) {
    delete next[key];
    return next;
  }
  if (key === "is_manager") next.is_manager = value === "yes";
  else next[key] = String(value);
  return next;
}

export async function completeRespondent(db: Db, access: Extract<SurveyAccess, { kind: "respondent" }>): Promise<{ ok: true } | { ok: false; nextIndex: number }> {
  const answers = await loadAnswers(db, access.respondent.id);
  const progress = computeProgress(access.definition, access.respondent, answers);
  if (progress.nextIndex < progress.routed.length) return { ok: false, nextIndex: progress.nextIndex };
  if (access.respondent.status !== "completed") {
    const now = new Date();
    await db.update(respondents).set({ status: "completed", completedAt: now, updatedAt: now }).where(and(eq(respondents.id, access.respondent.id)));
    await recordSystemAudit(db, access.workspaceId, { actorLabel: "respondent", action: "survey.completed", entityType: "respondent", entityId: access.respondent.id, projectId: access.wave.projectId, clientId: access.client.id });
  }
  return { ok: true };
}

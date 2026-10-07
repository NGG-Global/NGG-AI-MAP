import { and, desc, eq, inArray, or } from "drizzle-orm";
import { consumeRateLimit, RATE_RULES } from "@/server/security/rateLimit";
import { insights, responses, respondents, users, waves, type Insight } from "@/server/db/schema";
import { newId } from "@/lib/ids";
import { ConflictError, NotFoundError, ValidationError } from "@/server/shared/errors";
import { executiveSummarySchema, goalSuggestionsSchema, metricChangeExplanationSchema, openTextThemesSchema, type AnalyticalPayload, type EvidenceRef } from "@/domain/ai/contracts";
import { allowedMetricIds, buildAnalyticalPayload } from "@/domain/ai/payload";
import { getAIProvider } from "@/server/ai";
import { AIProviderError } from "@/server/ai/provider";
import type { InsightType } from "@/domain/shared/enums";
import type { ServiceContext } from "./context";
import { listVisibleProjects, requireProject } from "./access";
import { recordAudit } from "./audit";
import { getWaveResults } from "./results";
import { findQuestion } from "@/domain/questionnaire/definition";
import { lt } from "@/domain/shared/localized";
import { questionnaireVersions } from "@/server/db/schema";

const MAX_OPEN_TEXT_SAMPLES = 60;

/* ------------------------------------------------------- payload build */

/** Minimum number of open-text answers before any of them is sent for analysis. */
const MIN_OPEN_TEXT_SAMPLES = 10;

async function knownNamesFor(ctx: ServiceContext, clientId: string): Promise<string[]> {
  const rows = await ctx.db.select({ name: users.name }).from(users).where(or(eq(users.clientId, clientId), eq(users.kind, "ngg")));
  return rows.map((r) => r.name).filter(Boolean);
}

/** Builds the sanitised payload for a wave. Open-text samples are only included for the themes task. */
export async function buildPayloadForWave(ctx: ServiceContext, waveId: string, options: { includeOpenText?: boolean } = {}): Promise<AnalyticalPayload> {
  const view = await getWaveResults(ctx, waveId);
  await requireProject(ctx, view.wave.projectId, "insight.generate");
  const barriersDist = view.distributions.find((d) => d.itemCanonicalId === "BARRIER_01");
  let barriers: Array<{ label: string; share: number }> = [];
  if (barriersDist && !barriersDist.suppressed && view.wave.questionnaireVersionId) {
    const [version] = await ctx.db.select().from(questionnaireVersions).where(eq(questionnaireVersions.id, view.wave.questionnaireVersionId)).limit(1);
    const q = version ? findQuestion(version.definition, "BARRIER_01") : undefined;
    barriers = Object.entries(barriersDist.buckets).map(([value, share]) => ({ label: lt(q?.options?.find((o) => o.value === value)?.label, view.client.locale) || value, share }));
  }
  let openTextSamples: string[] = [];
  let knownNames: string[] = [];
  if (options.includeOpenText) {
    // Only NGG users with raw access may feed open text to the provider, and only redacted, sampled text.
    await requireProject(ctx, view.wave.projectId, "results.view_raw");
    const rows = await ctx.db
      .select({ value: responses.value })
      .from(responses)
      .innerJoin(respondents, eq(respondents.id, responses.respondentId))
      .where(and(eq(responses.waveId, waveId), inArray(responses.questionCanonicalId, ["OPEN_01", "OPEN_02"]), eq(respondents.status, "completed")));
    openTextSamples = rows.map((r) => (typeof r.value === "string" ? r.value.trim() : "")).filter((s) => s.length > 3).slice(0, MAX_OPEN_TEXT_SAMPLES);
    // Below the privacy threshold a handful of answers could identify their authors: send none.
    if (openTextSamples.length < Math.max(view.client.privacyThreshold, MIN_OPEN_TEXT_SAMPLES)) openTextSamples = [];
    else knownNames = await knownNamesFor(ctx, view.client.id);
  }
  return buildAnalyticalPayload({
    // The provider needs no client identity: labels stay generic (data minimisation).
    clientLabel: view.client.locale === "he" ? "הארגון" : "The organization",
    projectLabel: view.client.locale === "he" ? "פרויקט אבחון" : "Assessment project",
    knownNames,
    locale: view.client.locale,
    waveCode: view.wave.code,
    baselineWaveCode: view.baseline?.code ?? null,
    respondentCount: view.respondentCount,
    privacyThreshold: view.client.privacyThreshold,
    metrics: view.metrics,
    compared: view.compared,
    gaps: view.gaps,
    barriers,
    openTextSamples,
  });
}

/* ------------------------------------------------------------ generate */

function validateOutput(type: InsightType, raw: unknown, allowed: Set<string>): { payload: unknown; evidenceIds: string[]; warnings: string[] } {
  const warnings: string[] = [];
  const checkIds = (ids: string[]) => {
    const bad = ids.filter((id) => !allowed.has(id));
    if (bad.length) warnings.push(`unknown_metric_ids:${bad.join(",")}`);
    return ids.filter((id) => allowed.has(id));
  };
  switch (type) {
    case "executive_summary": {
      const parsed = executiveSummarySchema.safeParse(raw);
      if (!parsed.success) throw new ValidationError("ai_output", parsed.error.issues.map((i) => i.path.join(".")));
      const out = parsed.data;
      out.keyChanges = out.keyChanges.map((k) => ({ ...k, metricIds: checkIds(k.metricIds) }));
      out.risks = out.risks.map((k) => ({ ...k, metricIds: checkIds(k.metricIds) }));
      out.opportunities = out.opportunities.map((k) => ({ ...k, metricIds: checkIds(k.metricIds) }));
      return { payload: out, evidenceIds: [...new Set([...out.keyChanges, ...out.risks, ...out.opportunities].flatMap((k) => k.metricIds))], warnings };
    }
    case "explain_change": {
      const parsed = metricChangeExplanationSchema.safeParse(raw);
      if (!parsed.success) throw new ValidationError("ai_output", parsed.error.issues.map((i) => i.path.join(".")));
      const out = parsed.data;
      if (!allowed.has(out.metricId)) throw new ValidationError("ai_output", ["metricId"]);
      out.relatedChanges = out.relatedChanges.filter((r) => allowed.has(r.metricId) || (warnings.push(`unknown_metric_ids:${r.metricId}`), false));
      return { payload: out, evidenceIds: [out.metricId, ...out.relatedChanges.map((r) => r.metricId)], warnings };
    }
    case "goal_suggestions": {
      const parsed = goalSuggestionsSchema.safeParse(raw);
      if (!parsed.success) throw new ValidationError("ai_output", parsed.error.issues.map((i) => i.path.join(".")));
      const out = parsed.data;
      out.goals = out.goals.map((g) => ({ ...g, relatedMetrics: checkIds(g.relatedMetrics) }));
      return { payload: out, evidenceIds: [...new Set(out.goals.flatMap((g) => g.relatedMetrics))], warnings };
    }
    case "open_text_themes": {
      const parsed = openTextThemesSchema.safeParse(raw);
      if (!parsed.success) throw new ValidationError("ai_output", parsed.error.issues.map((i) => i.path.join(".")));
      return { payload: parsed.data, evidenceIds: [], warnings };
    }
  }
}

/** Causal-language check (spec §29.2). Flags, never rewrites. */
function causalWarnings(payload: unknown): string[] {
  const text = JSON.stringify(payload);
  const patterns = [/בזכות/, /גרם/, /נובע/, /\bcaused\b/i, /\bbecause of\b/i, /\bdue to\b/i, /\bled to\b/i, /\bresulted in\b/i];
  return patterns.some((p) => p.test(text)) ? ["causal_language"] : [];
}

/**
 * Generates an insight through the provider and stores it as a DRAFT. Never auto-published (spec §55).
 * Pipeline: cached aggregates → privacy-filtered payload → provider → schema validation → evidence refs → draft.
 */
export async function generateInsight(ctx: ServiceContext, waveId: string, type: InsightType, options: { metricId?: string } = {}): Promise<Insight> {
  const [wave] = await ctx.db.select().from(waves).where(eq(waves.id, waveId)).limit(1);
  if (!wave) throw new NotFoundError("wave");
  const { client } = await requireProject(ctx, wave.projectId, "insight.generate");
  // Each generation may call a paid external model.
  await consumeRateLimit(ctx.db, RATE_RULES.aiByUser, ctx.actor.userId);
  const payload = await buildPayloadForWave(ctx, waveId, { includeOpenText: type === "open_text_themes" });
  const provider = getAIProvider();
  let raw: unknown;
  try {
    switch (type) {
      case "executive_summary":
        raw = await provider.generateExecutiveSummary(payload);
        break;
      case "explain_change":
        if (!options.metricId) throw new ValidationError("metric_required");
        raw = await provider.explainMetricChange(payload, options.metricId);
        break;
      case "goal_suggestions":
        raw = await provider.generateManagementGoals(payload);
        break;
      case "open_text_themes":
        // Never call the provider with too few answers; record an "insufficient evidence" draft instead.
        raw = payload.openTextSamples.length === 0 ? { themes: [], responseCount: 0, insufficientEvidence: true } : await provider.analyzeOpenTextThemes(payload);
        break;
    }
  } catch (error) {
    await recordAudit(ctx, { action: "ai.generation_failed", entityType: "wave", entityId: waveId, clientId: client.id, projectId: wave.projectId, metadata: { type, error: error instanceof Error ? error.message : "unknown" } });
    if (error instanceof AIProviderError) throw new ConflictError("ai_unavailable");
    throw error;
  }
  const allowed = allowedMetricIds(payload);
  const { payload: validated, evidenceIds, warnings } = validateOutput(type, raw, allowed);
  const evidence: EvidenceRef[] = evidenceIds.map((id) => {
    const m = payload.metrics.find((x) => x.metricId === id);
    const g = payload.gaps.find((x) => x.pairId === id);
    return { metricId: id, waveCode: payload.waveCode, score: m?.score ?? g?.teamScore ?? null, delta: m?.delta ?? g?.gap ?? null, n: m?.n ?? g?.teamN ?? 0 };
  });
  const id = newId();
  // The stored input snapshot never contains open-text samples.
  const { openTextSamples: _omit, ...inputSnapshot } = payload;
  void _omit;
  const [created] = await ctx.db
    .insert(insights)
    .values({
      id,
      projectId: wave.projectId,
      waveId,
      comparisonWaveId: wave.baselineWaveId,
      type,
      status: "draft",
      payload: validated,
      evidence,
      inputSnapshot: { ...inputSnapshot, openTextSampleCount: payload.openTextSamples.length },
      validationWarnings: [...warnings, ...causalWarnings(validated)],
      provider: provider.meta.provider,
      model: provider.meta.model,
      promptTemplate: `${type}@v1`,
      createdByUserId: ctx.actor.userId,
    })
    .returning();
  await recordAudit(ctx, { action: "ai.insight_generated", entityType: "insight", entityId: id, clientId: client.id, projectId: wave.projectId, metadata: { type, provider: provider.meta.provider, warnings } });
  return created!;
}

/* -------------------------------------------------------------- review */

export async function listProjectInsights(ctx: ServiceContext, projectId: string, options: { publishedOnly?: boolean } = {}): Promise<Insight[]> {
  await requireProject(ctx, projectId, "project.view");
  const publishedOnly = options.publishedOnly || ctx.actor.kind === "client";
  return ctx.db
    .select()
    .from(insights)
    .where(publishedOnly ? and(eq(insights.projectId, projectId), eq(insights.status, "published")) : eq(insights.projectId, projectId))
    .orderBy(desc(insights.createdAt));
}

/** Review queue across the actor's visible projects (NGG only). */
export async function listReviewQueue(ctx: ServiceContext): Promise<Insight[]> {
  if (ctx.actor.kind !== "ngg") return [];
  const visible = await listVisibleProjects(ctx);
  if (!visible.length) return [];
  return ctx.db
    .select()
    .from(insights)
    .where(and(inArray(insights.projectId, visible.map((p) => p.id)), inArray(insights.status, ["draft", "reviewed"])))
    .orderBy(desc(insights.createdAt));
}

export async function getInsight(ctx: ServiceContext, insightId: string): Promise<Insight> {
  const [row] = await ctx.db.select().from(insights).where(eq(insights.id, insightId)).limit(1);
  if (!row) throw new NotFoundError("insight");
  await requireProject(ctx, row.projectId, "project.view");
  if (ctx.actor.kind === "client" && row.status !== "published") throw new NotFoundError("insight");
  return row;
}

/** Editable fields of a draft: NGG reviewers may edit the wording before approval. */
export async function updateInsightPayload(ctx: ServiceContext, insightId: string, payload: unknown): Promise<Insight> {
  const row = await getInsight(ctx, insightId);
  const { client } = await requireProject(ctx, row.projectId, "insight.review");
  if (row.status === "published") throw new ConflictError("insight_published");
  const { payload: validated } = validateOutput(row.type, payload, new Set((row.evidence ?? []).map((e) => e.metricId).concat(((row.inputSnapshot as AnalyticalPayload).metrics ?? []).map((m) => m.metricId), ((row.inputSnapshot as AnalyticalPayload).gaps ?? []).map((g) => g.pairId))));
  const [updated] = await ctx.db
    .update(insights)
    .set({ payload: validated, validationWarnings: causalWarnings(validated), updatedAt: new Date() })
    .where(eq(insights.id, insightId))
    .returning();
  await recordAudit(ctx, { action: "ai.insight_edited", entityType: "insight", entityId: insightId, clientId: client.id, projectId: row.projectId });
  return updated!;
}

export type ReviewDecision = "reviewed" | "published" | "rejected";

/** Draft → Reviewed → Published, or Rejected. Publishing requires `insight.review`. */
export async function reviewInsight(ctx: ServiceContext, insightId: string, decision: ReviewDecision, note?: string): Promise<Insight> {
  const row = await getInsight(ctx, insightId);
  const { client } = await requireProject(ctx, row.projectId, "insight.review");
  if (decision === "published" && row.status === "rejected") throw new ConflictError("insight_rejected");
  const now = new Date();
  const [updated] = await ctx.db
    .update(insights)
    .set({
      status: decision,
      reviewedByUserId: ctx.actor.userId,
      reviewedAt: now,
      publishedAt: decision === "published" ? now : row.publishedAt,
      reviewNote: note ?? row.reviewNote,
      updatedAt: now,
    })
    .where(eq(insights.id, insightId))
    .returning();
  await recordAudit(ctx, { action: `ai.insight_${decision}`, entityType: "insight", entityId: insightId, clientId: client.id, projectId: row.projectId });
  return updated!;
}

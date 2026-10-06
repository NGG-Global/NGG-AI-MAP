import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  identityMap,
  questionnaireVersions,
  respondents,
  waves,
  type QuestionnaireVersion,
  type Wave,
  type WaveAudienceConfig,
} from "@/server/db/schema";
import { newId } from "@/lib/ids";
import { env } from "@/server/shared/env";
import { generateToken, hashToken, hmacIdentifier } from "@/server/auth/tokens";
import { ConflictError, NotFoundError, ValidationError } from "@/server/shared/errors";
import { AUDIENCE_SCOPES, DISTRIBUTION_MODES, LOCALES, PRIVACY_MODES, WAVE_TYPES } from "@/domain/shared/enums";
import { computeComparability, type Comparability } from "@/domain/questionnaire/logic";
import type { ServiceContext } from "./context";
import { requireProject } from "./access";
import { recordAudit } from "./audit";
import { createNextVersion, getQuestionnaireState, lockVersion } from "./questionnaires";
import { loadMetricConfigs } from "./library";

/* ------------------------------------------------------------- schemas */

export const waveInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.enum(WAVE_TYPES),
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().optional(),
  /** `draft` = current draft version, `duplicate` = clone the previous wave's version, or a version id. */
  questionnaireSource: z.string().default("draft"),
  audienceScope: z.enum(AUDIENCE_SCOPES).default("all_organization"),
  audienceUnits: z.array(z.string()).default([]),
  audienceNote: z.string().trim().max(500).optional(),
  distributionMode: z.enum(DISTRIBUTION_MODES).default("public_link"),
  privacyMode: z.enum(PRIVACY_MODES).default("anonymous"),
  locale: z.enum(LOCALES).default("he"),
  invitedCount: z.coerce.number().int().min(0).default(0),
});
export type WaveInput = z.infer<typeof waveInputSchema>;

export interface WaveWithCounts extends Wave {
  counts: { invited: number; started: number; completed: number; total: number };
  responseRate: number | null;
  version: QuestionnaireVersion | null;
}

/* ------------------------------------------------------------- queries */

export async function listWaves(ctx: ServiceContext, projectId: string): Promise<WaveWithCounts[]> {
  await requireProject(ctx, projectId, "project.view");
  const rows = await ctx.db
    .select({ wave: waves, version: questionnaireVersions })
    .from(waves)
    .leftJoin(questionnaireVersions, eq(questionnaireVersions.id, waves.questionnaireVersionId))
    .where(eq(waves.projectId, projectId))
    .orderBy(asc(waves.createdAt));
  const counts = rows.length
    ? await ctx.db
        .select({ waveId: respondents.waveId, status: respondents.status, n: count() })
        .from(respondents)
        .where(sql`${respondents.waveId} in ${rows.map((r) => r.wave.id)}`)
        .groupBy(respondents.waveId, respondents.status)
    : [];
  return rows.map(({ wave, version }) => {
    const c = { invited: 0, started: 0, completed: 0, total: 0 };
    for (const row of counts.filter((x) => x.waveId === wave.id)) {
      c[row.status] += Number(row.n);
      c.total += Number(row.n);
    }
    const denominator = wave.invitedCount > 0 ? wave.invitedCount : c.total;
    return { ...wave, counts: c, responseRate: denominator > 0 ? Math.round((c.completed / denominator) * 100) : null, version };
  });
}

export async function getWave(ctx: ServiceContext, waveId: string): Promise<WaveWithCounts> {
  const [row] = await ctx.db.select().from(waves).where(eq(waves.id, waveId)).limit(1);
  if (!row) throw new NotFoundError("wave");
  const all = await listWaves(ctx, row.projectId);
  const found = all.find((w) => w.id === waveId);
  if (!found) throw new NotFoundError("wave");
  return found;
}

/** Baseline wave of a project (the first wave of type baseline). */
export async function getBaselineWave(ctx: ServiceContext, projectId: string): Promise<Wave | null> {
  await requireProject(ctx, projectId, "project.view");
  const [row] = await ctx.db
    .select()
    .from(waves)
    .where(and(eq(waves.projectId, projectId), eq(waves.type, "baseline")))
    .orderBy(asc(waves.createdAt))
    .limit(1);
  return row ?? null;
}

/* ------------------------------------------------------------ creation */

function nextWaveCode(existing: Wave[], type: "baseline" | "follow_up"): string {
  if (type === "baseline" && !existing.some((w) => w.type === "baseline")) return "T0";
  const used = new Set(existing.map((w) => w.code));
  let n = existing.length;
  while (used.has(`T${n}`)) n += 1;
  return `T${n}`;
}

/**
 * Creates a wave in draft state. The questionnaire version is resolved now; it is frozen on publish.
 * Follow-up waves default to duplicating the previous wave's questionnaire (spec §18, §50).
 */
export async function createWave(ctx: ServiceContext, projectId: string, input: WaveInput): Promise<Wave> {
  const { client } = await requireProject(ctx, projectId, "wave.manage");
  const parsed = waveInputSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("wave", parsed.error.issues.map((i) => i.path.join(".")));
  const data = parsed.data;
  if (data.startAt && data.endAt && data.endAt <= data.startAt) throw new ValidationError("dates", ["endAt"]);

  const existing = await ctx.db.select().from(waves).where(eq(waves.projectId, projectId)).orderBy(asc(waves.createdAt));
  if (data.type === "baseline" && existing.some((w) => w.type === "baseline")) throw new ConflictError("baseline_exists");
  if (data.type === "follow_up" && !existing.some((w) => w.type === "baseline")) throw new ValidationError("no_baseline");
  if (existing.some((w) => w.status === "draft" || w.status === "scheduled" || w.status === "open")) throw new ConflictError("wave_in_progress");

  const state = await getQuestionnaireState(ctx, projectId);
  if (!state) throw new ValidationError("no_questionnaire");

  let versionId: string;
  const previous = existing[existing.length - 1];
  if (data.questionnaireSource === "duplicate") {
    if (!previous?.questionnaireVersionId) throw new ValidationError("no_previous");
    const draft = state.draft ?? (await createNextVersion(ctx, previous.questionnaireVersionId));
    versionId = draft.id;
  } else if (data.questionnaireSource === "draft") {
    const draft = state.draft ?? (state.latestLocked ? await createNextVersion(ctx, state.latestLocked.id) : null);
    if (!draft) throw new ValidationError("no_draft");
    versionId = draft.id;
  } else {
    const version = state.versions.find((v) => v.id === data.questionnaireSource);
    if (!version) throw new NotFoundError("version");
    versionId = version.id;
  }

  const baseline = existing.find((w) => w.type === "baseline");
  const id = newId();
  const audience: WaveAudienceConfig = { scope: data.audienceScope, units: data.audienceUnits, note: data.audienceNote };
  const [created] = await ctx.db
    .insert(waves)
    .values({
      id,
      projectId,
      code: nextWaveCode(existing, data.type),
      name: data.name,
      type: data.type,
      status: "draft",
      questionnaireVersionId: versionId,
      baselineWaveId: data.type === "follow_up" ? (baseline?.id ?? null) : null,
      startAt: data.startAt ?? null,
      endAt: data.endAt ?? null,
      audience,
      distributionMode: data.distributionMode,
      privacyMode: data.privacyMode,
      locale: data.locale,
      invitedCount: data.invitedCount,
    })
    .returning();
  await recordAudit(ctx, { action: "wave.created", entityType: "wave", entityId: id, clientId: client.id, projectId, metadata: { code: created!.code, type: data.type } });
  return created!;
}

export const waveUpdateSchema = waveInputSchema.omit({ type: true, questionnaireSource: true });

export async function updateWave(ctx: ServiceContext, waveId: string, input: z.infer<typeof waveUpdateSchema>): Promise<Wave> {
  const wave = await getWave(ctx, waveId);
  const { client } = await requireProject(ctx, wave.projectId, "wave.manage");
  if (wave.status === "closed") throw new ConflictError("wave_closed");
  const parsed = waveUpdateSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("wave", parsed.error.issues.map((i) => i.path.join(".")));
  const d = parsed.data;
  if (d.startAt && d.endAt && d.endAt <= d.startAt) throw new ValidationError("dates", ["endAt"]);
  const [updated] = await ctx.db
    .update(waves)
    .set({
      name: d.name,
      startAt: d.startAt ?? null,
      endAt: d.endAt ?? null,
      audience: { scope: d.audienceScope, units: d.audienceUnits, note: d.audienceNote },
      // distribution and privacy mode are frozen once published
      ...(wave.status === "draft" ? { distributionMode: d.distributionMode, privacyMode: d.privacyMode, locale: d.locale } : {}),
      invitedCount: d.invitedCount,
      updatedAt: new Date(),
    })
    .where(eq(waves.id, waveId))
    .returning();
  await recordAudit(ctx, { action: "wave.updated", entityType: "wave", entityId: waveId, clientId: client.id, projectId: wave.projectId });
  return updated!;
}

/** Publishing freezes the questionnaire snapshot and opens the survey (spec §38). */
export async function publishWave(ctx: ServiceContext, waveId: string): Promise<Wave> {
  const wave = await getWave(ctx, waveId);
  const { client } = await requireProject(ctx, wave.projectId, "wave.manage");
  if (wave.status !== "draft" && wave.status !== "scheduled") throw new ConflictError("wave_not_draft");
  if (!wave.questionnaireVersionId) throw new ValidationError("no_questionnaire");
  const version = await lockVersion(ctx, wave.questionnaireVersionId);
  if (version.definition.sections.length === 0) throw new ValidationError("empty_questionnaire");
  const now = new Date();
  const status = wave.startAt && wave.startAt > now ? "scheduled" : "open";
  const [updated] = await ctx.db
    .update(waves)
    .set({
      status,
      publishedAt: now,
      publicToken: wave.distributionMode === "public_link" ? (wave.publicToken ?? generateToken(24)) : null,
      updatedAt: now,
    })
    .where(eq(waves.id, waveId))
    .returning();
  await recordAudit(ctx, { action: "wave.published", entityType: "wave", entityId: waveId, clientId: client.id, projectId: wave.projectId, metadata: { code: wave.code, version: version.versionLabel, status } });
  return updated!;
}

export async function closeWave(ctx: ServiceContext, waveId: string): Promise<Wave> {
  const wave = await getWave(ctx, waveId);
  const { client } = await requireProject(ctx, wave.projectId, "wave.manage");
  if (wave.status !== "open" && wave.status !== "scheduled") throw new ConflictError("wave_not_open");
  const now = new Date();
  const [updated] = await ctx.db.update(waves).set({ status: "closed", closedAt: now, updatedAt: now }).where(eq(waves.id, waveId)).returning();
  await recordAudit(ctx, { action: "wave.closed", entityType: "wave", entityId: waveId, clientId: client.id, projectId: wave.projectId, metadata: { code: wave.code } });
  const { computeWaveResults } = await import("./results");
  await computeWaveResults(ctx, waveId);
  return updated!;
}

/** Deletes a wave that was never published. */
export async function deleteDraftWave(ctx: ServiceContext, waveId: string): Promise<void> {
  const wave = await getWave(ctx, waveId);
  const { client } = await requireProject(ctx, wave.projectId, "wave.manage");
  if (wave.status !== "draft") throw new ConflictError("wave_not_draft");
  await ctx.db.delete(waves).where(eq(waves.id, waveId));
  await recordAudit(ctx, { action: "wave.deleted", entityType: "wave", entityId: waveId, clientId: client.id, projectId: wave.projectId });
}

/* --------------------------------------------------------- distribution */

export function surveyUrl(token: string): string {
  return `${env.appUrl}/survey/${token}`;
}

/** Unique-token distribution: creates N respondents and returns their clear tokens once (for CSV export). */
export async function createRespondentTokens(ctx: ServiceContext, waveId: string, input: { count?: number; emails?: string[] }): Promise<Array<{ token: string; email?: string }>> {
  const wave = await getWave(ctx, waveId);
  const { client } = await requireProject(ctx, wave.projectId, "wave.manage");
  if (wave.distributionMode !== "unique_tokens") throw new ValidationError("distribution_mode");
  if (wave.status === "closed") throw new ConflictError("wave_closed");
  const emails = (input.emails ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean);
  const total = emails.length || Math.min(Math.max(input.count ?? 0, 0), 5000);
  if (total === 0) throw new ValidationError("count");
  const out: Array<{ token: string; email?: string }> = [];
  for (let i = 0; i < total; i += 1) {
    const token = generateToken(18);
    const email = emails[i];
    let pseudo: string | null = null;
    if (email && wave.privacyMode === "pseudonymous") {
      // Identity lives only in identity_map; respondents carry the hash (spec §39).
      const emailHash = hmacIdentifier(email, env.sessionSecret);
      const [existing] = await ctx.db
        .select()
        .from(identityMap)
        .where(and(eq(identityMap.projectId, wave.projectId), eq(identityMap.emailHash, emailHash)))
        .limit(1);
      pseudo = existing?.respondentHash ?? hashToken(newId()).slice(0, 32);
      if (!existing) await ctx.db.insert(identityMap).values({ id: newId(), projectId: wave.projectId, emailHash, respondentHash: pseudo });
    }
    await ctx.db.insert(respondents).values({
      id: newId(),
      waveId,
      tokenHash: hashToken(token),
      pseudoIdentifier: pseudo,
      segmentAttributes: {},
      status: "invited",
      locale: wave.locale,
    });
    out.push(email ? { token, email } : { token });
  }
  await ctx.db
    .update(waves)
    .set({ invitedCount: sql`${waves.invitedCount} + ${total}`, updatedAt: new Date() })
    .where(eq(waves.id, waveId));
  await recordAudit(ctx, { action: "wave.tokens_generated", entityType: "wave", entityId: waveId, clientId: client.id, projectId: wave.projectId, metadata: { count: total, withEmails: emails.length > 0 } });
  return out;
}

/* ----------------------------------------------------------- monitoring */

export interface WaveMonitoring {
  invited: number;
  started: number;
  completed: number;
  completionRate: number | null;
  medianCompletionMinutes: number | null;
  perDay: Array<{ day: string; completed: number }>;
  bySegment: Array<{ segment: string; completed: number; suppressed: boolean }>;
}

/** NGG-only monitoring (spec §20). Counts only; never individual answers. */
export async function getWaveMonitoring(ctx: ServiceContext, waveId: string): Promise<WaveMonitoring> {
  const wave = await getWave(ctx, waveId);
  const { client } = await requireProject(ctx, wave.projectId, "wave.manage");
  const rows = await ctx.db
    .select({ status: respondents.status, startedAt: respondents.startedAt, completedAt: respondents.completedAt, segment: respondents.segmentAttributes })
    .from(respondents)
    .where(eq(respondents.waveId, waveId));
  const completed = rows.filter((r) => r.status === "completed");
  const started = rows.filter((r) => r.status === "started");
  const durations = completed
    .map((r) => (r.startedAt && r.completedAt ? (r.completedAt.getTime() - r.startedAt.getTime()) / 60000 : null))
    .filter((d): d is number => d != null && d > 0 && d < 240)
    .sort((a, b) => a - b);
  const median = durations.length ? durations[Math.floor(durations.length / 2)]! : null;
  const perDayMap = new Map<string, number>();
  for (const r of completed) {
    const day = (r.completedAt ?? new Date()).toISOString().slice(0, 10);
    perDayMap.set(day, (perDayMap.get(day) ?? 0) + 1);
  }
  const bySegmentMap = new Map<string, number>();
  for (const r of completed) {
    const seg = r.segment.department ?? "—";
    bySegmentMap.set(seg, (bySegmentMap.get(seg) ?? 0) + 1);
  }
  const invited = wave.invitedCount > 0 ? wave.invitedCount : rows.length;
  return {
    invited,
    started: started.length,
    completed: completed.length,
    completionRate: invited > 0 ? Math.round((completed.length / invited) * 100) : null,
    medianCompletionMinutes: median == null ? null : Math.round(median * 10) / 10,
    perDay: [...perDayMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, n]) => ({ day, completed: n })),
    bySegment: [...bySegmentMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([segment, n]) => ({ segment, completed: n < client.privacyThreshold ? 0 : n, suppressed: n < client.privacyThreshold })),
  };
}

/* --------------------------------------------------------- comparability */

export async function getWaveComparability(ctx: ServiceContext, waveId: string): Promise<{ baseline: Wave; comparability: Comparability } | null> {
  const wave = await getWave(ctx, waveId);
  if (!wave.baselineWaveId || !wave.questionnaireVersionId) return null;
  const [baseline] = await ctx.db.select().from(waves).where(eq(waves.id, wave.baselineWaveId)).limit(1);
  if (!baseline?.questionnaireVersionId) return null;
  const [baseVersion] = await ctx.db.select().from(questionnaireVersions).where(eq(questionnaireVersions.id, baseline.questionnaireVersionId)).limit(1);
  const [curVersion] = await ctx.db.select().from(questionnaireVersions).where(eq(questionnaireVersions.id, wave.questionnaireVersionId)).limit(1);
  if (!baseVersion || !curVersion) return null;
  const metrics = await loadMetricConfigs(ctx.db);
  return { baseline, comparability: computeComparability(baseVersion.definition, curVersion.definition, metrics) };
}

/** Most recent wave with a locked questionnaire, for follow-up defaults. */
export async function getLatestWave(ctx: ServiceContext, projectId: string): Promise<Wave | null> {
  await requireProject(ctx, projectId, "project.view");
  const [row] = await ctx.db.select().from(waves).where(eq(waves.projectId, projectId)).orderBy(desc(waves.createdAt)).limit(1);
  return row ?? null;
}

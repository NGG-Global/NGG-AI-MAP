import { eq } from "drizzle-orm";
import type { Db } from "@/server/db/connection";
import { respondents, responses, waves, questionnaireVersions, type Wave } from "@/server/db/schema";
import { newId } from "@/lib/ids";
import { hashToken, generateToken } from "@/server/auth/tokens";
import { routeQuestionnaire, type RoutingContext } from "@/domain/questionnaire/logic";
import type { QuestionDefinition } from "@/domain/questionnaire/definition";
import type { SegmentAttributes } from "@/domain/measurement/types";

/** Small deterministic PRNG so the demo data is stable across seeds. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export interface WaveProfile {
  /** Mean (1–5) per metric-item prefix; unknown prefixes fall back to `base`. */
  base: number;
  byPrefix: Record<string, number>;
  /** Manager self-report items (mg_) mean; employee experience items (mx_) mean → produces the gap. */
  managerSelf: number;
  teamExperience: number;
  usageWeights: Record<string, number>;
  patternWeights: Record<string, number>;
  barrierWeights: Record<string, number>;
  managerShare: number;
  departments: Array<{ name: string; weight: number; shift: number }>;
}

function pickWeighted(random: () => number, weights: Record<string, number>): string {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let x = random() * total;
  for (const [key, w] of Object.entries(weights)) {
    x -= w;
    if (x <= 0) return key;
  }
  return Object.keys(weights)[0]!;
}

function likert(random: () => number, mean: number): number {
  // triangular-ish noise around the mean, clamped to 1–5 integers
  const noise = (random() + random() - 1) * 1.6;
  return Math.max(1, Math.min(5, Math.round(mean + noise)));
}

function answerFor(q: QuestionDefinition, random: () => number, profile: WaveProfile, ctx: { isManager: boolean; deptShift: number }): unknown {
  const id = q.canonicalId;
  switch (q.type) {
    case "likert_5": {
      if (id.startsWith("mg_")) return likert(random, profile.managerSelf);
      if (id.startsWith("mx_")) {
        const adjust: Record<string, number> = { mx_clarity: -0.35, mx_experiment: 0.25, mx_verify: 0.3, mx_judgment: 0.1 };
        return likert(random, profile.teamExperience + ctx.deptShift + (adjust[id] ?? 0));
      }
      const prefix = Object.keys(profile.byPrefix).find((p) => id.startsWith(p));
      let mean = prefix ? profile.byPrefix[prefix]! : profile.base;
      if (q.reverseCoded) mean = 6 - mean;
      return likert(random, mean + ctx.deptShift);
    }
    case "single_choice": {
      if (id === "ctx_ai_use_30d") return pickWeighted(random, profile.usageWeights);
      if (id === "access_approved_tools") return pickWeighted(random, { yes_sufficient: 4, yes_insufficient: 4, no: 1.5, unknown: 0.5 });
      if (id === "ctx_team_size") return pickWeighted(random, { "1_3": 2, "4_8": 4, "9_15": 3, "16_plus": 1 });
      return q.options?.[Math.floor(random() * (q.options.length || 1))]?.value;
    }
    case "multi_select": {
      if (id === "work_patterns") return Object.entries(profile.patternWeights).filter(([, p]) => random() < p).map(([k]) => k);
      if (id === "barriers_main") return Object.entries(profile.barrierWeights).filter(([, p]) => random() < p).map(([k]) => k).slice(0, 3);
      const n = 1 + Math.floor(random() * 4);
      return (q.options ?? []).filter(() => random() < n / (q.options?.length || 1)).map((o) => o.value).slice(0, 5);
    }
    case "matrix": {
      const cols = q.matrixColumns ?? [];
      const bias = id === "dm_opportunity" ? 1 : 0;
      // stored as column indices, exactly like the survey runtime does after validation
      return Object.fromEntries((q.matrixRows ?? []).map((row) => [row.key, Math.min(cols.length - 1, Math.max(0, Math.floor(random() * 2.4) + bias))]));
    }
    case "short_text":
      return random() < 0.4 ? "חסר רישיון לכלי שאושר" : "";
    case "long_text": {
      const pool = [
        "ההדרכה הפנימית עזרה לי מאוד להתחיל, במיוחד הדוגמאות מהעבודה שלנו.",
        "הייתי משנה את המדיניות — לא ברור מה מותר להכניס לכלי.",
        "חסר זמן ללמוד. העומס לא מאפשר להתנסות.",
        "גישה לכלי אחד מאושר שינתה את העבודה שלי.",
        "המנהל/ת שלי מעודד/ת, אבל אין לנו כללים ברורים.",
        "אשמח לקהילה פנימית לשיתוף פרומפטים ודרכי עבודה.",
      ];
      return random() < 0.7 ? pool[Math.floor(random() * pool.length)] : "";
    }
    default:
      return undefined;
  }
}

/** Generates `count` completed respondents for a published wave, writing responses directly. */
export async function seedWaveResponses(db: Db, wave: Wave, count: number, profile: WaveProfile, seed: number, completedWithin: { start: Date; end: Date }): Promise<number> {
  if (!wave.questionnaireVersionId) return 0;
  const [version] = await db.select().from(questionnaireVersions).where(eq(questionnaireVersions.id, wave.questionnaireVersionId)).limit(1);
  if (!version) return 0;
  const random = rng(seed);
  const def = version.definition;
  let created = 0;
  for (let i = 0; i < count; i++) {
    const isManager = random() < profile.managerShare;
    const dept = pickWeighted(random, Object.fromEntries(profile.departments.map((d) => [d.name, d.weight])));
    const deptShift = profile.departments.find((d) => d.name === dept)?.shift ?? 0;
    const attributes: SegmentAttributes = { department: dept, is_manager: isManager, role_family: isManager ? "ניהולי" : pickWeighted(random, { מקצועי: 5, תפעולי: 3, מטה: 2 }), seniority: pickWeighted(random, { "עד שנתיים": 2, "2–5 שנים": 3, "5–10 שנים": 3, "מעל 10 שנים": 2 }) };
    const answers: Record<string, unknown> = { ctx_is_manager: isManager ? "yes" : "no", ctx_department: dept, ctx_role_family: attributes.role_family, ctx_seniority: attributes.seniority };
    answers.ctx_ai_use_30d = pickWeighted(random, profile.usageWeights);
    const routingCtx: RoutingContext = { attributes: attributes as RoutingContext["attributes"], answers: answers as RoutingContext["answers"] };
    const routed = routeQuestionnaire(def, routingCtx);
    for (const entry of routed) {
      for (const q of entry.questions) {
        if (q.canonicalId in answers) continue;
        const value = answerFor(q, random, profile, { isManager, deptShift });
        if (value === undefined || value === "") continue;
        answers[q.canonicalId] = random() < 0.03 && q.allowPreferNotToAnswer ? null : value;
      }
    }
    const started = new Date(completedWithin.start.getTime() + random() * (completedWithin.end.getTime() - completedWithin.start.getTime()));
    const completed = new Date(started.getTime() + (6 + random() * 9) * 60_000);
    const respondentId = newId();
    await db.insert(respondents).values({
      id: respondentId,
      waveId: wave.id,
      tokenHash: hashToken(generateToken(16)),
      segmentAttributes: attributes,
      status: "completed",
      currentSectionIndex: routed.length,
      locale: wave.locale,
      startedAt: started,
      completedAt: completed,
    });
    const rows = Object.entries(answers).map(([canonicalId, value]) => ({
      id: newId(),
      respondentId,
      waveId: wave.id,
      questionCanonicalId: canonicalId,
      questionVersion: "1.0",
      value: value as never,
      answeredAt: completed,
    }));
    for (let j = 0; j < rows.length; j += 200) await db.insert(responses).values(rows.slice(j, j + 200));
    created += 1;
  }
  await db.update(waves).set({ updatedAt: new Date() }).where(eq(waves.id, wave.id));
  return created;
}

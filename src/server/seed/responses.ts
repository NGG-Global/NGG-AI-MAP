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
  /** Mean on a 1–5 basis for items without a matching prefix. 7-point items are rescaled. */
  base: number;
  /** Mean (1–5 basis) per canonical-id prefix, e.g. `GAIL_PE`, `AW_DELEGATE`, `ORG_POLICY`, `IMPACT_`. */
  byPrefix: Record<string, number>;
  /** Manager self-report (AM_*) mean; team experience (MEXP_*) mean → together they produce the gaps. */
  managerSelf: number;
  teamExperience: number;
  /** Weights over USE_01 values. */
  usageWeights: Record<string, number>;
  /** Selection probability per BARRIER_01 value. */
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

/** Integer answer around a mean given on a 1–5 basis, rescaled to the item's own range. */
function scaleAnswer(random: () => number, mean5: number, min: number, max: number): number {
  const mean = min + ((mean5 - 1) / 4) * (max - min);
  const noise = (random() + random() - 1) * 0.4 * (max - min);
  return Math.max(min, Math.min(max, Math.round(mean + noise)));
}

const TOOL_WEIGHTS: Record<string, number> = { chatgpt: 0.7, copilot: 0.45, claude: 0.2, gemini: 0.2, internal: 0.25, research: 0.15, writing: 0.12, data: 0.1, code: 0.08, media: 0.05, automation: 0.05 };

function meanFor(id: string, profile: WaveProfile): number {
  // Manager items mirrored by MEXP_* (copy §19) carry the manager self-report level.
  if (id.startsWith("AM_HUMANS_") || id === "AM_SYSTEMS_02") return profile.managerSelf;
  if (id.startsWith("MEXP_")) {
    const adjust: Record<string, number> = { MEXP_01: -0.35, MEXP_03: 0.25, MEXP_05: 0.3, MEXP_06: 0.1 };
    return profile.teamExperience + (adjust[id] ?? 0);
  }
  const prefix = Object.keys(profile.byPrefix).sort((a, b) => b.length - a.length).find((p) => id.startsWith(p));
  return prefix ? profile.byPrefix[prefix]! : profile.base;
}

function answerFor(q: QuestionDefinition, random: () => number, profile: WaveProfile, ctx: { deptShift: number; answers: Record<string, unknown> }): unknown {
  const id = q.canonicalId;
  switch (q.type) {
    case "likert_5":
    case "likert_7": {
      if (q.naOption && random() < 0.04) return "na";
      const min = q.scale?.min ?? 1;
      const max = q.scale?.max ?? (q.type === "likert_5" ? 5 : 7);
      let mean = meanFor(id, profile) + ctx.deptShift;
      if (q.reverseCoded) mean = 6 - mean;
      return scaleAnswer(random, mean, min, max);
    }
    case "single_choice": {
      if (id === "USE_01") return pickWeighted(random, profile.usageWeights);
      if (id === "MEXP_SCREEN_01") return random() < 0.92 ? "yes" : "no";
      if (id === "CTX_04") return pickWeighted(random, { "1_3": 2, "4_7": 4, "8_15": 3, "16_plus": 1 });
      if (id === "USE_03") {
        const chosen = Array.isArray(ctx.answers.USE_02) ? (ctx.answers.USE_02 as string[]) : [];
        return chosen[Math.floor(random() * chosen.length)];
      }
      if (id === "IMPACT_QUALITY_01" || id === "IMPACT_TIME_01") {
        if (random() < 0.1) return "hard_to_assess";
        const score = scaleAnswer(random, meanFor(id, profile), 1, 5);
        return q.options?.find((o) => o.score === score)?.value;
      }
      return q.options?.[Math.floor(random() * (q.options.length || 1))]?.value;
    }
    case "multi_select": {
      const options = q.options ?? [];
      if (id === "USE_02") {
        const picked = Object.entries(TOOL_WEIGHTS).filter(([, p]) => random() < p).map(([k]) => k);
        return picked.length ? picked : ["chatgpt"];
      }
      if (id === "BARRIER_01") {
        if (random() < 0.08) return ["no_barrier"];
        const picked = Object.entries(profile.barrierWeights).filter(([, p]) => random() < p).map(([k]) => k).slice(0, 4);
        return picked.length ? picked : ["time"];
      }
      const pool = options.filter((o) => !o.exclusive && o.value !== "other");
      const limit = q.maxSelections ?? 5;
      const picked = pool.filter(() => random() < 2.5 / Math.max(1, pool.length)).map((o) => o.value).slice(0, limit);
      return picked.length ? picked : [pool[Math.floor(random() * pool.length)]!.value];
    }
    case "matrix": {
      const cols = q.matrixColumns ?? [];
      // Mostly human-led or AI-assisted; occasionally delegated, automated or not relevant. Stored as column indices.
      return Object.fromEntries((q.matrixRows ?? []).map((row) => [row.key, Math.min(cols.length - 1, random() < 0.08 ? cols.length - 1 : Math.floor(random() * random() * 4))]));
    }
    case "short_text":
      return "";
    case "long_text": {
      const pool =
        id === "OPEN_02"
          ? ["סיכום ישיבות צוות שבועיות והפקת משימות אוטומטית.", "הכנת דוחות חודשיים מנתוני המערכת.", "מענה לשאלות חוזרות של לקוחות פנימיים."]
          : [
              "הייתי רוצה הדרכה מעשית עם דוגמאות מהעבודה שלנו.",
              "הייתי משנה את המדיניות — לא ברור מה מותר להכניס לכלי.",
              "חסר זמן ללמוד. העומס לא מאפשר להתנסות.",
              "גישה לכלי מאושר אחד הייתה משנה את העבודה שלי.",
              "המנהל/ת שלי מעודד/ת, אבל אין לנו כללים ברורים.",
              "אשמח לקהילה פנימית לשיתוף דרכי עבודה.",
            ];
      return random() < 0.6 ? pool[Math.floor(random() * pool.length)] : "";
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
    const optionsOf = (id: string) => def.sections.flatMap((s) => s.questions).find((q) => q.canonicalId === id)?.options?.map((o) => o.value) ?? [];
    const pick = (values: string[]) => values[Math.floor(random() * values.length)];
    const roleFamily = isManager ? (optionsOf("CTX_02")[0] ?? "ניהול") : pick(optionsOf("CTX_02").slice(1)) ?? "מקצועי / מומחה";
    const seniority = pick(optionsOf("CTX_05")) ?? "4–7 שנים";
    const attributes: SegmentAttributes = { department: dept, is_manager: isManager, role_family: roleFamily, seniority };
    const answers: Record<string, unknown> = { CTX_01: dept, CTX_02: roleFamily, CTX_03: isManager ? "yes" : "no", CTX_05: seniority };
    // Answer in passes: some questions only appear after an earlier answer (USE_03, MEXP_*).
    let routed = routeQuestionnaire(def, { attributes: attributes as RoutingContext["attributes"], answers: answers as RoutingContext["answers"] });
    for (let pass = 0; pass < 6; pass += 1) {
      let added = 0;
      for (const entry of routed) {
        for (const q of entry.questions) {
          if (q.canonicalId in answers) continue;
          const value = answerFor(q, random, profile, { deptShift, answers });
          if (value === undefined || value === "") continue;
          answers[q.canonicalId] = random() < 0.03 && q.allowPreferNotToAnswer ? null : value;
          added += 1;
        }
      }
      routed = routeQuestionnaire(def, { attributes: attributes as RoutingContext["attributes"], answers: answers as RoutingContext["answers"] });
      if (added === 0) break;
    }
    const visible = new Set(routed.flatMap((e) => e.questions.map((q) => q.canonicalId)));
    for (const id of Object.keys(answers)) if (!visible.has(id)) delete answers[id];
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

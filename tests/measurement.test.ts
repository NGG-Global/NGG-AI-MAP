import { describe, expect, it } from "vitest";
import { computeDistribution, computeGap, computeItemStats, computeMetric, computeWave, compareWaves, ALL, type RespondentRecord } from "@/domain/measurement/engine";
import { METRIC_DEFINITIONS, LIBRARY_SECTIONS } from "@/domain/questionnaire/libraryContent";
import type { QuestionnaireDefinition } from "@/domain/questionnaire/definition";

/** Build a definition straight from the library content (no DB). */
function definition(): QuestionnaireDefinition {
  return {
    schemaVersion: 1,
    title: { he: "t" },
    sections: LIBRARY_SECTIONS.map((s, si) => ({
      id: `s${si}`,
      key: s.key,
      title: s.name,
      description: s.description,
      sourceType: s.sourceType,
      researchStatus: s.researchStatus,
      audience: s.audience,
      recommendedCore: false,
      longitudinalCore: false,
      required: true,
      allowPreferNotToAnswer: true,
      displayRules: s.displayRules ?? [],
      questions: s.questions.map((q, qi) => ({
        id: `q${si}_${qi}`,
        canonicalId: q.canonicalId,
        version: "1.0",
        type: q.type,
        sourceType: s.sourceType,
        locked: Boolean(q.locked),
        text: q.content.text,
        options: q.content.options,
        scale: q.content.scale,
        matrixRows: q.content.matrixRows,
        matrixColumns: q.content.matrixColumns,
        required: true,
        allowPreferNotToAnswer: true,
        reverseCoded: Boolean(q.reverseCoded),
        metricId: q.metricId,
        displayRules: [],
        wordingStatus: "final",
      })),
    })),
  };
}

const metric = (id: string) => METRIC_DEFINITIONS.find((m) => m.id === id)!;

function respondent(id: string, attrs: RespondentRecord["attributes"], answers: RespondentRecord["answers"]): RespondentRecord {
  return { id, attributes: attrs, answers };
}

describe("measurement engine", () => {
  const def = definition();

  it("averages items with reverse coding and respects the minimum answered ratio", () => {
    const r1 = respondent("1", {}, { agw_01: 4, agw_02: 4, agw_03: 4, agw_04: 4, agw_05: 4, agw_06: 2 }); // agw_06 reversed → 4 → mean 4
    const r2 = respondent("2", {}, { agw_01: 2, agw_02: null }); // 1 of 6 answered → below 50% → excluded
    const r3 = respondent("3", {}, { agw_01: 5, agw_02: 5, agw_03: 5 }); // 3/6 = 50% → included, mean 5
    const row = computeMetric(metric("agentic_work"), def, [r1, r2, r3], ALL, 2);
    expect(row.score).toBe(4.5);
    expect(row.n).toBe(2);
    expect(row.itemCount).toBe(6);
    expect(row.suppressed).toBe(false);
  });

  it("suppresses segments below the privacy threshold instead of showing partial data", () => {
    const rs = Array.from({ length: 10 }, (_, i) => respondent(`r${i}`, { department: i < 7 ? "Tech" : "HR" }, { ver_01: 4, ver_02: 4, ver_03: 4, ver_04: 2 }));
    const rows = computeWave(def, [metric("verification")], rs, { privacyThreshold: 7, segmentKeys: ["department"] });
    const all = rows.find((r) => r.segment.key === "all")!;
    const tech = rows.find((r) => r.segment.value === "Tech")!;
    const hr = rows.find((r) => r.segment.value === "HR")!;
    expect(all.n).toBe(10);
    expect(all.score).toBe(4);
    expect(tech.suppressed).toBe(false);
    expect(hr.suppressed).toBe(true);
    expect(hr.score).toBeNull();
    expect(hr.n).toBe(0);
  });

  it("scores single-choice items through option scores and computes shares", () => {
    const rs = [
      respondent("a", {}, { ctx_ai_use_30d: "daily", usage_routine: 5 }),
      respondent("b", {}, { ctx_ai_use_30d: "none" }),
      respondent("c", {}, { ctx_ai_use_30d: "weekly", usage_routine: 3 }),
    ];
    const usage = computeMetric(metric("ai_usage"), def, rs, ALL, 1);
    expect(usage.score).toBe((5 + 1 + 3) / 3);
    const daily = computeMetric(metric("ai_daily_share"), def, rs, ALL, 1);
    expect(daily.score).toBeCloseTo(33.33, 1);
    const nonUsers = computeMetric(metric("ai_nonuser_share"), def, rs, ALL, 1);
    expect(nonUsers.score).toBeCloseTo(33.33, 1);
  });

  it("computes work-pattern shares and use-case breadth from multi-select answers", () => {
    const rs = [
      respondent("a", {}, { work_patterns: ["assist", "collaborate"], usecase_types: ["writing", "analysis", "code"] }),
      respondent("b", {}, { work_patterns: ["assist"], usecase_types: ["writing"] }),
    ];
    expect(computeMetric(metric("pattern_assist"), def, rs, ALL, 1).score).toBe(100);
    expect(computeMetric(metric("pattern_collaborate"), def, rs, ALL, 1).score).toBe(50);
    expect(computeMetric(metric("pattern_orchestrate"), def, rs, ALL, 1).score).toBe(0);
    expect(computeMetric(metric("use_case_breadth"), def, rs, ALL, 1).score).toBe(2);
    const dist = computeDistribution("work_patterns", def, rs, ALL, 1)!;
    expect(dist.buckets.assist).toBe(100);
    expect(dist.buckets.delegate).toBe(0);
  });

  it("computes manager–team gaps only when both sides pass the threshold", () => {
    const managers = Array.from({ length: 3 }, (_, i) => respondent(`m${i}`, { is_manager: true }, { mg_clarity: 4.4 + 0 }));
    const team = Array.from({ length: 3 }, (_, i) => respondent(`e${i}`, { is_manager: false }, { mx_clarity: 3.5 }));
    const gap = computeGap(metric("gap_ai_clarity"), def, [...managers, ...team], ALL, 3)!;
    expect(gap.managerScore).toBe(4.4);
    expect(gap.teamScore).toBe(3.5);
    expect(gap.gap).toBe(-0.9);
    expect(gap.managerN).toBe(3);
    const suppressed = computeGap(metric("gap_ai_clarity"), def, [...managers, ...team], ALL, 4)!;
    expect(suppressed.suppressed).toBe(true);
    expect(suppressed.gap).toBeNull();
  });

  it("manager-only metrics ignore employees", () => {
    const rs = [
      respondent("m", { is_manager: true }, { am_self_01: 5, am_self_02: 5, am_self_03: 5 }),
      respondent("e", { is_manager: false }, { am_self_01: 1, am_self_02: 1, am_self_03: 1 }),
    ];
    const row = computeMetric(metric("agentic_manage_self"), def, rs, ALL, 1);
    expect(row.score).toBe(5);
    expect(row.n).toBe(1);
  });

  it("never produces a delta for non-comparable metrics", () => {
    const rsT0 = [respondent("a", {}, { ver_01: 3, ver_02: 3, ver_03: 3, ver_04: 3 })];
    const rsT1 = [respondent("b", {}, { ver_01: 4, ver_02: 4, ver_03: 4, ver_04: 2 })];
    const t0 = computeWave(def, [metric("verification")], rsT0, { privacyThreshold: 1 });
    const t1 = computeWave(def, [metric("verification")], rsT1, { privacyThreshold: 1 });
    const comparable = compareWaves(t1, t0, new Set(["verification"]));
    expect(comparable[0]!.delta).toBe(1);
    expect(comparable[0]!.comparable).toBe(true);
    const notComparable = compareWaves(t1, t0, new Set([]));
    expect(notComparable[0]!.delta).toBeNull();
    expect(notComparable[0]!.comparable).toBe(false);
    const noBaseline = compareWaves(t1, null, null);
    expect(noBaseline[0]!.baseline).toBeNull();
    expect(noBaseline[0]!.delta).toBeNull();
  });

  it("reports strongest and weakest items with suppression", () => {
    const rs = Array.from({ length: 8 }, (_, i) => respondent(`r${i}`, {}, { en_access_01: 5, en_access_02: 2, en_access_03: 3 }));
    const stats = computeItemStats(metric("enablement_access_resources"), def, rs, ALL, 7);
    expect(stats.map((s) => s.score)).toEqual([5, 2, 3]);
    const small = computeItemStats(metric("enablement_access_resources"), def, rs.slice(0, 3), ALL, 7);
    expect(small.every((s) => s.suppressed)).toBe(true);
  });

  it("matrix distributions bucket by row and column", () => {
    const rs = [
      respondent("m1", { is_manager: true }, { dm_current: { planning: 0, reporting: 2 } }),
      respondent("m2", { is_manager: true }, { dm_current: { planning: 1, reporting: 2 } }),
    ];
    const dist = computeDistribution("dm_current", def, rs, ALL, 1)!;
    expect(dist.buckets["planning|human_led"]).toBe(50);
    expect(dist.buckets["planning|ai_assisted"]).toBe(50);
    expect(dist.buckets["reporting|ai_delegated"]).toBe(100);
    expect(dist.n).toBe(2);
  });
});

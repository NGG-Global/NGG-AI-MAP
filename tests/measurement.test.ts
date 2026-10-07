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

  it("averages items, excludes N/A answers and respects the minimum answered ratio", () => {
    const r1 = respondent("1", {}, { AW_ASSIST_01: 4, AW_COLLAB_01: 4, AW_COLLAB_02: 4, AW_DELEGATE_01: 4, AW_DELEGATE_02: 4, AW_ORCH_01: 2, AW_ORCH_02: "na", AW_ORCH_03: "na" }); // 6 of 8 scored → mean 22/6
    const r2 = respondent("2", {}, { AW_ASSIST_01: 2, AW_COLLAB_01: null, AW_COLLAB_02: "na" }); // 1 of 8 scored → below 50% → excluded
    const r3 = respondent("3", {}, { AW_ASSIST_01: 5, AW_COLLAB_01: 5, AW_COLLAB_02: 5, AW_DELEGATE_01: 5 }); // 4/8 = 50% → included, mean 5
    const row = computeMetric(metric("agentic_work"), def, [r1, r2, r3], ALL, 2);
    expect(row.score).toBeCloseTo((22 / 6 + 5) / 2, 2);
    expect(row.n).toBe(2);
    expect(row.itemCount).toBe(8);
    expect(row.suppressed).toBe(false);
  });

  it("GAIL requires all items of a dimension and scores on the 1–7 source scale", () => {
    const full = respondent("a", {}, { GAIL_PE_01: 7, GAIL_PE_02: 6, GAIL_PE_03: 5 });
    const partial = respondent("b", {}, { GAIL_PE_01: 7, GAIL_PE_02: 7 });
    const row = computeMetric(metric("gail_prompt_engineering"), def, [full, partial], ALL, 1);
    expect(row.score).toBe(6);
    expect(row.n).toBe(1);
    expect(metric("gail_total").scaleMax).toBe(7);
    expect(metric("gail_total").itemCanonicalIds).toHaveLength(17);
  });

  it("suppresses segments below the privacy threshold instead of showing partial data", () => {
    const rs = Array.from({ length: 10 }, (_, i) => respondent(`r${i}`, { department: i < 7 ? "Tech" : "HR" }, { VERIFY_01: 4, VERIFY_02: 4, VERIFY_03: 4 }));
    const rows = computeWave(def, [metric("verification_behavior")], rs, { privacyThreshold: 7, segmentKeys: ["department"] });
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

  it("scores usage frequency 1–6 through option scores and computes shares", () => {
    const rs = [
      respondent("a", {}, { USE_01: "several_daily" }),
      respondent("b", {}, { USE_01: "none" }),
      respondent("c", {}, { USE_01: "days_1_2" }),
    ];
    const usage = computeMetric(metric("ai_usage_frequency"), def, rs, ALL, 1);
    expect(usage.score).toBeCloseTo((6 + 1 + 3) / 3, 2);
    const daily = computeMetric(metric("ai_daily_use_share"), def, rs, ALL, 1);
    expect(daily.score).toBeCloseTo(33.33, 1);
    const nonUsers = computeMetric(metric("ai_nonuser_share"), def, rs, ALL, 1);
    expect(nonUsers.score).toBeCloseTo(33.33, 1);
  });

  it("excludes \"hard to assess\" from impact scores", () => {
    const rs = [respondent("a", {}, { IMPACT_TIME_01: "reduces_significantly" }), respondent("b", {}, { IMPACT_TIME_01: "hard_to_assess" }), respondent("c", {}, { IMPACT_TIME_01: "no_change" })];
    const row = computeMetric(metric("impact_time"), def, rs, ALL, 1);
    expect(row.score).toBe(4);
    expect(row.n).toBe(2);
  });

  it("computes the depth-of-work funnel as the share at or above \"often\" and use-case breadth", () => {
    const rs = [
      respondent("a", {}, { AW_ASSIST_01: 5, AW_DELEGATE_01: 4, AW_DELEGATE_02: 3, USE_04: ["writing", "analysis", "code"] }),
      respondent("b", {}, { AW_ASSIST_01: 3, AW_DELEGATE_01: 2, AW_DELEGATE_02: 2, USE_04: ["writing"] }),
    ];
    expect(computeMetric(metric("aw_funnel_assist"), def, rs, ALL, 1).score).toBe(50);
    // a: mean(4,3)=3.5 < 4 → not counted
    expect(computeMetric(metric("aw_funnel_delegate"), def, rs, ALL, 1).score).toBe(0);
    expect(computeMetric(metric("use_case_breadth"), def, rs, ALL, 1).score).toBe(2);
    const dist = computeDistribution("USE_04", def, rs, ALL, 1)!;
    expect(dist.buckets.writing).toBe(100);
    expect(dist.buckets.analysis).toBe(50);
  });

  it("computes manager–team gaps only when both sides pass the threshold", () => {
    const managers = Array.from({ length: 3 }, (_, i) => respondent(`m${i}`, { is_manager: true }, { AM_HUMANS_01: 4.4 }));
    const team = Array.from({ length: 3 }, (_, i) => respondent(`e${i}`, { is_manager: false }, { MEXP_01: 3.5 }));
    const gap = computeGap(metric("gap_expectations"), def, [...managers, ...team], ALL, 3)!;
    expect(gap.managerScore).toBe(4.4);
    expect(gap.teamScore).toBe(3.5);
    expect(gap.gap).toBe(-0.9);
    expect(gap.managerN).toBe(3);
    const suppressed = computeGap(metric("gap_expectations"), def, [...managers, ...team], ALL, 4)!;
    expect(suppressed.suppressed).toBe(true);
    expect(suppressed.gap).toBeNull();
  });

  it("team experience includes managers rating their own manager", () => {
    const rs = [
      respondent("m", { is_manager: true }, { AM_HUMANS_01: 5, MEXP_01: 2 }),
      respondent("e", { is_manager: false }, { MEXP_01: 4 }),
    ];
    const gap = computeGap(metric("gap_expectations"), def, rs, ALL, 1)!;
    expect(gap.teamScore).toBe(3);
    expect(gap.teamN).toBe(2);
  });

  it("agentic management dimensions are manager-only and have no aggregate score", () => {
    const rs = [
      respondent("m", { is_manager: true }, { AM_SELF_01: 5, AM_SELF_02: 5, AM_SELF_03: 5, AM_SELF_04: 5 }),
      respondent("e", { is_manager: false }, { AM_SELF_01: 1, AM_SELF_02: 1, AM_SELF_03: 1, AM_SELF_04: 1 }),
    ];
    const row = computeMetric(metric("agentic_manage_self"), def, rs, ALL, 1);
    expect(row.score).toBe(5);
    expect(row.n).toBe(1);
    expect(METRIC_DEFINITIONS.some((m) => m.id === "agentic_management")).toBe(false);
  });

  it("trust has a neutral direction and every metric item exists in the library", () => {
    expect(metric("stias_trust").neutralDirection).toBe(true);
    const ids = new Set(LIBRARY_SECTIONS.flatMap((s) => s.questions.map((q) => q.canonicalId)));
    for (const m of METRIC_DEFINITIONS) for (const id of m.itemCanonicalIds) expect(ids.has(id), `${m.id} → ${id}`).toBe(true);
  });

  it("never produces a delta for non-comparable metrics", () => {
    const rsT0 = [respondent("a", {}, { VERIFY_01: 3, VERIFY_02: 3, VERIFY_03: 3 })];
    const rsT1 = [respondent("b", {}, { VERIFY_01: 4, VERIFY_02: 4, VERIFY_03: 4 })];
    const t0 = computeWave(def, [metric("verification_behavior")], rsT0, { privacyThreshold: 1 });
    const t1 = computeWave(def, [metric("verification_behavior")], rsT1, { privacyThreshold: 1 });
    const comparable = compareWaves(t1, t0, new Set(["verification_behavior"]));
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
    const rs = Array.from({ length: 8 }, (_, i) => respondent(`r${i}`, {}, { ORG_ACCESS_01: 5, ORG_ACCESS_02: 2 }));
    const stats = computeItemStats(metric("enablement_access_resources"), def, rs, ALL, 7);
    expect(stats.map((s) => s.score)).toEqual([5, 2]);
    const small = computeItemStats(metric("enablement_access_resources"), def, rs.slice(0, 3), ALL, 7);
    expect(small.every((s) => s.suppressed)).toBe(true);
  });

  it("matrix distributions bucket by row and column", () => {
    const rs = [
      respondent("m1", { is_manager: true }, { DELEGATION_MAP: { DELEGATION_05: 0, DELEGATION_03: 2 } }),
      respondent("m2", { is_manager: true }, { DELEGATION_MAP: { DELEGATION_05: 1, DELEGATION_03: 2 } }),
    ];
    const dist = computeDistribution("DELEGATION_MAP", def, rs, ALL, 1)!;
    expect(dist.buckets["DELEGATION_05|human_led"]).toBe(50);
    expect(dist.buckets["DELEGATION_05|ai_assisted"]).toBe(50);
    expect(dist.buckets["DELEGATION_03|ai_delegated"]).toBe(100);
    expect(dist.n).toBe(2);
  });
});

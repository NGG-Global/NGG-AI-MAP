import { describe, expect, it } from "vitest";
import { nextProjectStep, type StepWave } from "@/domain/projects/nextStep";

const wave = (over: Partial<StepWave>): StepWave => ({ id: "w", code: "T0", type: "baseline", status: "draft", startAt: null, createdAt: new Date("2026-01-01"), ...over });

describe("project next step", () => {
  it("walks the baseline journey in order", () => {
    expect(nextProjectStep({ hasProject: false, hasQuestionnaire: false, waves: [] }).key).toBe("create_project");
    expect(nextProjectStep({ hasProject: true, hasQuestionnaire: false, waves: [] })).toMatchObject({ key: "build_questionnaire", path: "/assessment", position: 2 });
    expect(nextProjectStep({ hasProject: true, hasQuestionnaire: true, waves: [] })).toMatchObject({ key: "create_baseline_wave", path: "/waves/new?type=baseline", position: 3 });
    expect(nextProjectStep({ hasProject: true, hasQuestionnaire: true, waves: [wave({ id: "a" })] })).toMatchObject({ key: "publish_wave", path: "/waves/a" });
    expect(nextProjectStep({ hasProject: true, hasQuestionnaire: true, waves: [wave({ id: "a", status: "scheduled" })] }).key).toBe("wave_scheduled");
    expect(nextProjectStep({ hasProject: true, hasQuestionnaire: true, waves: [wave({ id: "a", status: "open" })] }).key).toBe("collect_responses");
    expect(nextProjectStep({ hasProject: true, hasQuestionnaire: true, waves: [wave({ id: "a", status: "closed" })] })).toMatchObject({ key: "review_results", path: "/results?wave=a", position: 6 });
  });

  it("acts on the open follow-up rather than the closed baseline", () => {
    const step = nextProjectStep({
      hasProject: true,
      hasQuestionnaire: true,
      waves: [wave({ id: "t1", code: "T1", type: "follow_up", status: "draft", createdAt: new Date("2026-06-01") }), wave({ id: "t0", status: "closed" })],
    });
    expect(step).toMatchObject({ key: "publish_wave", path: "/waves/t1" });
    expect(step.wave?.code).toBe("T1");
  });
});

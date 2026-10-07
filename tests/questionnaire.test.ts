import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { testDb, closeDb, seedWorld, ctxFor, type World } from "./helpers/db";
import { seedLibrary } from "@/server/seed/library";
import type { Db } from "@/server/db/connection";
import {
  addCustomQuestion,
  addSectionFromLibrary,
  createBaselineQuestionnaire,
  createCustomCopyOfQuestion,
  createNextVersion,
  getQuestionnaireState,
  lockVersion,
  removeQuestion,
  removeSection,
  updateQuestion,
} from "@/server/services/questionnaires";
import { LockedItemError, computeComparability, routeQuestionnaire, summarizeQuestionnaire, createCustomCopy } from "@/domain/questionnaire/logic";
import { BASELINE_TEMPLATE_SECTION_KEYS, METRIC_DEFINITIONS } from "@/domain/questionnaire/libraryContent";
import { ConflictError, ForbiddenError, ValidationError } from "@/server/shared/errors";

let db: Db;
let world: World;

beforeAll(async () => {
  db = await testDb();
  world = await seedWorld(db);
  await seedLibrary(db);
});
afterAll(async () => closeDb(db));

describe("questionnaire library and builder", () => {
  it("builds a baseline from the library and only NGG editors may create it", async () => {
    await expect(createBaselineQuestionnaire(ctxFor(db, world.clientAdminA), world.clientA.projectId)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(createBaselineQuestionnaire(ctxFor(db, world.analystA), world.clientA.projectId)).rejects.toBeInstanceOf(ForbiddenError);
    const state = await createBaselineQuestionnaire(ctxFor(db, world.pmA), world.clientA.projectId);
    expect(state.draft).not.toBeNull();
    const def = state.draft!.definition;
    expect(def.sections.map((s) => s.key)).toEqual(BASELINE_TEMPLATE_SECTION_KEYS);
    expect(def.copyVersion).toBe("questionnaire-copy-he-1.0");
    expect(def.title.he).toBe("איך AI משתלב בעבודה שלנו?");
    expect(def.startLabel?.he).toBe("מתחילים");
    // taxonomy-driven unit question is dropped when the client has no departments; role and tenure fall back to the copy lists
    const context = def.sections.find((s) => s.key === "SECTION_CONTEXT")!;
    expect(context.questions.some((q) => q.canonicalId === "CTX_01")).toBe(false);
    expect(context.questions.find((q) => q.canonicalId === "CTX_02")!.options!.length).toBe(9);
    // copy items do not offer "prefer not to answer"; scale items carry their N/A label instead
    const gail = def.sections.find((s) => s.key === "SECTION_GAIL_17")!;
    expect(gail.questions).toHaveLength(17);
    expect(gail.questions.every((q) => q.locked && q.type === "likert_7" && q.translationStatus === "ngg_hebrew_adaptation" && !q.allowPreferNotToAnswer)).toBe(true);
    expect(def.sections.find((s) => s.key === "SECTION_ORG_ENABLEMENT")!.questions[0]!.naOption?.he).toBe("לא יודע/ת");
    const summary = summarizeQuestionnaire(def);
    expect(summary.validatedItems).toBe(20); // GAIL 17 + S-TIAS 3
    expect(summary.managerQuestions).toBeGreaterThan(summary.employeeQuestions);
    expect(summary.estimatedMinutesEmployee).toBeGreaterThan(3);
  });

  it("validated items cannot be edited or removed; a custom copy is detached from the scale", async () => {
    const ctx = ctxFor(db, world.pmA);
    const state = (await getQuestionnaireState(ctx, world.clientA.projectId))!;
    const draft = state.draft!;
    const literacy = draft.definition.sections.find((s) => s.key === "SECTION_GAIL_17")!;
    const locked = literacy.questions[0]!;
    expect(locked.locked).toBe(true);
    await expect(updateQuestion(ctx, draft.id, locked.id, { text: { he: "שינוי", en: "change" } })).rejects.toBeInstanceOf(LockedItemError);
    await expect(removeQuestion(ctx, draft.id, locked.id)).rejects.toBeInstanceOf(LockedItemError);

    const updated = await createCustomCopyOfQuestion(ctx, draft.id, locked.id);
    const section = updated.definition.sections.find((s) => s.key === "SECTION_GAIL_17")!;
    const copy = section.questions[1]!;
    expect(copy.sourceType).toBe("client_custom");
    expect(copy.locked).toBe(false);
    expect(copy.metricId).toBeUndefined();
    expect(copy.canonicalId).not.toBe(locked.canonicalId);
    expect(copy.derivedFromCanonicalId).toBe(locked.canonicalId);
    // the original is untouched
    expect(section.questions[0]!.canonicalId).toBe(locked.canonicalId);
    expect(section.questions[0]!.locked).toBe(true);
  });

  it("research-safe mode protects validated sections from removal", async () => {
    const ctx = ctxFor(db, world.pmA);
    const draft = (await getQuestionnaireState(ctx, world.clientA.projectId))!.draft!;
    const literacy = draft.definition.sections.find((s) => s.key === "SECTION_GAIL_17")!;
    await expect(removeSection(ctx, draft.id, literacy.id)).rejects.toBeInstanceOf(ValidationError);
    // mandatory section (context drives routing)
    const contextSection = draft.definition.sections.find((s) => s.key === "SECTION_CONTEXT")!;
    await expect(removeSection(ctx, draft.id, contextSection.id)).rejects.toBeInstanceOf(ValidationError);
    const openText = draft.definition.sections.find((s) => s.key === "SECTION_OPEN_TEXT")!;
    const after = await removeSection(ctx, draft.id, openText.id);
    expect(after.definition.sections.some((s) => s.key === "SECTION_OPEN_TEXT")).toBe(false);
    const back = await addSectionFromLibrary(ctx, draft.id, "SECTION_OPEN_TEXT");
    expect(back.definition.sections.some((s) => s.key === "SECTION_OPEN_TEXT")).toBe(true);
  });

  it("custom questions never carry a metric and NGG wording changes detach the item", async () => {
    const ctx = ctxFor(db, world.pmA);
    const draft = (await getQuestionnaireState(ctx, world.clientA.projectId))!.draft!;
    const custom = draft.definition.sections.find((s) => s.key === "SECTION_CLIENT_CUSTOM") ?? (await addSectionFromLibrary(ctx, draft.id, "SECTION_CLIENT_CUSTOM")).definition.sections.find((s) => s.key === "SECTION_CLIENT_CUSTOM")!;
    const after = await addCustomQuestion(ctx, draft.id, custom.id, {
      type: "single_choice",
      text: { he: "שאלה מותאמת", en: "Custom question" },
      options: [
        { value: "a", label: { he: "א", en: "A" } },
        { value: "b", label: { he: "ב", en: "B" } },
      ],
      required: true,
    });
    const added = after.definition.sections.find((s) => s.key === "SECTION_CLIENT_CUSTOM")!.questions[0]!;
    expect(added.sourceType).toBe("client_custom");
    expect(added.metricId).toBeUndefined();
    expect(added.canonicalId.startsWith("custom:")).toBe(true);

    const agw = after.definition.sections.find((s) => s.key === "SECTION_AGENTIC_WORK")!;
    const item = agw.questions[0]!;
    const changed = await updateQuestion(ctx, draft.id, item.id, { text: { he: "ניסוח חדש", en: "New wording" } });
    const changedItem = changed.definition.sections.find((s) => s.key === "SECTION_AGENTIC_WORK")!.questions[0]!;
    expect(changedItem.sourceType).toBe("client_custom");
    expect(changedItem.metricId).toBeUndefined();
    expect(changedItem.derivedFromCanonicalId).toBe(item.canonicalId);
  });

  it("locked versions are immutable and the next version starts from them", async () => {
    const ctx = ctxFor(db, world.pmA);
    const draft = (await getQuestionnaireState(ctx, world.clientA.projectId))!.draft!;
    const locked = await lockVersion(ctx, draft.id);
    expect(locked.lockedAt).not.toBeNull();
    const custom = locked.definition.sections.find((s) => s.key === "SECTION_CLIENT_CUSTOM")!;
    await expect(addCustomQuestion(ctx, draft.id, custom.id, { type: "short_text", text: { he: "x" }, required: false })).rejects.toBeInstanceOf(ConflictError);
    const next = await createNextVersion(ctx, draft.id);
    expect(next.versionLabel).toBe("1.1");
    expect(next.versionNumber).toBe(2);
    expect(next.basedOnVersionId).toBe(draft.id);
    expect(next.lockedAt).toBeNull();
    await expect(createNextVersion(ctx, draft.id)).rejects.toBeInstanceOf(ConflictError);
    const state = (await getQuestionnaireState(ctx, world.clientA.projectId))!;
    expect(state.versions.length).toBe(2);
    expect(state.draft!.id).toBe(next.id);
    expect(state.latestLocked!.id).toBe(draft.id);
  });

  it("routes employees, managers and non-AI users differently", async () => {
    const ctx = ctxFor(db, world.pmA);
    const def = (await getQuestionnaireState(ctx, world.clientA.projectId))!.latestLocked!.definition;
    const manager = routeQuestionnaire(def, { attributes: { is_manager: true }, answers: { CTX_03: "yes", USE_01: "almost_daily", USE_02: ["chatgpt", "claude"], MEXP_SCREEN_01: "yes" } });
    const employee = routeQuestionnaire(def, { attributes: { is_manager: false }, answers: { CTX_03: "no", USE_01: "almost_daily", USE_02: ["chatgpt"], MEXP_SCREEN_01: "no" } });
    const nonUser = routeQuestionnaire(def, { attributes: { is_manager: false }, answers: { CTX_03: "no", USE_01: "none", MEXP_SCREEN_01: "yes" } });
    const keys = (r: ReturnType<typeof routeQuestionnaire>) => r.map((e) => e.section.key);
    const ids = (r: ReturnType<typeof routeQuestionnaire>) => r.flatMap((e) => e.questions.map((q) => q.canonicalId));
    // copy §16 routing
    expect(keys(manager)).toEqual(expect.arrayContaining(["SECTION_AGENTIC_MANAGEMENT", "SECTION_DELEGATION_MAP", "SECTION_MANAGER_EXPERIENCE"]));
    expect(keys(employee)).not.toContain("SECTION_AGENTIC_MANAGEMENT");
    expect(keys(employee)).not.toContain("SECTION_DELEGATION_MAP");
    expect(keys(nonUser)).toEqual(expect.arrayContaining(["SECTION_GAIL_17", "SECTION_ORG_ENABLEMENT", "SECTION_OUTCOMES_BARRIERS", "SECTION_OPEN_TEXT"]));
    for (const key of ["SECTION_AGENTIC_WORK", "SECTION_STIAS_3", "SECTION_VERIFICATION"]) expect(keys(nonUser)).not.toContain(key);
    // questions inside sections are routed too
    expect(ids(manager)).toContain("CTX_04");
    expect(ids(employee)).not.toContain("CTX_04");
    expect(ids(manager)).toContain("USE_03"); // more than one tool selected
    expect(ids(employee)).not.toContain("USE_03");
    expect(ids(employee)).toContain("MEXP_SCREEN_01");
    expect(ids(employee)).not.toContain("MEXP_01");
    expect(ids(manager)).toContain("MEXP_01");
    expect(ids(nonUser)).not.toContain("IMPACT_QUALITY_01");
    expect(ids(nonUser)).toContain("BARRIER_01");
  });

  it("comparability drops when baseline items are removed or reworded", async () => {
    const ctx = ctxFor(db, world.pmA);
    const state = (await getQuestionnaireState(ctx, world.clientA.projectId))!;
    const baseline = state.latestLocked!.definition;
    const draft = state.draft!;
    const same = computeComparability(baseline, draft.definition, METRIC_DEFINITIONS);
    expect(same.percent).toBe(100);
    expect(same.affectedMetricIds).toEqual([]);

    const verification = draft.definition.sections.find((s) => s.key === "SECTION_VERIFICATION")!;
    const removed = await removeSection(ctxFor(db, world.superAdmin), draft.id, verification.id).catch(() => null);
    // research-safe mode blocks removal of a longitudinal-core section present in the baseline
    expect(removed).toBeNull();

    // simulate the diff in memory (flexible mode)
    const altered = structuredClone(draft.definition);
    altered.sections = altered.sections.filter((s) => s.key !== "SECTION_VERIFICATION");
    const agw = altered.sections.find((s) => s.key === "SECTION_AGENTIC_WORK")!;
    // questions[0] was already detached earlier in this suite; rewording questions[1] (still an NGG item) breaks comparability
    agw.questions[1] = { ...createCustomCopy(agw.questions[1]!, "x1"), text: { he: "אחר" } };
    const changed = computeComparability(baseline, altered, METRIC_DEFINITIONS);
    expect(changed.percent).toBeLessThan(100);
    expect(changed.affectedMetricIds).toContain("verification_behavior");
    expect(changed.affectedMetricIds).toContain("agentic_work");
    // manager–team pairs live in other sections and stay fully comparable
    expect(changed.affectedMetricIds).not.toContain("gap_expectations");
    expect(changed.metrics.find((m) => m.metricId === "gap_expectations")!.level).toBe("full");
    expect(changed.metrics.find((m) => m.metricId === "verification_behavior")!.level).toBe("none");
    expect(changed.metrics.find((m) => m.metricId === "agentic_work")!.level).toBe("partial");
    expect(changed.diff.removed.length).toBe(4); // VERIFY_01–03 and the reworded AW item
  });
});

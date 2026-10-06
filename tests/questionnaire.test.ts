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
import { METRIC_DEFINITIONS } from "@/domain/questionnaire/libraryContent";
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
    expect(def.sections.length).toBeGreaterThan(10);
    const summary = summarizeQuestionnaire(def);
    expect(summary.validatedItems).toBe(14);
    expect(summary.managerQuestions).toBeGreaterThan(summary.employeeQuestions);
    expect(summary.estimatedMinutesEmployee).toBeGreaterThan(3);
  });

  it("validated items cannot be edited or removed; a custom copy is detached from the scale", async () => {
    const ctx = ctxFor(db, world.pmA);
    const state = (await getQuestionnaireState(ctx, world.clientA.projectId))!;
    const draft = state.draft!;
    const literacy = draft.definition.sections.find((s) => s.key === "gen_ai_literacy")!;
    const locked = literacy.questions[0]!;
    expect(locked.locked).toBe(true);
    await expect(updateQuestion(ctx, draft.id, locked.id, { text: { he: "שינוי", en: "change" } })).rejects.toBeInstanceOf(LockedItemError);
    await expect(removeQuestion(ctx, draft.id, locked.id)).rejects.toBeInstanceOf(LockedItemError);

    const updated = await createCustomCopyOfQuestion(ctx, draft.id, locked.id);
    const section = updated.definition.sections.find((s) => s.key === "gen_ai_literacy")!;
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
    const literacy = draft.definition.sections.find((s) => s.key === "gen_ai_literacy")!;
    await expect(removeSection(ctx, draft.id, literacy.id)).rejects.toBeInstanceOf(ValidationError);
    // mandatory section (role & seniority drives routing)
    const roleSection = draft.definition.sections.find((s) => s.key === "role_seniority")!;
    await expect(removeSection(ctx, draft.id, roleSection.id)).rejects.toBeInstanceOf(ValidationError);
    // taxonomy-driven section was dropped because the test client has no departments configured
    expect(draft.definition.sections.some((s) => s.key === "org_context")).toBe(false);
    const opportunities = draft.definition.sections.find((s) => s.key === "opportunities")!;
    const after = await removeSection(ctx, draft.id, opportunities.id);
    expect(after.definition.sections.some((s) => s.key === "opportunities")).toBe(false);
    const back = await addSectionFromLibrary(ctx, draft.id, "opportunities");
    expect(back.definition.sections.some((s) => s.key === "opportunities")).toBe(true);
  });

  it("custom questions never carry a metric and NGG wording changes detach the item", async () => {
    const ctx = ctxFor(db, world.pmA);
    const draft = (await getQuestionnaireState(ctx, world.clientA.projectId))!.draft!;
    const custom = draft.definition.sections.find((s) => s.key === "client_questions") ?? (await addSectionFromLibrary(ctx, draft.id, "client_questions")).definition.sections.find((s) => s.key === "client_questions")!;
    const after = await addCustomQuestion(ctx, draft.id, custom.id, {
      type: "single_choice",
      text: { he: "שאלה מותאמת", en: "Custom question" },
      options: [
        { value: "a", label: { he: "א", en: "A" } },
        { value: "b", label: { he: "ב", en: "B" } },
      ],
      required: true,
    });
    const added = after.definition.sections.find((s) => s.key === "client_questions")!.questions[0]!;
    expect(added.sourceType).toBe("client_custom");
    expect(added.metricId).toBeUndefined();
    expect(added.canonicalId.startsWith("custom:")).toBe(true);

    const agw = after.definition.sections.find((s) => s.key === "agentic_work")!;
    const item = agw.questions[0]!;
    const changed = await updateQuestion(ctx, draft.id, item.id, { text: { he: "ניסוח חדש", en: "New wording" } });
    const changedItem = changed.definition.sections.find((s) => s.key === "agentic_work")!.questions[0]!;
    expect(changedItem.sourceType).toBe("client_custom");
    expect(changedItem.metricId).toBeUndefined();
    expect(changedItem.derivedFromCanonicalId).toBe(item.canonicalId);
  });

  it("locked versions are immutable and the next version starts from them", async () => {
    const ctx = ctxFor(db, world.pmA);
    const draft = (await getQuestionnaireState(ctx, world.clientA.projectId))!.draft!;
    const locked = await lockVersion(ctx, draft.id);
    expect(locked.lockedAt).not.toBeNull();
    const custom = locked.definition.sections.find((s) => s.key === "client_questions")!;
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
    const manager = routeQuestionnaire(def, { attributes: { is_manager: true }, answers: { ctx_is_manager: "yes", ctx_ai_use_30d: "daily" } });
    const employee = routeQuestionnaire(def, { attributes: { is_manager: false }, answers: { ctx_is_manager: "no", ctx_ai_use_30d: "daily" } });
    const nonUser = routeQuestionnaire(def, { attributes: { is_manager: false }, answers: { ctx_is_manager: "no", ctx_ai_use_30d: "none" } });
    const keys = (r: ReturnType<typeof routeQuestionnaire>) => r.map((e) => e.section.key);
    expect(keys(manager)).toContain("agentic_management");
    expect(keys(manager)).not.toContain("manager_experience");
    expect(keys(employee)).toContain("manager_experience");
    expect(keys(employee)).not.toContain("agentic_management");
    expect(keys(nonUser)).not.toContain("agentic_work");
    expect(keys(nonUser)).not.toContain("trust_in_ai");
    expect(keys(nonUser)).toContain("org_enablement");
    // questions inside sections are routed too
    const roleSection = manager.find((e) => e.section.key === "role_seniority")!;
    expect(roleSection.questions.some((q) => q.canonicalId === "ctx_team_size")).toBe(true);
    const roleSectionEmp = employee.find((e) => e.section.key === "role_seniority")!;
    expect(roleSectionEmp.questions.some((q) => q.canonicalId === "ctx_team_size")).toBe(false);
  });

  it("comparability drops when baseline items are removed or reworded", async () => {
    const ctx = ctxFor(db, world.pmA);
    const state = (await getQuestionnaireState(ctx, world.clientA.projectId))!;
    const baseline = state.latestLocked!.definition;
    const draft = state.draft!;
    const same = computeComparability(baseline, draft.definition, METRIC_DEFINITIONS);
    expect(same.percent).toBe(100);
    expect(same.affectedMetricIds).toEqual([]);

    const verification = draft.definition.sections.find((s) => s.key === "verification")!;
    const removed = await removeSection(ctxFor(db, world.superAdmin), draft.id, verification.id).catch(() => null);
    // research-safe mode blocks removal of a longitudinal-core section present in the baseline
    expect(removed).toBeNull();

    // simulate the diff in memory (flexible mode)
    const altered = structuredClone(draft.definition);
    altered.sections = altered.sections.filter((s) => s.key !== "verification");
    const agw = altered.sections.find((s) => s.key === "agentic_work")!;
    // questions[0] was already detached earlier in this suite; rewording questions[1] (still an NGG item) breaks comparability
    agw.questions[1] = { ...createCustomCopy(agw.questions[1]!, "x1"), text: { he: "אחר" } };
    const changed = computeComparability(baseline, altered, METRIC_DEFINITIONS);
    expect(changed.percent).toBeLessThan(100);
    expect(changed.affectedMetricIds).toContain("verification");
    expect(changed.affectedMetricIds).toContain("agentic_work");
    // manager–team pairs live in other sections and stay fully comparable
    expect(changed.affectedMetricIds).not.toContain("gap_verification");
    expect(changed.metrics.find((m) => m.metricId === "gap_verification")!.level).toBe("full");
    expect(changed.metrics.find((m) => m.metricId === "verification")!.level).toBe("none");
    expect(changed.metrics.find((m) => m.metricId === "agentic_work")!.level).toBe("partial");
    expect(changed.diff.removed.length).toBe(5);
  });
});

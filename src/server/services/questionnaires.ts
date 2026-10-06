import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  questionnaireVersions,
  questionnaires,
  waves,
  type Questionnaire,
  type QuestionnaireVersion,
  type QuestionTemplate,
  type SegmentTaxonomy,
} from "@/server/db/schema";
import { newId } from "@/lib/ids";
import { ConflictError, NotFoundError, ValidationError } from "@/server/shared/errors";
import {
  displayRuleSchema,
  localizedTextSchema,
  parseDefinition,
  type QuestionDefinition,
  type QuestionnaireDefinition,
  type SectionDefinition,
} from "@/domain/questionnaire/definition";
import { assertEditable, createCustomCopy, LockedItemError, nextVersionLabel } from "@/domain/questionnaire/logic";
import { AUDIENCES, QUESTION_TYPES } from "@/domain/shared/enums";
import { BASELINE_TEMPLATE_SECTION_KEYS } from "@/domain/questionnaire/libraryContent";
import { LIKERT_5_LABELS, LIKERT_7_LABELS } from "@/domain/questionnaire/library";
import type { ServiceContext } from "./context";
import { requireProject } from "./access";
import { recordAudit } from "./audit";
import { loadLibrary, type LibrarySectionWithQuestions } from "./library";

/* ------------------------------------------------ definition building */

const TAXONOMY_LABELS: Record<NonNullable<QuestionTemplate["content"]["optionsFrom"]>, keyof SegmentTaxonomy> = {
  departments: "departments",
  roleFamilies: "roleFamilies",
  seniorityGroups: "seniorityGroups",
  locations: "locations",
};

/** Turns a library question into a definition question, materialising taxonomy options from the client. */
export function questionFromTemplate(template: QuestionTemplate, taxonomy: SegmentTaxonomy): QuestionDefinition {
  const content = template.content;
  let options = content.options;
  if (content.optionsFrom) {
    const values = taxonomy[TAXONOMY_LABELS[content.optionsFrom]] ?? [];
    options = values.map((value) => ({ value, label: { he: value, en: value } }));
  }
  return {
    id: newId(),
    canonicalId: template.canonicalId,
    version: template.version,
    type: template.type,
    sourceType: template.sourceType,
    locked: template.locked,
    text: content.text,
    helpText: content.helpText,
    options,
    scale: content.scale,
    matrixRows: content.matrixRows,
    matrixColumns: content.matrixColumns,
    required: template.required,
    allowPreferNotToAnswer: content.allowPreferNotToAnswer ?? true,
    audience: template.audience ?? undefined,
    reverseCoded: template.reverseCoded,
    metricId: template.metricId ?? undefined,
    displayRules: content.displayRules ?? [],
    wordingStatus: content.wordingStatus ?? "final",
    segmentKey: content.segmentKey,
    optionsFrom: content.optionsFrom,
  };
}

export function sectionFromTemplate(entry: LibrarySectionWithQuestions, taxonomy: SegmentTaxonomy): SectionDefinition {
  const { section, questions } = entry;
  return {
    id: newId(),
    key: section.key,
    templateVersion: section.version,
    title: section.name,
    description: section.description,
    sourceType: section.sourceType,
    researchStatus: section.researchStatus,
    audience: section.audience,
    recommendedCore: section.recommendedCore,
    longitudinalCore: section.longitudinalCore,
    required: true,
    allowPreferNotToAnswer: true,
    displayRules: section.displayRules,
    questions: questions
      .map((q) => questionFromTemplate(q, taxonomy))
      // Taxonomy-driven questions with no values are dropped (e.g. no locations configured).
      .filter((q) => !q.optionsFrom || (q.options && q.options.length > 0)),
  };
}

export function buildBaselineDefinition(library: LibrarySectionWithQuestions[], taxonomy: SegmentTaxonomy, title: string): QuestionnaireDefinition {
  const byKey = new Map(library.map((e) => [e.section.key, e]));
  const sections = BASELINE_TEMPLATE_SECTION_KEYS.map((key) => byKey.get(key))
    .filter((e): e is LibrarySectionWithQuestions => Boolean(e))
    .map((e) => sectionFromTemplate(e, taxonomy))
    .filter((s) => s.questions.length > 0);
  return {
    schemaVersion: 1,
    title: { he: title, en: title },
    intro: {
      he: "כמה דקות של כנות יעזרו לארגון להבין מה עובד, מה חסר ואיפה כדאי להשקיע.",
      en: "A few honest minutes will help the organization understand what works, what is missing and where to invest.",
    },
    privacyNote: {
      he: "התשובות לא ישמשו להערכת ביצועים. ההנהלה רואה רק נתונים מצרפיים של קבוצות גדולות מספיק.",
      en: "Answers are never used for performance evaluation. Leadership sees only aggregate data for sufficiently large groups.",
    },
    sections,
  };
}

/* ------------------------------------------------------------ queries */

export interface QuestionnaireState {
  questionnaire: Questionnaire;
  versions: QuestionnaireVersion[];
  /** The editable draft (latest unlocked version) if any. */
  draft: QuestionnaireVersion | null;
  /** The latest locked version (used by a published wave). */
  latestLocked: QuestionnaireVersion | null;
}

export async function getQuestionnaireState(ctx: ServiceContext, projectId: string): Promise<QuestionnaireState | null> {
  await requireProject(ctx, projectId, "project.view");
  const [questionnaire] = await ctx.db.select().from(questionnaires).where(eq(questionnaires.projectId, projectId)).limit(1);
  if (!questionnaire) return null;
  const versions = await ctx.db
    .select()
    .from(questionnaireVersions)
    .where(eq(questionnaireVersions.questionnaireId, questionnaire.id))
    .orderBy(desc(questionnaireVersions.versionNumber));
  return {
    questionnaire,
    versions,
    draft: versions.find((v) => !v.lockedAt) ?? null,
    latestLocked: versions.find((v) => Boolean(v.lockedAt)) ?? null,
  };
}

export async function getVersion(ctx: ServiceContext, versionId: string): Promise<{ version: QuestionnaireVersion; questionnaire: Questionnaire; projectId: string }> {
  const rows = await ctx.db
    .select({ version: questionnaireVersions, questionnaire: questionnaires })
    .from(questionnaireVersions)
    .innerJoin(questionnaires, eq(questionnaires.id, questionnaireVersions.questionnaireId))
    .where(eq(questionnaireVersions.id, versionId))
    .limit(1);
  const row = rows[0];
  if (!row) throw new NotFoundError("version");
  await requireProject(ctx, row.questionnaire.projectId, "project.view");
  return { ...row, projectId: row.questionnaire.projectId };
}

/* ------------------------------------------------------------ creation */

/** Creates the project questionnaire with a 1.0 draft built from the baseline template. */
export async function createBaselineQuestionnaire(ctx: ServiceContext, projectId: string, name?: string): Promise<QuestionnaireState> {
  const { project, client } = await requireProject(ctx, projectId, "questionnaire.edit");
  const existing = await getQuestionnaireState(ctx, projectId);
  if (existing) throw new ConflictError("questionnaire_exists");
  const library = await loadLibrary(ctx.db);
  const title = name?.trim() || `${project.name} — Baseline`;
  const definition = buildBaselineDefinition(library, client.segmentTaxonomy, title);
  const questionnaireId = newId();
  await ctx.db.insert(questionnaires).values({ id: questionnaireId, projectId, name: title });
  await ctx.db.insert(questionnaireVersions).values({
    id: newId(),
    questionnaireId,
    versionLabel: "1.0",
    versionNumber: 1,
    status: "draft",
    definition,
    createdByUserId: ctx.actor.userId,
  });
  await recordAudit(ctx, { action: "questionnaire.created", entityType: "questionnaire", entityId: questionnaireId, clientId: client.id, projectId });
  return (await getQuestionnaireState(ctx, projectId))!;
}

/** Creates the next draft version from any existing version (used after a wave locks the previous one). */
export async function createNextVersion(ctx: ServiceContext, fromVersionId: string, kind: "minor" | "major" = "minor"): Promise<QuestionnaireVersion> {
  const { version, questionnaire, projectId } = await getVersion(ctx, fromVersionId);
  const { client } = await requireProject(ctx, projectId, "questionnaire.edit");
  const [latest] = await ctx.db
    .select()
    .from(questionnaireVersions)
    .where(eq(questionnaireVersions.questionnaireId, questionnaire.id))
    .orderBy(desc(questionnaireVersions.versionNumber))
    .limit(1);
  if (latest && !latest.lockedAt) throw new ConflictError("draft_exists");
  const [created] = await ctx.db
    .insert(questionnaireVersions)
    .values({
      id: newId(),
      questionnaireId: questionnaire.id,
      versionLabel: nextVersionLabel(latest?.versionLabel ?? version.versionLabel, kind),
      versionNumber: (latest?.versionNumber ?? version.versionNumber) + 1,
      status: "draft",
      definition: structuredClone(version.definition),
      basedOnVersionId: version.id,
      createdByUserId: ctx.actor.userId,
    })
    .returning();
  await recordAudit(ctx, { action: "questionnaire.version_created", entityType: "questionnaire_version", entityId: created!.id, clientId: client.id, projectId, metadata: { from: version.versionLabel, to: created!.versionLabel } });
  return created!;
}

/** Locks a version. Called when a wave is published; afterwards the definition is immutable. */
export async function lockVersion(ctx: ServiceContext, versionId: string): Promise<QuestionnaireVersion> {
  const { version, projectId } = await getVersion(ctx, versionId);
  await requireProject(ctx, projectId, "wave.manage");
  if (version.lockedAt) return version;
  const [updated] = await ctx.db
    .update(questionnaireVersions)
    .set({ lockedAt: new Date(), status: "published", updatedAt: new Date() })
    .where(eq(questionnaireVersions.id, versionId))
    .returning();
  return updated!;
}

/* ------------------------------------------------------- draft editing */

async function loadDraftForEdit(ctx: ServiceContext, versionId: string) {
  const { version, projectId } = await getVersion(ctx, versionId);
  const { client, project } = await requireProject(ctx, projectId, "questionnaire.edit");
  if (version.lockedAt) throw new ConflictError("version_locked");
  return { version, projectId, client, project, definition: structuredClone(version.definition) };
}

async function saveDraft(ctx: ServiceContext, versionId: string, definition: QuestionnaireDefinition, audit: { action: string; projectId: string; clientId: string; metadata?: Record<string, unknown> }) {
  const parsed = parseDefinition(definition);
  const [updated] = await ctx.db
    .update(questionnaireVersions)
    .set({ definition: parsed, updatedAt: new Date() })
    .where(and(eq(questionnaireVersions.id, versionId)))
    .returning();
  await recordAudit(ctx, { action: audit.action, entityType: "questionnaire_version", entityId: versionId, clientId: audit.clientId, projectId: audit.projectId, metadata: audit.metadata });
  return updated!;
}

export async function addSectionFromLibrary(ctx: ServiceContext, versionId: string, sectionKey: string, position?: number) {
  const d = await loadDraftForEdit(ctx, versionId);
  if (d.definition.sections.some((s) => s.key === sectionKey)) throw new ConflictError("section_exists");
  const library = await loadLibrary(ctx.db);
  const entry = library.find((e) => e.section.key === sectionKey);
  if (!entry) throw new NotFoundError("section_template");
  const section = sectionFromTemplate(entry, d.client.segmentTaxonomy);
  const index = position == null ? d.definition.sections.length : Math.max(0, Math.min(position, d.definition.sections.length));
  d.definition.sections.splice(index, 0, section);
  return saveDraft(ctx, versionId, d.definition, { action: "questionnaire.section_added", projectId: d.projectId, clientId: d.client.id, metadata: { sectionKey } });
}

export async function addCustomSection(ctx: ServiceContext, versionId: string, title: { he: string; en?: string }) {
  const d = await loadDraftForEdit(ctx, versionId);
  const id = newId();
  d.definition.sections.push({
    id,
    key: `custom:${id}`,
    title,
    description: { he: "", en: "" },
    sourceType: "client_custom",
    researchStatus: "custom",
    audience: "all",
    recommendedCore: false,
    longitudinalCore: false,
    required: true,
    allowPreferNotToAnswer: true,
    displayRules: [],
    questions: [],
  });
  return saveDraft(ctx, versionId, d.definition, { action: "questionnaire.custom_section_added", projectId: d.projectId, clientId: d.client.id });
}

/**
 * Removing a section. In research-safe mode, validated sections and longitudinal-core sections that
 * were part of a locked (baseline) version cannot be removed (spec §12). Mandatory sections never can.
 */
export async function removeSection(ctx: ServiceContext, versionId: string, sectionId: string) {
  const d = await loadDraftForEdit(ctx, versionId);
  const section = d.definition.sections.find((s) => s.id === sectionId);
  if (!section) throw new NotFoundError("section");
  const library = await loadLibrary(ctx.db);
  const template = library.find((e) => e.section.key === section.key)?.section;
  if (template?.mandatory) throw new ValidationError("section_mandatory");
  if (d.project.researchMode === "research_safe") {
    const protectedSection = section.sourceType === "validated" || (section.longitudinalCore && (await wasInLockedVersion(ctx, d.version.questionnaireId, section.key)));
    if (protectedSection) throw new ValidationError("section_protected");
  }
  d.definition.sections = d.definition.sections.filter((s) => s.id !== sectionId);
  return saveDraft(ctx, versionId, d.definition, { action: "questionnaire.section_removed", projectId: d.projectId, clientId: d.client.id, metadata: { sectionKey: section.key, validated: section.sourceType === "validated" } });
}

async function wasInLockedVersion(ctx: ServiceContext, questionnaireId: string, sectionKey: string): Promise<boolean> {
  const locked = await ctx.db
    .select({ definition: questionnaireVersions.definition })
    .from(questionnaireVersions)
    .where(eq(questionnaireVersions.questionnaireId, questionnaireId))
    .orderBy(asc(questionnaireVersions.versionNumber));
  return locked.some((v) => v.definition.sections.some((s) => s.key === sectionKey));
}

export async function reorderSections(ctx: ServiceContext, versionId: string, orderedSectionIds: string[]) {
  const d = await loadDraftForEdit(ctx, versionId);
  const byId = new Map(d.definition.sections.map((s) => [s.id, s]));
  if (orderedSectionIds.length !== byId.size || orderedSectionIds.some((id) => !byId.has(id))) throw new ValidationError("order");
  d.definition.sections = orderedSectionIds.map((id) => byId.get(id)!);
  return saveDraft(ctx, versionId, d.definition, { action: "questionnaire.sections_reordered", projectId: d.projectId, clientId: d.client.id });
}

export async function moveSection(ctx: ServiceContext, versionId: string, sectionId: string, direction: "up" | "down") {
  const d = await loadDraftForEdit(ctx, versionId);
  const index = d.definition.sections.findIndex((s) => s.id === sectionId);
  if (index < 0) throw new NotFoundError("section");
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= d.definition.sections.length) return d.version;
  const sections = d.definition.sections;
  [sections[index], sections[target]] = [sections[target]!, sections[index]!];
  return saveDraft(ctx, versionId, d.definition, { action: "questionnaire.sections_reordered", projectId: d.projectId, clientId: d.client.id });
}

export const sectionConfigSchema = z.object({
  displayTitle: localizedTextSchema.optional(),
  clientNote: localizedTextSchema.optional(),
  audience: z.enum(AUDIENCES),
  required: z.boolean(),
  allowPreferNotToAnswer: z.boolean(),
  displayRules: z.array(displayRuleSchema),
});

export async function updateSectionConfig(ctx: ServiceContext, versionId: string, sectionId: string, input: z.infer<typeof sectionConfigSchema>) {
  const d = await loadDraftForEdit(ctx, versionId);
  const section = d.definition.sections.find((s) => s.id === sectionId);
  if (!section) throw new NotFoundError("section");
  const parsed = sectionConfigSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("section_config", parsed.error.issues.map((i) => i.path.join(".")));
  section.displayTitle = parsed.data.displayTitle?.he ? parsed.data.displayTitle : undefined;
  section.clientNote = parsed.data.clientNote?.he ? parsed.data.clientNote : undefined;
  section.audience = parsed.data.audience;
  section.required = parsed.data.required;
  section.allowPreferNotToAnswer = parsed.data.allowPreferNotToAnswer;
  section.displayRules = parsed.data.displayRules;
  return saveDraft(ctx, versionId, d.definition, { action: "questionnaire.section_configured", projectId: d.projectId, clientId: d.client.id, metadata: { sectionKey: section.key } });
}

export const customQuestionSchema = z.object({
  type: z.enum(QUESTION_TYPES),
  text: localizedTextSchema,
  helpText: localizedTextSchema.optional(),
  options: z.array(z.object({ value: z.string().min(1), label: localizedTextSchema })).optional(),
  required: z.boolean().default(true),
  audience: z.enum(AUDIENCES).optional(),
});

function scaleForType(type: QuestionDefinition["type"]) {
  if (type === "likert_5") return { min: 1, max: 5, labels: LIKERT_5_LABELS };
  if (type === "likert_7") return { min: 1, max: 7, labels: LIKERT_7_LABELS };
  return undefined;
}

/** Adds a client-custom question. Custom questions never carry a metric link (spec §3.1 C). */
export async function addCustomQuestion(ctx: ServiceContext, versionId: string, sectionId: string, input: z.infer<typeof customQuestionSchema>) {
  const d = await loadDraftForEdit(ctx, versionId);
  const section = d.definition.sections.find((s) => s.id === sectionId);
  if (!section) throw new NotFoundError("section");
  const parsed = customQuestionSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("question", parsed.error.issues.map((i) => i.path.join(".")));
  if ((parsed.data.type === "single_choice" || parsed.data.type === "multi_select") && !(parsed.data.options && parsed.data.options.length >= 2)) {
    throw new ValidationError("options");
  }
  const id = newId();
  section.questions.push({
    id,
    canonicalId: `custom:${id}`,
    version: "1.0",
    type: parsed.data.type,
    sourceType: "client_custom",
    locked: false,
    text: parsed.data.text,
    helpText: parsed.data.helpText?.he ? parsed.data.helpText : undefined,
    options: parsed.data.options,
    scale: scaleForType(parsed.data.type),
    required: parsed.data.required,
    allowPreferNotToAnswer: true,
    audience: parsed.data.audience,
    reverseCoded: false,
    displayRules: [],
    wordingStatus: "final",
  });
  return saveDraft(ctx, versionId, d.definition, { action: "questionnaire.custom_question_added", projectId: d.projectId, clientId: d.client.id, metadata: { sectionKey: section.key } });
}

/** Edits a non-locked question. Editing a locked (validated) item throws `LockedItemError`. */
export async function updateQuestion(ctx: ServiceContext, versionId: string, questionId: string, input: Partial<z.infer<typeof customQuestionSchema>>) {
  const d = await loadDraftForEdit(ctx, versionId);
  for (const section of d.definition.sections) {
    const question = section.questions.find((q) => q.id === questionId);
    if (!question) continue;
    assertEditable(question);
    if (input.text) question.text = input.text;
    if (input.helpText !== undefined) question.helpText = input.helpText?.he ? input.helpText : undefined;
    if (input.required !== undefined) question.required = input.required;
    if (input.audience !== undefined) question.audience = input.audience;
    if (input.options) question.options = input.options;
    // Changing the wording of an NGG measure detaches it from the metric and marks it custom (spec §3.1 B).
    if (input.text && question.sourceType === "ngg_measure") {
      const copy = createCustomCopy(question, question.id);
      Object.assign(question, copy, { text: input.text });
    }
    return saveDraft(ctx, versionId, d.definition, { action: "questionnaire.question_updated", projectId: d.projectId, clientId: d.client.id, metadata: { canonicalId: question.canonicalId } });
  }
  throw new NotFoundError("question");
}

/** Creates a custom copy of any question (typically a locked one), appended right after the original. */
export async function createCustomCopyOfQuestion(ctx: ServiceContext, versionId: string, questionId: string) {
  const d = await loadDraftForEdit(ctx, versionId);
  for (const section of d.definition.sections) {
    const index = section.questions.findIndex((q) => q.id === questionId);
    if (index < 0) continue;
    const original = section.questions[index]!;
    const copy = createCustomCopy(original, newId());
    section.questions.splice(index + 1, 0, copy);
    return saveDraft(ctx, versionId, d.definition, { action: "questionnaire.custom_copy_created", projectId: d.projectId, clientId: d.client.id, metadata: { from: original.canonicalId, to: copy.canonicalId } });
  }
  throw new NotFoundError("question");
}

export async function removeQuestion(ctx: ServiceContext, versionId: string, questionId: string) {
  const d = await loadDraftForEdit(ctx, versionId);
  for (const section of d.definition.sections) {
    const question = section.questions.find((q) => q.id === questionId);
    if (!question) continue;
    // Validated items cannot be removed individually; disable the whole module instead (spec §11).
    if (question.locked) throw new LockedItemError(question.canonicalId);
    section.questions = section.questions.filter((q) => q.id !== questionId);
    return saveDraft(ctx, versionId, d.definition, { action: "questionnaire.question_removed", projectId: d.projectId, clientId: d.client.id, metadata: { canonicalId: question.canonicalId } });
  }
  throw new NotFoundError("question");
}

export async function updateIntro(ctx: ServiceContext, versionId: string, input: { title: { he: string; en?: string }; intro?: { he: string; en?: string }; privacyNote?: { he: string; en?: string } }) {
  const d = await loadDraftForEdit(ctx, versionId);
  d.definition.title = input.title;
  if (input.intro) d.definition.intro = input.intro;
  if (input.privacyNote) d.definition.privacyNote = input.privacyNote;
  return saveDraft(ctx, versionId, d.definition, { action: "questionnaire.intro_updated", projectId: d.projectId, clientId: d.client.id });
}

/** The locked version used by the project's baseline wave, for comparability warnings in the builder. */
export async function getBaselineDefinition(ctx: ServiceContext, projectId: string): Promise<{ definition: QuestionnaireDefinition; waveCode: string } | null> {
  await requireProject(ctx, projectId, "project.view");
  const rows = await ctx.db
    .select({ wave: waves, version: questionnaireVersions })
    .from(waves)
    .innerJoin(questionnaireVersions, eq(questionnaireVersions.id, waves.questionnaireVersionId))
    .where(and(eq(waves.projectId, projectId), eq(waves.type, "baseline")))
    .limit(1);
  const row = rows[0];
  if (!row || !row.version.lockedAt) return null;
  return { definition: row.version.definition, waveCode: row.wave.code };
}

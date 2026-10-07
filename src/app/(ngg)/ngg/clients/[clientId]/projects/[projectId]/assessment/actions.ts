"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireNggContext } from "@/server/auth/current";
import {
  addCustomQuestion,
  addCustomSection,
  addSectionFromLibrary,
  createBaselineQuestionnaire,
  createCustomCopyOfQuestion,
  createNextVersion,
  moveSection,
  removeQuestion,
  removeSection,
  updateIntro,
  updateQuestion,
  updateSectionConfig,
} from "@/server/services/questionnaires";
import { displayRuleSchema } from "@/domain/questionnaire/definition";
import { LockedItemError } from "@/domain/questionnaire/logic";
import { AUDIENCES, CUSTOM_QUESTION_TYPES } from "@/domain/shared/enums";
import { field, runAction, type ActionState } from "@/server/ui/actions";
import { z } from "zod";

function basePath(formData: FormData): string {
  return `/ngg/clients/${field(formData, "clientId")}/projects/${field(formData, "projectId")}/assessment`;
}

async function refresh(formData: FormData, extra?: string): Promise<void> {
  const path = basePath(formData);
  revalidatePath(path);
  if (extra) redirect(`${path}${extra}`);
}

export async function createBaselineAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireNggContext();
    await createBaselineQuestionnaire(ctx, field(formData, "projectId"), field(formData, "name"));
    await refresh(formData, "");
    return { ok: true };
  });
}

export async function createNextVersionAction(formData: FormData): Promise<void> {
  const ctx = await requireNggContext();
  const next = await createNextVersion(ctx, field(formData, "versionId"));
  await refresh(formData, `?version=${next.id}`);
}

export async function addSectionAction(formData: FormData): Promise<void> {
  const ctx = await requireNggContext();
  await addSectionFromLibrary(ctx, field(formData, "versionId"), field(formData, "sectionKey"));
  await refresh(formData);
}

export async function addCustomSectionAction(formData: FormData): Promise<void> {
  const ctx = await requireNggContext();
  const title = field(formData, "title") || (ctx.user.locale === "he" ? "שאלות לקוח" : "Client questions");
  await addCustomSection(ctx, field(formData, "versionId"), { he: title, en: title });
  await refresh(formData);
}

export async function removeSectionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireNggContext();
    await removeSection(ctx, field(formData, "versionId"), field(formData, "sectionId"));
    await refresh(formData);
    return { ok: true };
  });
}

export async function moveSectionAction(formData: FormData): Promise<void> {
  const ctx = await requireNggContext();
  await moveSection(ctx, field(formData, "versionId"), field(formData, "sectionId"), field(formData, "direction") === "up" ? "up" : "down");
  await refresh(formData);
}

export async function updateSectionConfigAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireNggContext();
    const rulesRaw = field(formData, "rules");
    const rules = rulesRaw ? z.array(displayRuleSchema).parse(JSON.parse(rulesRaw)) : [];
    const audience = field(formData, "audience");
    const displayTitle = field(formData, "displayTitle");
    const clientNote = field(formData, "clientNote");
    await updateSectionConfig(ctx, field(formData, "versionId"), field(formData, "sectionId"), {
      displayTitle: displayTitle ? { he: displayTitle, en: field(formData, "displayTitleEn") || undefined } : undefined,
      clientNote: clientNote ? { he: clientNote, en: field(formData, "clientNoteEn") || undefined } : undefined,
      audience: AUDIENCES.find((a) => a === audience) ?? "all",
      required: formData.get("required") === "on",
      allowPreferNotToAnswer: formData.get("allowPnta") === "on",
      displayRules: rules,
    });
    revalidatePath(basePath(formData));
    return { ok: true, message: ctx.user.locale === "he" ? "נשמר" : "Saved" };
  });
}

function parseOptions(raw: string) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((label, index) => ({ value: `opt_${index + 1}_${label.slice(0, 12).replace(/\s+/g, "_")}`, label: { he: label, en: label } }));
}

export async function addCustomQuestionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireNggContext();
    const type = field(formData, "type");
    const audience = field(formData, "audience");
    await addCustomQuestion(ctx, field(formData, "versionId"), field(formData, "sectionId"), {
      type: CUSTOM_QUESTION_TYPES.find((t) => t === type) ?? "likert_5",
      text: { he: field(formData, "text"), en: field(formData, "textEn") || undefined },
      helpText: field(formData, "helpText") ? { he: field(formData, "helpText") } : undefined,
      options: parseOptions(field(formData, "options")),
      required: formData.get("required") === "on",
      audience: AUDIENCES.find((a) => a === audience && a !== "all"),
    });
    revalidatePath(basePath(formData));
    return { ok: true };
  });
}

export async function updateQuestionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireNggContext();
    try {
      await updateQuestion(ctx, field(formData, "versionId"), field(formData, "questionId"), {
        text: { he: field(formData, "text"), en: field(formData, "textEn") || undefined },
        helpText: field(formData, "helpText") ? { he: field(formData, "helpText") } : undefined,
        required: formData.get("required") === "on",
        options: field(formData, "options") ? parseOptions(field(formData, "options")) : undefined,
      });
    } catch (error) {
      if (error instanceof LockedItemError) return { ok: false, error: "locked_item" };
      throw error;
    }
    revalidatePath(basePath(formData));
    return { ok: true, message: ctx.user.locale === "he" ? "נשמר" : "Saved" };
  });
}

export async function removeQuestionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireNggContext();
    try {
      await removeQuestion(ctx, field(formData, "versionId"), field(formData, "questionId"));
    } catch (error) {
      if (error instanceof LockedItemError) return { ok: false, error: "locked_item" };
      throw error;
    }
    revalidatePath(basePath(formData));
    return { ok: true };
  });
}

export async function createCustomCopyAction(formData: FormData): Promise<void> {
  const ctx = await requireNggContext();
  await createCustomCopyOfQuestion(ctx, field(formData, "versionId"), field(formData, "questionId"));
  await refresh(formData);
}

export async function updateIntroAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireNggContext();
    await updateIntro(ctx, field(formData, "versionId"), {
      title: { he: field(formData, "title"), en: field(formData, "titleEn") || undefined },
      intro: { he: field(formData, "intro"), en: field(formData, "introEn") || undefined },
      completionNote: { he: field(formData, "completionNote"), en: field(formData, "completionNoteEn") || undefined },
    });
    revalidatePath(basePath(formData));
    return { ok: true, message: ctx.user.locale === "he" ? "נשמר" : "Saved" };
  });
}

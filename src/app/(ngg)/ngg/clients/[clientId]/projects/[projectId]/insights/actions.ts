"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireNggContext } from "@/server/auth/current";
import { generateInsight, reviewInsight, updateInsightPayload } from "@/server/services/insights";
import { adoptGoalSuggestions } from "@/server/services/goals";
import { INSIGHT_TYPES } from "@/domain/shared/enums";
import { field, runAction, type ActionState } from "@/server/ui/actions";

function base(formData: FormData): string {
  return `/ngg/clients/${field(formData, "clientId")}/projects/${field(formData, "projectId")}/insights`;
}

export async function generateInsightAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireNggContext();
    const type = INSIGHT_TYPES.find((x) => x === field(formData, "type")) ?? "executive_summary";
    const insight = await generateInsight(ctx, field(formData, "waveId"), type, { metricId: field(formData, "metricId") || undefined });
    redirect(`${base(formData)}/${insight.id}`);
  });
}

export async function reviewInsightAction(formData: FormData): Promise<void> {
  const ctx = await requireNggContext();
  const decision = field(formData, "decision");
  await reviewInsight(ctx, field(formData, "insightId"), decision === "published" ? "published" : decision === "rejected" ? "rejected" : "reviewed", field(formData, "note") || undefined);
  revalidatePath(`${base(formData)}/${field(formData, "insightId")}`);
  revalidatePath("/ngg/insights");
}

export async function editInsightAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireNggContext();
    const current = JSON.parse(field(formData, "payload")) as Record<string, unknown>;
    for (const key of ["summary", "currentState", "biggestChange", "primaryRisk", "recommendedPriority", "whatChanged"]) {
      const value = formData.get(`f.${key}`);
      if (typeof value === "string" && value.trim()) current[key] = value.trim();
    }
    await updateInsightPayload(ctx, field(formData, "insightId"), current);
    revalidatePath(`${base(formData)}/${field(formData, "insightId")}`);
    return { ok: true, message: ctx.user.locale === "he" ? "נשמר" : "Saved" };
  });
}

export async function adoptGoalsAction(formData: FormData): Promise<void> {
  const ctx = await requireNggContext();
  await adoptGoalSuggestions(ctx, field(formData, "insightId"));
  redirect(`/ngg/clients/${field(formData, "clientId")}/projects/${field(formData, "projectId")}/goals`);
}

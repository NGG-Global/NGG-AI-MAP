"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireNggContext } from "@/server/auth/current";
import { closeWave, createRespondentTokens, createWave, deleteDraftWave, publishWave, updateWave, surveyUrl } from "@/server/services/waves";
import { AUDIENCE_SCOPES, DISTRIBUTION_MODES, PRIVACY_MODES } from "@/domain/shared/enums";
import { commaList, field, fieldList, runAction, type ActionState } from "@/server/ui/actions";

function base(formData: FormData): string {
  return `/ngg/clients/${field(formData, "clientId")}/projects/${field(formData, "projectId")}/waves`;
}

function parseCommon(formData: FormData) {
  const scope = field(formData, "audienceScope");
  const dist = field(formData, "distributionMode");
  const privacy = field(formData, "privacyMode");
  return {
    name: field(formData, "name"),
    startAt: field(formData, "startAt") ? new Date(field(formData, "startAt")) : undefined,
    endAt: field(formData, "endAt") ? new Date(field(formData, "endAt")) : undefined,
    audienceScope: AUDIENCE_SCOPES.find((s) => s === scope) ?? "all_organization",
    audienceUnits: fieldList(formData, "audienceUnits"),
    audienceNote: field(formData, "audienceNote") || undefined,
    distributionMode: DISTRIBUTION_MODES.find((d) => d === dist) ?? "public_link",
    privacyMode: PRIVACY_MODES.find((p) => p === privacy) ?? "anonymous",
    locale: field(formData, "locale") === "en" ? ("en" as const) : ("he" as const),
    invitedCount: Number(field(formData, "invitedCount") || 0),
  };
}

export async function createWaveAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireNggContext();
    const wave = await createWave(ctx, field(formData, "projectId"), {
      ...parseCommon(formData),
      type: field(formData, "type") === "baseline" ? "baseline" : "follow_up",
      questionnaireSource: field(formData, "questionnaireSource") || "draft",
    });
    redirect(`${base(formData)}/${wave.id}`);
  });
}

export async function updateWaveAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireNggContext();
    await updateWave(ctx, field(formData, "waveId"), parseCommon(formData));
    revalidatePath(`${base(formData)}/${field(formData, "waveId")}`);
    return { ok: true, message: ctx.user.locale === "he" ? "הגל נשמר" : "Wave saved" };
  });
}

export async function publishWaveAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireNggContext();
    await publishWave(ctx, field(formData, "waveId"));
    revalidatePath(`${base(formData)}/${field(formData, "waveId")}`);
    return { ok: true };
  });
}

export async function closeWaveAction(formData: FormData): Promise<void> {
  const ctx = await requireNggContext();
  await closeWave(ctx, field(formData, "waveId"));
  revalidatePath(`${base(formData)}/${field(formData, "waveId")}`);
}

export async function deleteWaveAction(formData: FormData): Promise<void> {
  const ctx = await requireNggContext();
  await deleteDraftWave(ctx, field(formData, "waveId"));
  redirect(base(formData));
}

export async function generateTokensAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireNggContext();
    const emails = commaList(formData, "emails");
    const tokens = await createRespondentTokens(ctx, field(formData, "waveId"), { count: Number(field(formData, "count") || 0), emails });
    const csv = ["link,email", ...tokens.map((t) => `${surveyUrl(t.token)},${t.email ?? ""}`)].join("\n");
    revalidatePath(`${base(formData)}/${field(formData, "waveId")}`);
    return { ok: true, data: { csv, count: String(tokens.length) } };
  });
}

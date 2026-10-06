"use server";

import { revalidatePath } from "next/cache";
import { requireNggContext } from "@/server/auth/current";
import { approveGoal, createGoal, publishGoalToClient, setGoalStatus, toggleGoalAction, updateGoal } from "@/server/services/goals";
import { GOAL_SCOPES, GOAL_STATUSES, TARGET_DIRECTIONS } from "@/domain/shared/enums";
import { commaList, field, fieldList, runAction, type ActionState } from "@/server/ui/actions";

function base(formData: FormData): string {
  return `/ngg/clients/${field(formData, "clientId")}/projects/${field(formData, "projectId")}/goals`;
}

function parseGoal(formData: FormData) {
  const scope = field(formData, "scope");
  const direction = field(formData, "targetDirection");
  return {
    title: field(formData, "title"),
    description: field(formData, "description"),
    ownerName: field(formData, "ownerName"),
    scope: GOAL_SCOPES.find((s) => s === scope) ?? "organization",
    relatedMetricIds: fieldList(formData, "relatedMetricIds"),
    targetDirection: TARGET_DIRECTIONS.find((d) => d === direction) ?? "increase",
    targetValue: field(formData, "targetValue") ? Number(field(formData, "targetValue")) : undefined,
    actions: commaList(formData, "actions"),
    successEvidence: commaList(formData, "successEvidence"),
    dueDate: field(formData, "dueDate") ? new Date(field(formData, "dueDate")) : undefined,
    notes: field(formData, "notes"),
  };
}

export async function saveGoalAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireNggContext();
    const goalId = field(formData, "goalId");
    if (goalId) await updateGoal(ctx, goalId, parseGoal(formData));
    else await createGoal(ctx, field(formData, "projectId"), parseGoal(formData));
    revalidatePath(base(formData));
    return { ok: true, message: goalId ? (ctx.user.locale === "he" ? "נשמר" : "Saved") : ctx.user.locale === "he" ? "היעד נוצר כטיוטה" : "Goal created as a draft" };
  });
}

export async function goalDecisionAction(formData: FormData): Promise<void> {
  const ctx = await requireNggContext();
  const goalId = field(formData, "goalId");
  const op = field(formData, "op");
  if (op === "approve") await approveGoal(ctx, goalId, "approved");
  else if (op === "reject") await approveGoal(ctx, goalId, "rejected");
  else if (op === "publish") await publishGoalToClient(ctx, goalId, true);
  else if (op === "unpublish") await publishGoalToClient(ctx, goalId, false);
  else if (op === "status") {
    const status = GOAL_STATUSES.find((s) => s === field(formData, "status"));
    if (status) await setGoalStatus(ctx, goalId, status);
  } else if (op === "toggle_action") await toggleGoalAction(ctx, goalId, field(formData, "actionId"), field(formData, "done") === "1");
  revalidatePath(base(formData));
  revalidatePath("/ngg/goals");
}

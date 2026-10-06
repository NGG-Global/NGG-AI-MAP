"use server";

import { revalidatePath } from "next/cache";
import { requireNggContext } from "@/server/auth/current";
import { createNggUser, setNggUserStatus } from "@/server/services/users";
import { field, runAction, type ActionState } from "@/server/ui/actions";
import { NGG_ROLES } from "@/domain/shared/enums";

export async function createNggUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireNggContext();
    const role = field(formData, "nggRole");
    await createNggUser(ctx, {
      name: field(formData, "name"),
      email: field(formData, "email"),
      nggRole: NGG_ROLES.find((r) => r === role) ?? "analyst",
      locale: field(formData, "locale") === "en" ? "en" : "he",
      password: field(formData, "password"),
    });
    revalidatePath("/ngg/users");
    return { ok: true, message: ctx.user.locale === "he" ? "המשתמש נוצר" : "User created" };
  });
}

export async function toggleNggUserAction(formData: FormData): Promise<void> {
  const ctx = await requireNggContext();
  await setNggUserStatus(ctx, field(formData, "userId"), field(formData, "mode") === "enable" ? "active" : "disabled");
  revalidatePath("/ngg/users");
}

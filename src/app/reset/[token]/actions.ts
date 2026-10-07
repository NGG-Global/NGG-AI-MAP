"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { redeemPasswordReset } from "@/server/services/passwordResets";
import { createSession, SESSION_COOKIE } from "@/server/auth/session";
import { env } from "@/server/shared/env";
import { field, runAction, type ActionState } from "@/server/ui/actions";
import { consumeRateLimit, RATE_RULES } from "@/server/security/rateLimit";
import { clientIp } from "@/server/security/request";

export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const database = await db();
    await consumeRateLimit(database, RATE_RULES.tokenRedeemByIp, await clientIp());
    const password = field(formData, "password");
    if (password !== field(formData, "confirm")) return { ok: false, error: "mismatch" };
    const userId = await redeemPasswordReset(database, field(formData, "token"), { password });
    const [user] = await database.select().from(users).where(eq(users.id, userId)).limit(1);
    const session = await createSession(database, userId);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, session.token, { httpOnly: true, sameSite: "lax", secure: env.isProduction, expires: session.expiresAt, path: "/" });
    redirect(user?.kind === "ngg" ? "/ngg" : "/dashboard");
  });
}

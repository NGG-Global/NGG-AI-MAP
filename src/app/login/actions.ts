"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { verifyPassword } from "@/server/auth/password";
import { createSession, deleteSession, SESSION_COOKIE } from "@/server/auth/session";
import { env } from "@/server/shared/env";
import { field, runAction, type ActionState } from "@/server/ui/actions";

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const email = field(formData, "email").toLowerCase();
    const password = field(formData, "password");
    const next = field(formData, "next");
    const database = await db();
    const [user] = await database.select().from(users).where(eq(users.email, email)).limit(1);
    const valid = user ? await verifyPassword(password, user.passwordHash) : false;
    if (!user || !valid || user.status !== "active") {
      return { ok: false, error: "invalid_credentials" };
    }
    const session = await createSession(database, user.id);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.isProduction,
      expires: session.expiresAt,
      path: "/",
    });
    const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : null;
    redirect(safeNext ?? (user.kind === "ngg" ? "/ngg" : "/dashboard"));
  });
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await deleteSession(await db(), token);
    cookieStore.delete(SESSION_COOKIE);
  }
  redirect("/login");
}

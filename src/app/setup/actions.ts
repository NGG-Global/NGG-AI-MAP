"use server";

import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/server/db/client";
import { bootstrapSuperAdmin, isFreshInstall } from "@/server/services/bootstrap";
import { createSession, SESSION_COOKIE } from "@/server/auth/session";
import { env } from "@/server/shared/env";
import { field, runAction, type ActionState } from "@/server/ui/actions";

function tokenMatches(provided: string): boolean {
  const expected = process.env.SETUP_TOKEN?.trim() ?? "";
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function setupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const database = await db();
    const email = field(formData, "email");
    const name = field(formData, "name");
    const password = field(formData, "password");
    // Echo the non-secret fields back so the form can keep them after an error (React resets forms).
    const keep = { name, email };
    if (!(await isFreshInstall(database))) return { ok: false, error: "already_set_up" };
    if (!tokenMatches(field(formData, "token"))) return { ok: false, error: "bad_token", keep };
    if (!email.includes("@") || name.length < 2) return { ok: false, error: "invalid", keep };
    if (password.length < 12) return { ok: false, error: "short_password", keep };
    const { userId } = await bootstrapSuperAdmin(database, { email, name, password });
    const session = await createSession(database, userId);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, session.token, { httpOnly: true, sameSite: "lax", secure: env.isProduction, expires: session.expiresAt, path: "/" });
    redirect("/ngg");
  });
}

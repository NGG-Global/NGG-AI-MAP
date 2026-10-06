"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/server/db/client";
import { acceptInvitation } from "@/server/services/invitations";
import { createSession, SESSION_COOKIE } from "@/server/auth/session";
import { env } from "@/server/shared/env";
import { field, runAction, type ActionState } from "@/server/ui/actions";

export async function acceptInviteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const token = field(formData, "token");
    const database = await db();
    const userId = await acceptInvitation(database, token, {
      name: field(formData, "name"),
      password: field(formData, "password"),
    });
    const session = await createSession(database, userId);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.isProduction,
      expires: session.expiresAt,
      path: "/",
    });
    redirect("/dashboard");
  });
}

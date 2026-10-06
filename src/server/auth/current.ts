import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/server/db/client";
import { getUserBySessionToken, loadActor, SESSION_COOKIE } from "./session";
import type { Actor } from "@/domain/authz/policy";
import type { User } from "@/server/db/schema";
import type { Db } from "@/server/db/connection";

export interface RequestContext {
  db: Db;
  actor: Actor;
  user: User;
}

export async function getCurrentContext(): Promise<RequestContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const database = await db();
  const user = await getUserBySessionToken(database, token);
  if (!user) return null;
  const actor = await loadActor(database, user);
  return { db: database, actor, user };
}

/** Redirects to the login page when there is no valid session. */
export async function requireContext(): Promise<RequestContext> {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  return ctx;
}

export async function requireNggContext(): Promise<RequestContext & { actor: Extract<Actor, { kind: "ngg" }> }> {
  const ctx = await requireContext();
  if (ctx.actor.kind !== "ngg") redirect("/dashboard");
  return ctx as RequestContext & { actor: Extract<Actor, { kind: "ngg" }> };
}

export async function requireClientContext(): Promise<RequestContext & { actor: Extract<Actor, { kind: "client" }> }> {
  const ctx = await requireContext();
  if (ctx.actor.kind !== "client") redirect("/ngg");
  return ctx as RequestContext & { actor: Extract<Actor, { kind: "client" }> };
}

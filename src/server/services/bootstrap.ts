import { count, eq } from "drizzle-orm";
import type { Db } from "@/server/db/connection";
import { users, workspaces } from "@/server/db/schema";
import { hashPassword } from "@/server/auth/password";
import { newId } from "@/lib/ids";
import { seedLibrary } from "@/server/seed/library";

/** True until the first user exists. The /setup page is only available in this state. */
export async function isFreshInstall(db: Db): Promise<boolean> {
  const [row] = await db.select({ n: count() }).from(users);
  return Number(row?.n ?? 0) === 0;
}

/** Creates the workspace (if missing) and a Super Admin, and loads the libraries. Idempotent for the user. */
export async function bootstrapSuperAdmin(db: Db, input: { email: string; name: string; password: string }): Promise<{ userId: string }> {
  const email = input.email.trim().toLowerCase();
  let [workspace] = await db.select().from(workspaces).limit(1);
  if (!workspace) [workspace] = await db.insert(workspaces).values({ id: newId(), name: "NGG" }).returning();
  const passwordHash = await hashPassword(input.password);
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  let userId: string;
  if (existing) {
    userId = existing.id;
    await db.update(users).set({ passwordHash, name: input.name.trim(), status: "active", kind: "ngg", nggRole: "super_admin", updatedAt: new Date() }).where(eq(users.id, userId));
  } else {
    userId = newId();
    await db.insert(users).values({ id: userId, workspaceId: workspace!.id, email, name: input.name.trim(), kind: "ngg", nggRole: "super_admin", passwordHash, locale: "he" });
  }
  await seedLibrary(db);
  return { userId };
}

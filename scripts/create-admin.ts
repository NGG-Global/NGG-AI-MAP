/**
 * Creates (or resets the password of) an NGG Super Admin without touching any other data.
 * Use this to bootstrap a production database — never run `db:seed` against production.
 *
 *   npm run admin:create -- --email admin@example.com --name "Full Name" --password "long-secret"
 */
import { eq } from "drizzle-orm";
import { createDb, closeDb, resolveTarget } from "../src/server/db/connection";
import { users, workspaces } from "../src/server/db/schema";
import { hashPassword } from "../src/server/auth/password";
import { newId } from "../src/lib/ids";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const name = arg("name")?.trim();
  const password = arg("password") ?? process.env.ADMIN_PASSWORD;
  if (!email || !name || !password) {
    console.error('Usage: npm run admin:create -- --email <email> --name "<name>" --password <password>');
    process.exit(1);
  }
  if (password.length < 12) {
    console.error("Password must be at least 12 characters.");
    process.exit(1);
  }
  const target = resolveTarget();
  console.log(`Database: ${target.startsWith("postgres") ? "PostgreSQL" : target}`);
  const db = await createDb({ runMigrations: true });

  let [workspace] = await db.select().from(workspaces).limit(1);
  if (!workspace) {
    [workspace] = await db.insert(workspaces).values({ id: newId(), name: "NGG" }).returning();
    console.log("Created workspace.");
  }
  const passwordHash = await hashPassword(password);
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    await db.update(users).set({ passwordHash, name, status: "active", kind: "ngg", nggRole: "super_admin", updatedAt: new Date() }).where(eq(users.id, existing.id));
    console.log(`Updated existing user ${email} as super admin.`);
  } else {
    await db.insert(users).values({ id: newId(), workspaceId: workspace!.id, email, name, kind: "ngg", nggRole: "super_admin", passwordHash, locale: "he" });
    console.log(`Created super admin ${email}.`);
  }
  await closeDb(db);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

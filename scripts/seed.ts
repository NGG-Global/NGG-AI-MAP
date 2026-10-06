/**
 * Seeds realistic demo data. Safe to re-run: it wipes and recreates the demo workspace.
 * Demo clients, people and numbers are fictional.
 */
import { createDb, closeDb, resolveTarget } from "../src/server/db/connection";
import { seedDemo } from "../src/server/seed/demo";

async function main() {
  const target = resolveTarget();
  console.log(`Seeding ${target.startsWith("postgres") ? "PostgreSQL" : target}`);
  const db = await createDb({ runMigrations: true });
  const summary = await seedDemo(db, { password: process.env.SEED_PASSWORD?.trim() || "ngg-demo-2026" });
  console.log(summary);
  await closeDb(db);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

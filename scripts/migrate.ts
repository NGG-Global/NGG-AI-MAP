import { createDb, closeDb, resolveTarget } from "../src/server/db/connection";

async function main() {
  const target = resolveTarget();
  console.log(`Applying migrations to ${target.startsWith("postgres") ? "PostgreSQL" : target}`);
  const database = await createDb({ runMigrations: true });
  await closeDb(database);
  console.log("Migrations applied.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

/**
 * Loads or refreshes the Section, Question and Metric libraries. Idempotent; never touches client data.
 * Run after deploying and after every change to src/domain/questionnaire/libraryContent.ts.
 */
import { createDb, closeDb, resolveTarget } from "../src/server/db/connection";
import { seedLibrary } from "../src/server/seed/library";

async function main() {
  const target = resolveTarget();
  console.log(`Database: ${target.startsWith("postgres") ? "PostgreSQL" : target}`);
  const db = await createDb({ runMigrations: true });
  console.log(await seedLibrary(db));
  await closeDb(db);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import "server-only";
import { createDb, type Db } from "./connection";
import { syncLibrary } from "@/server/seed/library";

/**
 * Process-wide database handle. Cached on `globalThis` so Next.js dev HMR does not open
 * multiple PGlite instances against the same data directory.
 */
const globalForDb = globalThis as unknown as { __nggDb?: Promise<Db> };

export function db(): Promise<Db> {
  if (!globalForDb.__nggDb) {
    // A failed connection or migration must not be cached, or the instance would stay broken.
    globalForDb.__nggDb = createDb({ runMigrations: true })
      .then(async (database) => {
        // Keep the Section, Question and Metric libraries in line with the deployed questionnaire copy.
        // A failed refresh is logged rather than fatal: existing questionnaires do not depend on it.
        await syncLibrary(database).catch((error: unknown) => console.error("Library sync failed", error));
        return database;
      })
      .catch((error: unknown) => {
        globalForDb.__nggDb = undefined;
        throw error;
      });
  }
  return globalForDb.__nggDb;
}

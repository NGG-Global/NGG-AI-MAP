import "server-only";
import { createDb, type Db } from "./connection";

/**
 * Process-wide database handle. Cached on `globalThis` so Next.js dev HMR does not open
 * multiple PGlite instances against the same data directory.
 */
const globalForDb = globalThis as unknown as { __nggDb?: Promise<Db> };

export function db(): Promise<Db> {
  if (!globalForDb.__nggDb) {
    globalForDb.__nggDb = createDb({ runMigrations: true });
  }
  return globalForDb.__nggDb;
}

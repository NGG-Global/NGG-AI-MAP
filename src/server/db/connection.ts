import fs from "node:fs";
import path from "node:path";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import * as schema from "./schema";

export type Db = PgliteDatabase<typeof schema> | NodePgDatabase<typeof schema>;

export interface CreateDbOptions {
  /** `memory` (tests), a PGlite data directory, or a PostgreSQL URL. Defaults to env. */
  target?: string;
  runMigrations?: boolean;
}

const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

export function resolveTarget(explicit?: string): string {
  if (explicit) return explicit;
  const url = process.env.DATABASE_URL?.trim();
  if (url) return url;
  return path.join(process.cwd(), ".data", "pglite");
}

export async function createDb(options: CreateDbOptions = {}): Promise<Db> {
  const target = resolveTarget(options.target);
  if (target.startsWith("postgres://") || target.startsWith("postgresql://")) {
    const pool = new Pool({ connectionString: target, ssl: sslOptions(target) });
    const database = drizzlePg(pool, { schema });
    if (options.runMigrations) await migratePg(database, { migrationsFolder: MIGRATIONS_FOLDER });
    return database;
  }
  if (target !== "memory") fs.mkdirSync(target, { recursive: true });
  const client = target === "memory" ? new PGlite() : new PGlite(target);
  await client.waitReady;
  const database = drizzlePglite(client, { schema });
  if (options.runMigrations) await migratePglite(database, { migrationsFolder: MIGRATIONS_FOLDER });
  return database;
}

/**
 * Remote managed databases (Supabase, Neon, …) require TLS. By default the connection is encrypted
 * without certificate verification so it works without installing provider CA certificates;
 * set DATABASE_SSL=verify for full verification, or DATABASE_SSL=off for a local plain connection.
 */
function sslOptions(url: string): false | { rejectUnauthorized: boolean } | undefined {
  const mode = process.env.DATABASE_SSL?.trim().toLowerCase();
  if (mode === "off") return false;
  if (mode === "verify") return { rejectUnauthorized: true };
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  })();
  if (host === "localhost" || host === "127.0.0.1") return undefined;
  return { rejectUnauthorized: false };
}

export async function closeDb(database: Db): Promise<void> {
  const client = (database as { $client?: unknown }).$client;
  if (client instanceof PGlite) await client.close();
  else if (client instanceof Pool) await client.end();
}

export { schema };

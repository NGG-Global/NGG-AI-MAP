import type { Actor } from "@/domain/authz/policy";
import type { Db } from "@/server/db/connection";

/** Everything a service needs: a database handle and the authenticated principal. */
export interface ServiceContext {
  db: Db;
  actor: Actor;
}

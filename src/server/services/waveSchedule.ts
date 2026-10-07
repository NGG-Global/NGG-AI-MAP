import { and, eq } from "drizzle-orm";
import type { Db } from "@/server/db/connection";
import { clients, projects, waves, type Wave } from "@/server/db/schema";
import { recordSystemAudit } from "./audit";

const DAY_MS = 86_400_000;

/** A scheduled wave opens on its start date. */
export function isDueToOpen(wave: Pick<Wave, "status" | "startAt">, now = new Date()): boolean {
  return wave.status === "scheduled" && (!wave.startAt || wave.startAt.getTime() <= now.getTime());
}

/** An open wave closes at the end of its end date (the whole end day is still accepted). */
export function isDueToClose(wave: Pick<Wave, "status" | "endAt">, now = new Date()): boolean {
  return wave.status === "open" && Boolean(wave.endAt) && wave.endAt!.getTime() + DAY_MS < now.getTime();
}

/**
 * Applies the wave calendar: opens scheduled waves whose start date has arrived and closes open waves
 * whose end date has passed (computing their results). Runs whenever waves are read, so no background
 * job is needed. Each transition is conditional on the previous status, so concurrent requests are safe.
 */
export async function applyWaveSchedule<T extends Wave>(db: Db, rows: T[], now = new Date()): Promise<T[]> {
  if (!rows.some((w) => isDueToOpen(w, now) || isDueToClose(w, now))) return rows;
  const out: T[] = [];
  for (const wave of rows) {
    if (isDueToOpen(wave, now)) {
      const [opened] = await db
        .update(waves)
        .set({ status: "open", updatedAt: now })
        .where(and(eq(waves.id, wave.id), eq(waves.status, "scheduled")))
        .returning();
      if (opened) await audit(db, opened, "wave.opened_on_schedule");
      const current = opened ?? wave;
      // A wave scheduled long ago may also be past its end date already.
      if (isDueToClose({ status: "open", endAt: current.endAt }, now)) {
        out.push({ ...wave, ...(await close(db, { ...current, status: "open" }, now)) });
        continue;
      }
      out.push({ ...wave, ...current, status: "open" });
    } else if (isDueToClose(wave, now)) {
      out.push({ ...wave, ...(await close(db, wave, now)) });
    } else {
      out.push(wave);
    }
  }
  return out;
}

async function close(db: Db, wave: Wave, now: Date): Promise<Wave> {
  const [closed] = await db
    .update(waves)
    .set({ status: "closed", closedAt: now, updatedAt: now })
    .where(and(eq(waves.id, wave.id), eq(waves.status, "open")))
    .returning();
  if (!closed) return wave;
  await audit(db, closed, "wave.closed_on_schedule");
  const { computeWaveResultsAsSystem } = await import("./results");
  await computeWaveResultsAsSystem(db, closed);
  return closed;
}

async function audit(db: Db, wave: Wave, action: string): Promise<void> {
  const [row] = await db
    .select({ clientId: clients.id, workspaceId: clients.workspaceId })
    .from(projects)
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .where(eq(projects.id, wave.projectId))
    .limit(1);
  if (!row) return;
  await recordSystemAudit(db, row.workspaceId, { actorLabel: "system", action, entityType: "wave", entityId: wave.id, clientId: row.clientId, projectId: wave.projectId, metadata: { code: wave.code } });
}

import { createHash } from "node:crypto";
import { eq, notInArray } from "drizzle-orm";
import type { Db } from "@/server/db/connection";
import { appMeta, metricDefinitions, questionTemplates, sectionTemplates } from "@/server/db/schema";
import { COPY_VERSION, LIBRARY_SECTIONS, METRIC_DEFINITIONS } from "@/domain/questionnaire/libraryContent";

const LIBRARY_HASH_KEY = "library_content_hash";

/** Fingerprint of the bundled library. When it changes, the database copy is refreshed. */
export function libraryContentHash(): string {
  return createHash("sha256").update(JSON.stringify({ COPY_VERSION, LIBRARY_SECTIONS, METRIC_DEFINITIONS })).digest("hex");
}

/**
 * Inserts or refreshes the Section, Question and Metric libraries, and removes library rows that are
 * no longer part of the bundled content. Idempotent and safe to run concurrently.
 *
 * Questionnaire versions are self-contained documents, so removing a library row never changes an
 * existing draft, a locked version or wave results.
 */
export async function seedLibrary(db: Db): Promise<{ sections: number; questions: number; metrics: number }> {
  let sections = 0;
  let questions = 0;
  const canonicalIds: string[] = [];
  for (const [index, section] of LIBRARY_SECTIONS.entries()) {
    const values = {
      version: section.version,
      category: section.category,
      name: section.name,
      description: section.description,
      intro: section.intro ?? null,
      fallbackIntro: section.fallbackIntro ?? null,
      sourceType: section.sourceType,
      researchStatus: section.researchStatus,
      audience: section.audience,
      required: section.required ?? true,
      recommendedCore: section.recommendedCore ?? false,
      longitudinalCore: section.longitudinalCore ?? false,
      mandatory: section.mandatory ?? false,
      sourceReference: section.sourceReference ?? null,
      displayRules: section.displayRules ?? [],
      sortOrder: index,
    };
    await db
      .insert(sectionTemplates)
      .values({ id: `sec_${section.key}`, key: section.key, ...values })
      .onConflictDoUpdate({ target: sectionTemplates.key, set: { ...values, updatedAt: new Date() } });
    sections += 1;
    for (const [qIndex, q] of section.questions.entries()) {
      canonicalIds.push(q.canonicalId);
      const qValues = {
        sectionKey: section.key,
        version: section.version,
        type: q.type,
        sourceType: section.sourceType,
        locked: q.locked ?? section.sourceType === "validated",
        content: { ...q.content, copyVersion: COPY_VERSION },
        metricId: q.metricId ?? null,
        reverseCoded: q.reverseCoded ?? false,
        audience: q.audience ?? null,
        required: q.required ?? true,
        sortOrder: qIndex,
      };
      await db
        .insert(questionTemplates)
        .values({ id: `q_${q.canonicalId}`, canonicalId: q.canonicalId, ...qValues })
        .onConflictDoUpdate({ target: questionTemplates.canonicalId, set: { ...qValues, updatedAt: new Date() } });
      questions += 1;
    }
  }
  for (const [index, metric] of METRIC_DEFINITIONS.entries()) {
    await db
      .insert(metricDefinitions)
      .values({ id: metric.id, config: metric, sortOrder: index })
      .onConflictDoUpdate({ target: metricDefinitions.id, set: { config: metric, sortOrder: index, updatedAt: new Date() } });
  }

  // Remove rows from earlier library editions (questions first: they reference their section).
  await db.delete(questionTemplates).where(notInArray(questionTemplates.canonicalId, canonicalIds));
  await db.delete(sectionTemplates).where(notInArray(sectionTemplates.key, LIBRARY_SECTIONS.map((s) => s.key)));
  await db.delete(metricDefinitions).where(notInArray(metricDefinitions.id, METRIC_DEFINITIONS.map((m) => m.id)));

  const hash = libraryContentHash();
  await db
    .insert(appMeta)
    .values({ key: LIBRARY_HASH_KEY, value: hash })
    .onConflictDoUpdate({ target: appMeta.key, set: { value: hash, updatedAt: new Date() } });
  return { sections, questions, metrics: METRIC_DEFINITIONS.length };
}

/**
 * Brings the database library in line with the deployed code. Runs on startup; a no-op when the
 * stored content hash already matches, so only the first request after a deploy pays for it.
 */
export async function syncLibrary(db: Db): Promise<boolean> {
  const [row] = await db.select().from(appMeta).where(eq(appMeta.key, LIBRARY_HASH_KEY)).limit(1);
  if (row?.value === libraryContentHash()) return false;
  await seedLibrary(db);
  return true;
}

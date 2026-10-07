import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { testDb, closeDb } from "./helpers/db";
import type { Db } from "@/server/db/connection";
import { libraryContentHash, seedLibrary, syncLibrary } from "@/server/seed/library";
import { appMeta, metricDefinitions, questionTemplates, sectionTemplates } from "@/server/db/schema";
import { LIBRARY_SECTIONS, METRIC_DEFINITIONS } from "@/domain/questionnaire/libraryContent";

let db: Db;

beforeAll(async () => {
  db = await testDb();
});
afterAll(async () => closeDb(db));

describe("library sync", () => {
  it("loads the library on a fresh database and records its content hash", async () => {
    expect(await syncLibrary(db)).toBe(true);
    const questions = await db.select().from(questionTemplates);
    expect(questions).toHaveLength(LIBRARY_SECTIONS.reduce((n, s) => n + s.questions.length, 0));
    expect(questions.every((q) => q.content.copyVersion === "questionnaire-copy-he-1.0")).toBe(true);
    const [hash] = await db.select().from(appMeta).where(eq(appMeta.key, "library_content_hash"));
    expect(hash!.value).toBe(libraryContentHash());
    // a second start is a no-op
    expect(await syncLibrary(db)).toBe(false);
  });

  it("removes rows from earlier library editions when the content changes", async () => {
    await db.insert(sectionTemplates).values({ id: "sec_old", key: "old_section", category: "custom", name: { he: "ישן" }, description: { he: "ישן" }, sourceType: "ngg_measure", researchStatus: "ngg_measure" });
    await db.insert(questionTemplates).values({ id: "q_old", canonicalId: "old_item", sectionKey: "old_section", type: "short_text", sourceType: "ngg_measure", content: { text: { he: "ישן" } } });
    await db.insert(metricDefinitions).values({ id: "old_metric", config: { ...METRIC_DEFINITIONS[0]!, id: "old_metric" } });
    // simulate a deploy with different library content
    await db.update(appMeta).set({ value: "previous" }).where(eq(appMeta.key, "library_content_hash"));
    expect(await syncLibrary(db)).toBe(true);
    expect(await db.select().from(questionTemplates).where(eq(questionTemplates.canonicalId, "old_item"))).toHaveLength(0);
    expect(await db.select().from(sectionTemplates).where(eq(sectionTemplates.key, "old_section"))).toHaveLength(0);
    expect(await db.select().from(metricDefinitions).where(eq(metricDefinitions.id, "old_metric"))).toHaveLength(0);
    expect(await db.select().from(metricDefinitions)).toHaveLength(METRIC_DEFINITIONS.length);
    // seeding stays idempotent
    await seedLibrary(db);
    expect(await db.select().from(sectionTemplates)).toHaveLength(LIBRARY_SECTIONS.length);
  });
});

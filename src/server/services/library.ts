import { asc } from "drizzle-orm";
import { metricDefinitions, questionTemplates, sectionTemplates, type QuestionTemplate, type SectionTemplate } from "@/server/db/schema";
import type { MetricConfig } from "@/domain/measurement/config";
import type { ServiceContext } from "./context";
import type { Db } from "@/server/db/connection";

export interface LibrarySectionWithQuestions {
  section: SectionTemplate;
  questions: QuestionTemplate[];
}

/** The Section Library is readable by every NGG user; editing is a super-admin concern (not in V1 UI). */
export async function loadLibrary(db: Db): Promise<LibrarySectionWithQuestions[]> {
  const [sections, questions] = await Promise.all([
    db.select().from(sectionTemplates).orderBy(asc(sectionTemplates.sortOrder)),
    db.select().from(questionTemplates).orderBy(asc(questionTemplates.sortOrder)),
  ]);
  return sections.map((section) => ({ section, questions: questions.filter((q) => q.sectionKey === section.key) }));
}

export async function listLibrary(ctx: ServiceContext): Promise<LibrarySectionWithQuestions[]> {
  if (ctx.actor.kind !== "ngg") return [];
  return loadLibrary(ctx.db);
}

export async function loadMetricConfigs(db: Db): Promise<MetricConfig[]> {
  const rows = await db.select().from(metricDefinitions).orderBy(asc(metricDefinitions.sortOrder));
  return rows.map((r) => r.config);
}

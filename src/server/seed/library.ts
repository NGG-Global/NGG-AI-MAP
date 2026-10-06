import type { Db } from "@/server/db/connection";
import { metricDefinitions, questionTemplates, sectionTemplates } from "@/server/db/schema";
import { LIBRARY_SECTIONS, METRIC_DEFINITIONS } from "@/domain/questionnaire/libraryContent";

/** Inserts or refreshes the Section Library, Question Library and Metric Library. Idempotent. */
export async function seedLibrary(db: Db): Promise<{ sections: number; questions: number; metrics: number }> {
  let sections = 0;
  let questions = 0;
  for (const [index, section] of LIBRARY_SECTIONS.entries()) {
    await db
      .insert(sectionTemplates)
      .values({
        id: `sec_${section.key}`,
        key: section.key,
        version: section.version,
        category: section.category,
        name: section.name,
        description: section.description,
        sourceType: section.sourceType,
        researchStatus: section.researchStatus,
        audience: section.audience,
        recommendedCore: section.recommendedCore ?? false,
        longitudinalCore: section.longitudinalCore ?? false,
        mandatory: section.mandatory ?? false,
        sourceReference: section.sourceReference ?? null,
        displayRules: section.displayRules ?? [],
        sortOrder: index,
      })
      .onConflictDoUpdate({
        target: sectionTemplates.key,
        set: {
          version: section.version,
          category: section.category,
          name: section.name,
          description: section.description,
          sourceType: section.sourceType,
          researchStatus: section.researchStatus,
          audience: section.audience,
          recommendedCore: section.recommendedCore ?? false,
          longitudinalCore: section.longitudinalCore ?? false,
          mandatory: section.mandatory ?? false,
          sourceReference: section.sourceReference ?? null,
          displayRules: section.displayRules ?? [],
          sortOrder: index,
          updatedAt: new Date(),
        },
      });
    sections += 1;
    for (const [qIndex, q] of section.questions.entries()) {
      const locked = q.locked ?? section.sourceType === "validated";
      await db
        .insert(questionTemplates)
        .values({
          id: `q_${q.canonicalId}`,
          canonicalId: q.canonicalId,
          sectionKey: section.key,
          version: section.version,
          type: q.type,
          sourceType: section.sourceType,
          locked,
          content: q.content,
          metricId: q.metricId ?? null,
          reverseCoded: q.reverseCoded ?? false,
          audience: q.audience ?? null,
          required: q.required ?? true,
          sortOrder: qIndex,
        })
        .onConflictDoUpdate({
          target: questionTemplates.canonicalId,
          set: {
            sectionKey: section.key,
            version: section.version,
            type: q.type,
            sourceType: section.sourceType,
            locked,
            content: q.content,
            metricId: q.metricId ?? null,
            reverseCoded: q.reverseCoded ?? false,
            audience: q.audience ?? null,
            required: q.required ?? true,
            sortOrder: qIndex,
            updatedAt: new Date(),
          },
        });
      questions += 1;
    }
  }
  for (const [index, metric] of METRIC_DEFINITIONS.entries()) {
    await db
      .insert(metricDefinitions)
      .values({ id: metric.id, config: metric, sortOrder: index })
      .onConflictDoUpdate({ target: metricDefinitions.id, set: { config: metric, sortOrder: index, updatedAt: new Date() } });
  }
  return { sections, questions, metrics: METRIC_DEFINITIONS.length };
}

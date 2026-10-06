import type { AIProvider } from "./provider";
import type { AnalyticalPayload, ExecutiveSummary, GoalSuggestions, MetricChangeExplanation, OpenTextThemes } from "@/domain/ai/contracts";
import { hasSufficientEvidence } from "@/domain/ai/payload";

/**
 * Deterministic, rule-based provider. It only ever restates numbers from the payload, so it is safe
 * for demos and tests and never fabricates data. Text is bilingual by payload locale.
 */
export class MockAIProvider implements AIProvider {
  readonly meta = { provider: "mock", model: null };

  async generateExecutiveSummary(p: AnalyticalPayload): Promise<ExecutiveSummary> {
    const he = p.locale === "he";
    if (!hasSufficientEvidence(p)) {
      const msg = he ? "אין מספיק ראיות לניסוח מסקנות: מספר המשיבים נמוך מהסף או שאין מדדים מחושבים." : "Insufficient evidence for conclusions: respondents below threshold or no computed metrics.";
      return { summary: msg, currentState: msg, biggestChange: msg, primaryRisk: msg, recommendedPriority: msg, keyChanges: [], risks: [], opportunities: [], insufficientEvidence: true };
    }
    const scored = p.metrics.filter((m) => m.score != null && !m.suppressed);
    const core = scored.filter((m) => ["ai_usage", "ai_literacy", "agentic_work", "verification", "org_enablement", "agentic_management"].includes(m.metricId));
    const strongest = [...core].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
    const weakest = [...core].sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0];
    // Only scale metrics (1–5) qualify as "changes"; share metrics are percentages and would dominate.
    const withDelta = scored.filter((m) => m.delta != null && m.scaleMax === 5);
    const biggest = [...withDelta].sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0))[0];
    const worstGap = [...p.gaps].filter((g) => g.gap != null).sort((a, b) => (a.gap ?? 0) - (b.gap ?? 0))[0];
    const f = (n: number | null | undefined) => (n == null ? "—" : n.toFixed(1));
    const d = (n: number | null | undefined) => (n == null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(2)}`);

    const currentState = strongest && weakest
      ? he
        ? `המדד החזק ביותר הוא ${strongest.name} (${f(strongest.score)} מתוך ${strongest.scaleMax}, n=${strongest.n}); החלש ביותר הוא ${weakest.name} (${f(weakest.score)}).`
        : `The strongest metric is ${strongest.name} (${f(strongest.score)} of ${strongest.scaleMax}, n=${strongest.n}); the weakest is ${weakest.name} (${f(weakest.score)}).`
      : he ? "אין מדדי ליבה מחושבים." : "No core metrics computed.";
    const biggestChange = biggest
      ? he
        ? `השינוי הגדול ביותר מאז ${p.baselineWaveCode}: ${biggest.name} ${d(biggest.delta)} (מ-${f(biggest.baselineScore)} ל-${f(biggest.score)}). השינוי התרחש במקביל להתערבות; קשר סיבתי לא נבדק.`
        : `Largest change since ${p.baselineWaveCode}: ${biggest.name} ${d(biggest.delta)} (from ${f(biggest.baselineScore)} to ${f(biggest.score)}). The change coincided with the intervention period; causality was not tested.`
      : he ? "זהו גל ה-Baseline; מגמות יופיעו לאחר המדידה הבאה." : "This is the baseline wave; trends will appear after the next measurement.";
    const primaryRisk = worstGap && worstGap.gap != null && worstGap.gap <= -0.3
      ? he
        ? `פער תפיסה של ${Math.abs(worstGap.gap).toFixed(1)} נקודות ב"${worstGap.name}": מנהלים ${f(worstGap.managerScore)}, צוות ${f(worstGap.teamScore)}.`
        : `A perception gap of ${Math.abs(worstGap.gap).toFixed(1)} points in "${worstGap.name}": managers ${f(worstGap.managerScore)}, team ${f(worstGap.teamScore)}.`
      : weakest
        ? he ? `${weakest.name} נמוך יחסית (${f(weakest.score)}).` : `${weakest.name} is comparatively low (${f(weakest.score)}).`
        : he ? "לא זוהה סיכון מובהק." : "No clear risk identified.";
    const topBarrier = [...p.barriers].sort((a, b) => b.share - a.share)[0];
    const recommendedPriority = worstGap && worstGap.gap != null && worstGap.gap <= -0.3
      ? he ? `להבהיר ציפיות לשימוש ב-AI בכל צוות ולבדוק את הפער ב"${worstGap.name}" בגל הבא.` : `Clarify expectations for AI use in every team and re-check the "${worstGap.name}" gap next wave.`
      : topBarrier
        ? he ? `לטפל בחסם המוביל (${topBarrier.label}, ${topBarrier.share.toFixed(0)}% מהמשיבים).` : `Address the leading barrier (${topBarrier.label}, ${topBarrier.share.toFixed(0)}% of respondents).`
        : he ? `לחזק את ${weakest?.name ?? "המדד החלש"}.` : `Strengthen ${weakest?.name ?? "the weakest metric"}.`;
    return {
      summary: `${currentState} ${biggestChange}`,
      currentState,
      biggestChange,
      primaryRisk,
      recommendedPriority,
      keyChanges: withDelta.filter((m) => Math.abs(m.delta ?? 0) >= 0.15).slice(0, 4).map((m) => ({ text: `${m.name}: ${d(m.delta)}`, metricIds: [m.metricId] })),
      risks: worstGap && worstGap.gap != null && worstGap.gap <= -0.3 ? [{ text: primaryRisk, metricIds: [worstGap.pairId] }] : weakest ? [{ text: primaryRisk, metricIds: [weakest.metricId] }] : [],
      opportunities: strongest ? [{ text: he ? `לבנות על ${strongest.name} כבסיס להרחבה.` : `Build on ${strongest.name} as a base for expansion.`, metricIds: [strongest.metricId] }] : [],
      insufficientEvidence: false,
    };
  }

  async explainMetricChange(p: AnalyticalPayload, metricId: string): Promise<MetricChangeExplanation> {
    const he = p.locale === "he";
    const m = p.metrics.find((x) => x.metricId === metricId);
    if (!m || m.score == null || !hasSufficientEvidence(p)) {
      const msg = he ? "אין מספיק ראיות." : "Insufficient evidence.";
      return { metricId, whatChanged: msg, relatedChanges: [], canConclude: [], cannotConclude: [msg], insufficientEvidence: true };
    }
    const f = (n: number | null) => (n == null ? "—" : n.toFixed(2));
    const whatChanged = m.delta == null
      ? he ? `${m.name} עומד על ${f(m.score)} (n=${m.n}). ${m.comparable ? "אין גל קודם להשוואה." : "המדד אינו בר השוואה לגל הקודם."}` : `${m.name} is ${f(m.score)} (n=${m.n}). ${m.comparable ? "No previous wave to compare." : "The metric is not comparable with the previous wave."}`
      : he ? `${m.name} השתנה מ-${f(m.baselineScore)} ל-${f(m.score)} (${m.delta > 0 ? "+" : ""}${m.delta.toFixed(2)}, n=${m.n}).` : `${m.name} moved from ${f(m.baselineScore)} to ${f(m.score)} (${m.delta > 0 ? "+" : ""}${m.delta.toFixed(2)}, n=${m.n}).`;
    const related = p.metrics.filter((x) => x.metricId !== metricId && x.delta != null && Math.abs(x.delta) >= 0.15).slice(0, 3);
    return {
      metricId,
      whatChanged,
      relatedChanges: related.map((x) => ({ metricId: x.metricId, text: `${x.name}: ${x.delta! > 0 ? "+" : ""}${x.delta!.toFixed(2)}` })),
      canConclude: [he ? "השינוי מתואר ברמה מצרפית ומבוסס על פריטים ברי השוואה בלבד." : "The change is described at aggregate level and rests on comparable items only."],
      cannotConclude: [he ? "לא ניתן להסיק שהתערבות כלשהי גרמה לשינוי; המדידה אינה ניסוי מבוקר." : "No intervention can be said to have caused the change; the measurement is not a controlled experiment."],
      insufficientEvidence: false,
    };
  }

  async generateManagementGoals(p: AnalyticalPayload): Promise<GoalSuggestions> {
    const he = p.locale === "he";
    if (!hasSufficientEvidence(p)) return { goals: [{ title: he ? "אין מספיק ראיות" : "Insufficient evidence", rationale: he ? "מספר המשיבים נמוך מהסף." : "Respondents below threshold.", relatedMetrics: [], recommendedActions: [he ? "להמתין למדידה נוספת" : "Wait for another measurement"], successEvidence: [], suggestedReviewPeriod: "—" }], insufficientEvidence: true };
    const worstGap = [...p.gaps].filter((g) => g.gap != null).sort((a, b) => (a.gap ?? 0) - (b.gap ?? 0))[0];
    const core = p.metrics.filter((m) => m.score != null && ["ai_usage", "ai_literacy", "agentic_work", "verification", "org_enablement", "agentic_management"].includes(m.metricId)).sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
    const goals: GoalSuggestions["goals"] = [];
    if (worstGap && worstGap.gap != null && worstGap.gap <= -0.3) {
      goals.push({
        title: he ? `לצמצם את פער המנהל–צוות ב"${worstGap.name}"` : `Close the manager–team gap in "${worstGap.name}"`,
        rationale: he ? `מנהלים מדרגים ${worstGap.managerScore?.toFixed(1)} לעומת ${worstGap.teamScore?.toFixed(1)} בצוותים.` : `Managers rate ${worstGap.managerScore?.toFixed(1)} versus ${worstGap.teamScore?.toFixed(1)} in teams.`,
        relatedMetrics: [worstGap.pairId],
        recommendedActions: he ? ["לקיים שיחת ציפיות על שימוש ב-AI בכל צוות", "לתעד הנחיה כתובה קצרה", "לבדוק הבנה בסקר קצר לאחר חודש"] : ["Hold an expectations conversation on AI use in every team", "Document a short written guideline", "Check understanding with a brief pulse after one month"],
        successEvidence: he ? ["הנחיה כתובה קיימת", "הפער יורד מתחת ל-0.3 בגל הבא"] : ["Written guideline exists", "Gap falls below 0.3 next wave"],
        suggestedReviewPeriod: he ? "3 חודשים" : "3 months",
      });
    }
    for (const m of core.slice(0, 3 - goals.length)) {
      goals.push({
        title: he ? `לחזק את ${m.name}` : `Strengthen ${m.name}`,
        rationale: he ? `${m.name} הוא מהמדדים הנמוכים (${m.score?.toFixed(1)} מתוך ${m.scaleMax}, n=${m.n}).` : `${m.name} is among the lowest metrics (${m.score?.toFixed(1)} of ${m.scaleMax}, n=${m.n}).`,
        relatedMetrics: [m.metricId],
        recommendedActions: he ? ["לבחור זרימת עבודה אחת לשיפור", "להגדיר בעלים ונקודת בקרה אנושית", "למדוד שוב בגל הבא"] : ["Choose one workflow to improve", "Define an owner and a human review point", "Re-measure next wave"],
        successEvidence: he ? ["זרימת העבודה מתועדת", `${m.name} עולה בגל הבא`] : ["Workflow documented", `${m.name} rises next wave`],
        suggestedReviewPeriod: he ? "6 חודשים" : "6 months",
      });
    }
    return { goals: goals.slice(0, 3), insufficientEvidence: goals.length === 0 };
  }

  async analyzeOpenTextThemes(p: AnalyticalPayload): Promise<OpenTextThemes> {
    const samples = p.openTextSamples;
    if (samples.length < p.privacyThreshold) return { themes: [], responseCount: samples.length, insufficientEvidence: true };
    // Simple keyword grouping; a real provider clusters semantically.
    const buckets: Array<{ theme: { he: string; en: string }; words: string[] }> = [
      { theme: { he: "הדרכה ולמידה", en: "Training and learning" }, words: ["הדרכה", "למידה", "קורס", "training", "learn", "course"] },
      { theme: { he: "גישה לכלים", en: "Tool access" }, words: ["גישה", "כלי", "רישיון", "access", "tool", "license"] },
      { theme: { he: "מדיניות וכללים", en: "Policy and rules" }, words: ["מדיניות", "מותר", "אסור", "policy", "allowed", "rules"] },
      { theme: { he: "זמן ועומס", en: "Time and workload" }, words: ["זמן", "עומס", "time", "workload"] },
    ];
    const themes = buckets
      .map((b) => {
        const hits = samples.filter((s) => b.words.some((w) => s.toLowerCase().includes(w)));
        return { theme: p.locale === "he" ? b.theme.he : b.theme.en, frequency: hits.length, representativeParaphrases: hits.slice(0, 2).map((h) => h.slice(0, 120)) };
      })
      .filter((t) => t.frequency > 0)
      .sort((a, b) => b.frequency - a.frequency);
    return { themes, responseCount: samples.length, insufficientEvidence: themes.length === 0 };
  }
}

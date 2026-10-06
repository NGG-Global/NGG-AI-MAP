import type { AnalyticalPayload, ExecutiveSummary, GoalSuggestions, MetricChangeExplanation, OpenTextThemes } from "@/domain/ai/contracts";

/**
 * AIProvider abstraction (spec §30). Implementations receive only the sanitised analytical payload
 * and must return raw JSON objects; validation against the Zod contracts happens in the orchestrator.
 */
export interface AIProviderMeta {
  provider: string;
  model: string | null;
}

export interface AIProvider {
  readonly meta: AIProviderMeta;
  generateExecutiveSummary(payload: AnalyticalPayload): Promise<unknown>;
  explainMetricChange(payload: AnalyticalPayload, metricId: string): Promise<unknown>;
  generateManagementGoals(payload: AnalyticalPayload): Promise<unknown>;
  analyzeOpenTextThemes(payload: AnalyticalPayload): Promise<unknown>;
}

export type AIOutputs = {
  executive_summary: ExecutiveSummary;
  explain_change: MetricChangeExplanation;
  goal_suggestions: GoalSuggestions;
  open_text_themes: OpenTextThemes;
};

export class AIProviderError extends Error {
  constructor(message: string, override readonly cause?: unknown) {
    super(message);
    this.name = "AIProviderError";
  }
}

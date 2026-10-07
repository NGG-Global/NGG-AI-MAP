import type { AIProvider } from "./provider";
import { AIProviderError } from "./provider";
import type { AnalyticalPayload } from "@/domain/ai/contracts";

/**
 * Provider for any OpenAI-compatible chat-completions endpoint (Groq, Cloudflare Workers AI's
 * OpenAI-compatible API, enterprise gateways). Configure through AI_BASE_URL / AI_API_KEY / AI_MODEL.
 * Verify the exact endpoint path and JSON-mode support in your provider's current documentation.
 */
export interface OpenAICompatibleConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs?: number;
}

const SYSTEM_PROMPT = `You are an organizational analyst for NGG. You receive ONLY aggregated survey metrics (scores, deltas, sample sizes, manager–team gaps, barrier shares).
Rules:
- Never invent numbers or metric names. Reference metrics only by the metricId values provided.
- Do not make causal claims; describe co-occurring changes and say what cannot be concluded.
- Metrics with neutralDirection: true (e.g. trust in AI) have no better direction; never call an increase an improvement. Read trust together with verification behavior.
- Metrics use different ranges (scaleMin–scaleMax); compare levels only relative to each metric's own range. percent: true means a share of respondents.
- Hebrew versions of validated scales are NGG adaptations; do not describe them as validated in Hebrew.
- If evidence is insufficient (few respondents, no scored metrics), set insufficientEvidence: true.
- Write in the language given by "locale" (he = Hebrew, en = English). Keep sentences short and professional.
- Respond with a single JSON object matching the requested schema and nothing else.`;

export class OpenAICompatibleProvider implements AIProvider {
  readonly meta: { provider: string; model: string | null };
  constructor(private readonly config: OpenAICompatibleConfig) {
    this.meta = { provider: "openai_compatible", model: config.model };
  }

  private async complete(task: string, schemaDescription: string, payload: AnalyticalPayload, extra: Record<string, unknown> = {}): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 60_000);
    try {
      const response = await fetch(`${this.config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${this.config.apiKey}` },
        body: JSON.stringify({
          model: this.config.model,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Task: ${task}\n\nReturn JSON with this shape:\n${schemaDescription}\n\nData:\n${JSON.stringify({ ...payload, ...extra })}` },
          ],
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new AIProviderError(`provider_http_${response.status}`);
      const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = json.choices?.[0]?.message?.content;
      if (!content) throw new AIProviderError("provider_empty");
      return JSON.parse(content) as unknown;
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      throw new AIProviderError("provider_failed", error);
    } finally {
      clearTimeout(timer);
    }
  }

  generateExecutiveSummary(payload: AnalyticalPayload) {
    return this.complete(
      "Write an executive summary of the organization's AI adoption profile.",
      `{ "summary": string, "currentState": string, "biggestChange": string, "primaryRisk": string, "recommendedPriority": string, "keyChanges": [{ "text": string, "metricIds": string[] }], "risks": [{ "text": string, "metricIds": string[] }], "opportunities": [{ "text": string, "metricIds": string[] }], "insufficientEvidence": boolean }`,
      payload,
    );
  }

  explainMetricChange(payload: AnalyticalPayload, metricId: string) {
    return this.complete(
      `Explain what changed in metric "${metricId}", which related metrics moved alongside it, what can and cannot be concluded.`,
      `{ "metricId": "${metricId}", "whatChanged": string, "relatedChanges": [{ "metricId": string, "text": string }], "canConclude": string[], "cannotConclude": string[], "insufficientEvidence": boolean }`,
      payload,
      { focusMetricId: metricId },
    );
  }

  generateManagementGoals(payload: AnalyticalPayload) {
    return this.complete(
      "Propose 1–3 management goals grounded in the weakest metrics and largest manager–team gaps.",
      `{ "goals": [{ "title": string, "rationale": string, "relatedMetrics": string[], "recommendedActions": string[], "successEvidence": string[], "suggestedReviewPeriod": string }], "insufficientEvidence": boolean }`,
      payload,
    );
  }

  analyzeOpenTextThemes(payload: AnalyticalPayload) {
    return this.complete(
      "Group the redacted open-text samples into themes with frequencies and short representative paraphrases (never quotes).",
      `{ "themes": [{ "theme": string, "frequency": number, "representativeParaphrases": string[] }], "responseCount": number, "insufficientEvidence": boolean }`,
      payload,
    );
  }
}

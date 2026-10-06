import { env } from "@/server/shared/env";
import { MockAIProvider } from "./mock";
import { OpenAICompatibleProvider } from "./openaiCompatible";
import type { AIProvider } from "./provider";

/** Resolves the configured provider. Falls back to the mock when credentials are missing. */
export function getAIProvider(): AIProvider {
  if (env.aiProvider === "openai_compatible" && env.aiBaseUrl && env.aiApiKey && env.aiModel) {
    return new OpenAICompatibleProvider({ baseUrl: env.aiBaseUrl, apiKey: env.aiApiKey, model: env.aiModel });
  }
  return new MockAIProvider();
}

export type { AIProvider } from "./provider";

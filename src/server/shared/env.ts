/** Centralised, validated access to environment variables. Never read `process.env` elsewhere. */
export const env = {
  get sessionSecret(): string {
    return process.env.SESSION_SECRET?.trim() || "dev-only-insecure-secret-change-me";
  },
  get appUrl(): string {
    return (process.env.APP_URL?.trim() || "http://localhost:3000").replace(/\/$/, "");
  },
  get aiProvider(): "mock" | "openai_compatible" {
    return process.env.AI_PROVIDER === "openai_compatible" ? "openai_compatible" : "mock";
  },
  get aiBaseUrl(): string | undefined {
    return process.env.AI_BASE_URL?.trim() || undefined;
  },
  get aiApiKey(): string | undefined {
    return process.env.AI_API_KEY?.trim() || undefined;
  },
  get aiModel(): string | undefined {
    return process.env.AI_MODEL?.trim() || undefined;
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },
};

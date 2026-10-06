/** Centralised, validated access to environment variables. Never read `process.env` elsewhere. */
function clean(value: string | undefined): string | undefined {
  const v = (value ?? "").trim().replace(/^["']+|["']+$/g, "").trim();
  return v || undefined;
}

export const env = {
  get sessionSecret(): string {
    return clean(process.env.SESSION_SECRET) || "dev-only-insecure-secret-change-me";
  },
  get appUrl(): string {
    return (clean(process.env.APP_URL) || "http://localhost:3000").replace(/\/$/, "");
  },
  get aiProvider(): "mock" | "openai_compatible" {
    return clean(process.env.AI_PROVIDER) === "openai_compatible" ? "openai_compatible" : "mock";
  },
  get aiBaseUrl(): string | undefined {
    return clean(process.env.AI_BASE_URL);
  },
  get aiApiKey(): string | undefined {
    return clean(process.env.AI_API_KEY);
  },
  get aiModel(): string | undefined {
    return clean(process.env.AI_MODEL);
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },
};

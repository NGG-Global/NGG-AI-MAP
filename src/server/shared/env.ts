/** Centralised, validated access to environment variables. Never read `process.env` elsewhere. */
function clean(value: string | undefined): string | undefined {
  const v = (value ?? "").trim().replace(/^["']+|["']+$/g, "").trim();
  return v || undefined;
}

const DEV_SECRET = "dev-only-insecure-secret-change-me";
const MIN_SECRET_LENGTH = 32;

/** Why the configuration is unsafe for production, or null when it is fine. */
export function insecureConfigReason(): string | null {
  if (process.env.NODE_ENV !== "production") return null;
  const secret = clean(process.env.SESSION_SECRET);
  if (!secret) return "SESSION_SECRET is not set";
  if (secret.length < MIN_SECRET_LENGTH || secret.startsWith("change-me")) return `SESSION_SECRET must be a random string of at least ${MIN_SECRET_LENGTH} characters`;
  return null;
}

export const env = {
  /**
   * Keys pseudonymous identity hashes and rate-limit keys. In production a missing or weak secret is
   * a hard error: falling back to a known default would make those hashes guessable.
   */
  get sessionSecret(): string {
    const reason = insecureConfigReason();
    if (reason) throw new Error(`Insecure configuration: ${reason}. Set it in the hosting environment and redeploy.`);
    return clean(process.env.SESSION_SECRET) || DEV_SECRET;
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

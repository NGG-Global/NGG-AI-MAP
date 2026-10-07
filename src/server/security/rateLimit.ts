import { createHmac } from "node:crypto";
import { sql } from "drizzle-orm";
import type { Db } from "@/server/db/connection";
import { rateLimits } from "@/server/db/schema";
import { env } from "@/server/shared/env";
import { AppError } from "@/server/shared/errors";

/**
 * Fixed-window rate limiting backed by the database, so it holds across serverless instances without
 * an extra service. Subjects (IP addresses, emails, tokens) are stored only as keyed hashes.
 */

export interface RateRule {
  /** Short name of what is limited, e.g. `login:ip`. */
  bucket: string;
  limit: number;
  windowMs: number;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export const RATE_RULES = {
  loginByIp: { bucket: "login:ip", limit: 30, windowMs: 15 * MINUTE },
  loginByEmail: { bucket: "login:email", limit: 8, windowMs: 15 * MINUTE },
  tokenRedeemByIp: { bucket: "token:ip", limit: 20, windowMs: HOUR },
  // Many employees can share one office IP, so public-link limits are generous: they stop automated
  // flooding, not a colleague answering from the same network.
  surveyStartByIp: { bucket: "survey-start:ip", limit: 300, windowMs: HOUR },
  surveySaveByRespondent: { bucket: "survey-save:respondent", limit: 1500, windowMs: HOUR },
  aiByUser: { bucket: "ai:user", limit: 30, windowMs: HOUR },
} satisfies Record<string, RateRule>;

export class RateLimitError extends AppError {
  constructor(readonly retryAfterSeconds: number) {
    super("rate_limited", 429);
  }
}

function keyFor(rule: RateRule, subject: string): string {
  const digest = createHmac("sha256", env.sessionSecret).update(subject.trim().toLowerCase()).digest("base64url").slice(0, 32);
  return `${rule.bucket}:${digest}`;
}

/** Counts one attempt; throws RateLimitError once the window's limit is exceeded. */
export async function consumeRateLimit(db: Db, rule: RateRule, subject: string, now = new Date()): Promise<void> {
  const key = keyFor(rule, subject);
  const cutoff = new Date(now.getTime() - rule.windowMs);
  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart: now, count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${rateLimits.windowStart} < ${cutoff.toISOString()}::timestamptz then 1 else ${rateLimits.count} + 1 end`,
        windowStart: sql`case when ${rateLimits.windowStart} < ${cutoff.toISOString()}::timestamptz then ${now.toISOString()}::timestamptz else ${rateLimits.windowStart} end`,
      },
    })
    .returning();
  if (row && row.count > rule.limit) {
    const retryAfter = Math.max(1, Math.ceil((row.windowStart.getTime() + rule.windowMs - now.getTime()) / 1000));
    throw new RateLimitError(retryAfter);
  }
}

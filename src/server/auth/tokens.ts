import { createHash, createHmac, randomBytes } from "node:crypto";

/** URL-safe random token (used for sessions, invitations and survey links). */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** One-way hash stored in the database; the clear token lives only in the link/cookie. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function hmacIdentifier(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value.trim().toLowerCase()).digest("hex");
}

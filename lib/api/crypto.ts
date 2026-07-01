import { createHash, randomBytes } from "node:crypto";

const PREFIX = "sk_live_";

/** Generate a new raw API key. Returned to the user exactly ONCE on creation. */
export function generateApiKey(): string {
  // 24 random bytes → ~32 url-safe characters (base64url), well above 128 bits of entropy.
  return PREFIX + randomBytes(24).toString("base64url");
}

/** SHA-256 hex digest of the full key — this is the only form we persist. */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** Visible prefix used to identify a key in the UI without exposing the secret. */
export function apiKeyPrefix(key: string): string {
  return key.slice(0, 12); // e.g. "sk_live_abcd"
}

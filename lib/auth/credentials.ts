import "server-only";

import { env } from "@/lib/config/env";

import { verifyCode } from "./password";
import { createSessionToken } from "./session";

/**
 * The bridge between the pure crypto primitives and the deployment
 * configuration. Keeping the environment access in one place lets the
 * primitives themselves stay trivially testable.
 */

/**
 * Verify a submitted access code against the deployed credentials.
 *
 * Returns `false` for any failure — wrong code, malformed stored hash —
 * without distinguishing between them.
 */
export function verifyAccessCode(code: string): boolean {
  return verifyCode(code, env.ACCESS_CODE_SALT, env.ACCESS_CODE_HASH);
}

/** Issue a session token for a slug, signed with the deployment secret. */
export function issueSessionToken(slug: string): string {
  return createSessionToken(slug, env.SESSION_SECRET);
}

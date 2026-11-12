import "server-only";

import { parseEnv, type Env } from "./env-schema";

/**
 * The single validated source of configuration for the server runtime.
 *
 * Importing this module from a Client Component is a build error (`server-only`),
 * and the secrets it reads are replaced with `undefined` in client bundles,
 * so a secret can never reach the browser by accident.
 */
export const env: Readonly<Env> = Object.freeze(parseEnv(process.env));

/** True when the rate limiting store is configured. */
export const isRateLimitConfigured: boolean = Boolean(
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN,
);

if (!isRateLimitConfigured) {
  console.warn(
    "[birthday-experience] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set. " +
      "The access endpoint is currently unthrottled. Configure them before deploying to production.",
  );
}

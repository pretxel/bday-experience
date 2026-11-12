import { z } from "zod";

/** A SHA-256 digest, hex encoded (64 characters). */
const SHA256_HEX = /^[0-9a-f]{64}$/;

/** A hex encoded salt of at least 16 bytes (32 characters). */
const SALT_HEX = /^[0-9a-f]{32,}$/;

/** Lowercase kebab-case slug, used for recipients and for the session binding. */
const SLUG = /^[a-z0-9-]{1,64}$/;

/**
 * Treat an empty string as "not set".
 *
 * Some hosts expose unset variables as an empty string rather than omitting
 * them, and an empty string is not a valid URL.
 */
function emptyToUndefined(value: unknown): unknown {
  return value === "" ? undefined : value;
}

const optionalUrl = z.preprocess(emptyToUndefined, z.url().optional());
const optionalToken = z.preprocess(emptyToUndefined, z.string().min(1).optional());

/**
 * The shape of every environment variable the application reads.
 *
 * Kept free of any runtime access so it can be unit tested in isolation;
 * `lib/config/env.ts` is the module that actually reads `process.env`.
 */
export const envSchema = z.object({
  /** Hex SHA-256 digest of the scrypt-derived access code key. Never the code itself. */
  ACCESS_CODE_HASH: z
    .string()
    .regex(SHA256_HEX, "must be a 64-character hex SHA-256 digest"),

  /** Hex salt used to derive the access code key. */
  ACCESS_CODE_SALT: z
    .string()
    .regex(SALT_HEX, "must be a hex-encoded salt of at least 32 characters"),

  /** Secret used to sign session tokens with HMAC-SHA256. */
  SESSION_SECRET: z
    .string()
    .min(32, "must be at least 32 characters long")
    .max(512, "must be at most 512 characters long"),

  /** The slug `/` redirects to, and the recipient rendered by default. */
  RECIPIENT_SLUG: z
    .string()
    .regex(SLUG, "must be a lowercase slug such as 'ana'")
    .default("ana"),

  /** Public origin of the deployment, used for canonical URLs. */
  NEXT_PUBLIC_SITE_URL: optionalUrl,

  /** Upstash Redis REST endpoint. Required for rate limiting in production. */
  UPSTASH_REDIS_REST_URL: optionalUrl,

  /** Upstash Redis REST token. Required for rate limiting in production. */
  UPSTASH_REDIS_REST_TOKEN: optionalToken,
});

export type Env = z.infer<typeof envSchema>;

/**
 * Parse an environment source into a validated configuration.
 *
 * Throws with one line per invalid variable, naming the variable, so a
 * misconfigured deployment fails immediately and legibly instead of at the
 * moment somebody tries to log in.
 */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);

  if (result.success) {
    return result.data;
  }

  const details = result.error.issues
    .map((issue) => {
      const name = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `  - ${name}: ${issue.message}`;
    })
    .join("\n");

  throw new Error(
    `Invalid environment configuration. Check the following variables:\n${details}`,
  );
}

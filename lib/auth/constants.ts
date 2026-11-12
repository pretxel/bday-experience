/**
 * Shared constants for the access-control layer.
 */

/** Name of the cookie that carries the signed session. */
export const SESSION_COOKIE_NAME = "bday_session";

/** Version of the session payload format. Bump when the shape changes. */
export const SESSION_VERSION = 1;

/** How long a session stays valid, in seconds (7 days). */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/** Length of the random identifier embedded in every session payload. */
export const SESSION_ID_BYTES = 16;

/**
 * Maximum accepted length of the shared access code.
 *
 * Anything longer is rejected before a scrypt derivation is attempted, so an
 * attacker cannot turn the endpoint into a CPU amplifier with a huge payload.
 */
export const MAX_ACCESS_CODE_LENGTH = 128;

/** Minimum accepted length of the shared access code. */
export const MIN_ACCESS_CODE_LENGTH = 1;

/** Cookie name prefix used for the "cleared" variant of the session cookie. */
export const SESSION_COOKIE_ATTRIBUTES = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
} as const;

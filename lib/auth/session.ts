import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import {
  SESSION_ID_BYTES,
  SESSION_MAX_AGE_SECONDS,
  SESSION_VERSION,
} from "./constants";

/**
 * Stateless signed session tokens.
 *
 * A token is `base64url(payload).base64url(hmacSha256(payload, secret))`.
 * There is no server-side session store, so the token survives serverless
 * cold starts and horizontal scaling without any shared state.
 */

export interface SessionPayload {
  /** Format version. */
  v: number;
  /** The slug this session was issued for. */
  slug: string;
  /** Issued at, in seconds since the epoch. */
  iat: number;
  /** Expires at, in seconds since the epoch. */
  exp: number;
  /** Random identifier, so two tokens minted in the same second differ. */
  sid: string;
}

export type SessionFailureReason = "malformed" | "bad_signature" | "expired";

export type SessionVerification =
  | { ok: true; payload: SessionPayload }
  | { ok: false; reason: SessionFailureReason };

const SLUG_PATTERN = /^[a-z0-9-]{1,64}$/;

function sign(encodedPayload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(encodedPayload).digest();
}

/**
 * Create a signed session token for a slug.
 *
 * `now` and `maxAge` are injectable so the behaviour can be tested without
 * waiting for the clock to move.
 */
export function createSessionToken(
  slug: string,
  secret: string,
  options: { now?: number; maxAge?: number } = {},
): string {
  const now = options.now ?? Math.floor(Date.now() / 1000);
  const maxAge = options.maxAge ?? SESSION_MAX_AGE_SECONDS;

  const payload: SessionPayload = {
    v: SESSION_VERSION,
    slug,
    iat: now,
    exp: now + maxAge,
    sid: randomBytes(SESSION_ID_BYTES).toString("hex"),
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const signature = sign(encodedPayload, secret).toString("base64url");

  return `${encodedPayload}.${signature}`;
}

/**
 * Verify a session token.
 *
 * The signature is compared in constant time, and every structural problem
 * (wrong shape, wrong version, bad slug, expired) is reported as a failure
 * rather than thrown.
 */
export function verifySessionToken(
  token: string,
  secret: string,
  options: { now?: number } = {},
): SessionVerification {
  const now = options.now ?? Math.floor(Date.now() / 1000);

  if (typeof token !== "string" || token.length === 0) {
    return { ok: false, reason: "malformed" };
  }

  const separator = token.indexOf(".");
  if (separator <= 0 || separator === token.length - 1) {
    return { ok: false, reason: "malformed" };
  }

  const encodedPayload = token.slice(0, separator);
  const encodedSignature = token.slice(separator + 1);

  let providedSignature: Buffer;
  try {
    providedSignature = Buffer.from(encodedSignature, "base64url");
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (providedSignature.length !== 32) {
    return { ok: false, reason: "bad_signature" };
  }

  const expectedSignature = sign(encodedPayload, secret);
  if (!timingSafeEqual(providedSignature, expectedSignature)) {
    return { ok: false, reason: "bad_signature" };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (!isSessionPayload(payload)) {
    return { ok: false, reason: "malformed" };
  }

  if (payload.exp <= now) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, payload };
}

function isSessionPayload(value: unknown): value is SessionPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<SessionPayload>;

  return (
    typeof candidate.v === "number" &&
    candidate.v === SESSION_VERSION &&
    typeof candidate.slug === "string" &&
    SLUG_PATTERN.test(candidate.slug) &&
    typeof candidate.iat === "number" &&
    Number.isFinite(candidate.iat) &&
    typeof candidate.exp === "number" &&
    Number.isFinite(candidate.exp) &&
    typeof candidate.sid === "string"
  );
}

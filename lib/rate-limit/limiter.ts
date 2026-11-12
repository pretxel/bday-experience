import "server-only";

import { createHash } from "node:crypto";

import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

import { env } from "@/lib/config/env";

/**
 * Rate limiting for the access endpoint.
 *
 * The counter lives in a shared Redis store (Upstash REST, the service behind
 * Vercel KV) because an in-memory counter would reset on every cold start and
 * would be counted separately by every serverless instance. Nothing in this
 * module keeps request state in process memory.
 */

/** Attempts allowed per window, per client and per slug. */
export const ACCESS_LIMIT = 5;

/** Length of the sliding window. */
export const ACCESS_WINDOW = "15 m";

/** Key prefix in the Redis store. */
export const ACCESS_LIMIT_PREFIX = "bday:access";

export interface RateLimitResult {
  /** Whether the request may proceed. */
  allowed: boolean;
  /** Attempts left in the current window. */
  remaining: number;
  /** Seconds until the window resets. */
  retryAfterSeconds: number;
  /** Whether a shared store is actually backing the limiter. */
  configured: boolean;
}

/**
 * Extract the client address from the request headers.
 *
 * `x-forwarded-for` may hold a chain of proxies; the first entry is the
 * original client. Falls back to a constant when nothing is available.
 */
export function extractClientIp(headers: Headers): string {
  const forwarded =
    headers.get("x-vercel-forwarded-for") ??
    headers.get("x-forwarded-for") ??
    headers.get("x-real-ip") ??
    "";

  const first = forwarded.split(",")[0]?.trim() ?? "";

  return first.length > 0 ? first : "unknown";
}

/**
 * Build the identifier used as the limiter key.
 *
 * The raw address is hashed so the store never holds a client IP.
 */
export function buildRateLimitIdentifier(ip: string, slug: string): string {
  const digest = createHash("sha256").update(ip).digest("hex");
  return `${ACCESS_LIMIT_PREFIX}:${digest}:${slug}`;
}

let sharedLimiter: Ratelimit | null = null;

/**
 * Return the shared limiter, or `null` when no store is configured.
 *
 * Only the client object is cached here — never a counter.
 */
function getSharedLimiter(): Ratelimit | null {
  if (sharedLimiter !== null) {
    return sharedLimiter;
  }

  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  sharedLimiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(ACCESS_LIMIT, ACCESS_WINDOW),
    prefix: ACCESS_LIMIT_PREFIX,
    analytics: false,
  });

  return sharedLimiter;
}

/**
 * Check whether an access attempt is allowed.
 *
 * When no store is configured the attempt is allowed, and the result reports
 * `configured: false` so the caller can surface the degraded mode.
 */
export async function checkAccessRateLimit(
  identifier: string,
): Promise<RateLimitResult> {
  const limiter = getSharedLimiter();

  if (limiter === null) {
    return {
      allowed: true,
      remaining: ACCESS_LIMIT,
      retryAfterSeconds: 0,
      configured: false,
    };
  }

  try {
    const result = await limiter.limit(identifier);
    const retryAfterSeconds = Math.max(
      0,
      Math.ceil((result.reset - Date.now()) / 1000),
    );

    return {
      allowed: result.success,
      remaining: result.remaining,
      retryAfterSeconds,
      configured: true,
    };
  } catch (error) {
    // A store outage must not lock the recipient out of their own experience.
    console.error(
      "[birthday-experience] Rate limit check failed; allowing the attempt.",
      error instanceof Error ? error.message : "unknown error",
    );

    return {
      allowed: true,
      remaining: ACCESS_LIMIT,
      retryAfterSeconds: 0,
      configured: false,
    };
  }
}

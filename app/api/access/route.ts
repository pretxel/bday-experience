import { NextResponse } from "next/server";
import { z } from "zod";

import {
  MAX_ACCESS_CODE_LENGTH,
  MIN_ACCESS_CODE_LENGTH,
} from "@/lib/auth/constants";
import { buildSessionCookie } from "@/lib/auth/cookies";
import { issueSessionToken, verifyAccessCode } from "@/lib/auth/credentials";
import { hasContent } from "@/lib/content/loader";
import {
  buildRateLimitIdentifier,
  checkAccessRateLimit,
  extractClientIp,
} from "@/lib/rate-limit/limiter";

/**
 * The access endpoint.
 *
 * The response for an unknown slug, a wrong code and a malformed stored hash
 * is byte-for-byte identical, so an attacker cannot learn anything from the
 * shape of the failure.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const accessSchema = z.object({
  code: z
    .string()
    .min(MIN_ACCESS_CODE_LENGTH)
    .max(MAX_ACCESS_CODE_LENGTH, "the code is too long"),
  slug: z.string().min(1).max(64),
});

const NO_STORE = { "Cache-Control": "no-store" } as const;

/** The single, identical response used for every authentication failure. */
function invalidCredentialsResponse(): NextResponse {
  return NextResponse.json(
    { ok: false, error: "invalid_credentials" },
    { status: 401, headers: NO_STORE },
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_request" },
      { status: 400, headers: NO_STORE },
    );
  }

  const parsed = accessSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_request" },
      { status: 400, headers: NO_STORE },
    );
  }

  const { code, slug } = parsed.data;

  const identifier = buildRateLimitIdentifier(extractClientIp(request.headers), slug);
  const limit = await checkAccessRateLimit(identifier);

  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      {
        status: 429,
        headers: {
          ...NO_STORE,
          "Retry-After": String(Math.max(1, limit.retryAfterSeconds)),
        },
      },
    );
  }

  // `hasContent` is awaited: an un-awaited promise would always be truthy and
  // an unknown slug would be handed a session.
  if (!verifyAccessCode(code) || !(await hasContent(slug))) {
    return invalidCredentialsResponse();
  }

  const response = NextResponse.json({ ok: true }, { headers: NO_STORE });
  response.headers.append("Set-Cookie", buildSessionCookie(issueSessionToken(slug)));

  return response;
}

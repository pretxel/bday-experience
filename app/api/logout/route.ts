import { NextResponse } from "next/server";

import { clearSessionCookie } from "@/lib/auth/cookies";

/**
 * Logout.
 *
 * The response is identical whether or not a session was present, so the
 * endpoint reveals nothing about the visitor's state.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );

  response.headers.append("Set-Cookie", clearSessionCookie());

  return response;
}

import "server-only";

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { env } from "@/lib/config/env";
import { isValidSlug } from "@/lib/slug";

import { SESSION_COOKIE_NAME } from "./constants";
import { verifySessionToken, type SessionPayload } from "./session";

/**
 * Server-side session enforcement.
 *
 * The check lives here rather than in middleware because `scrypt` and the
 * Node crypto primitives are unavailable on the Edge runtime. There is
 * therefore exactly one implementation of "is this session valid", and no
 * chance of the edge and the server disagreeing.
 */

/**
 * Return the session for a slug, or `null` when there is no valid session.
 *
 * A session issued for a different slug is treated as no session at all.
 */
export async function getSession(
  slug: string,
): Promise<SessionPayload | null> {
  if (!isValidSlug(slug)) {
    return null;
  }

  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const result = verifySessionToken(token, env.SESSION_SECRET);

  if (!result.ok || result.payload.slug !== slug) {
    return null;
  }

  return result.payload;
}

/**
 * Require a valid session, redirecting to the access gate otherwise.
 *
 * IMPORTANT: layouts and pages render in parallel in the App Router, so a
 * guard in the layout alone is not enough to stop a page from loading its
 * private data — the page would still load the content and serialise it into
 * the redirect response. Every page that reads private content must therefore
 * call this itself *before* touching the content loader.
 */
export async function requireSession(slug: string): Promise<SessionPayload> {
  if (!isValidSlug(slug)) {
    notFound();
  }

  const session = await getSession(slug);

  if (session === null) {
    // `slug` has been validated above, so this can only ever be a local path.
    redirect(`/${slug}`);
  }

  return session;
}

import { notFound } from "next/navigation";

/**
 * The root path.
 *
 * It does not redirect anywhere: the experience lives at a random, unguessable
 * slug, and pointing `/` at it would give the location away to anyone who
 * typed the domain. Whoever the experience is for opens the full link.
 */

/**
 * The page is rendered per request on purpose.
 *
 * A statically prerendered page cannot carry the per-request CSP nonce: the
 * HTML is baked at build time, so every inline script in it is blocked by
 * the policy and React never hydrates. Rendering it dynamically puts the
 * nonce in the markup and the 404 actually appears.
 */
export const dynamic = "force-dynamic";

export default function RootPage(): never {
  notFound();
}

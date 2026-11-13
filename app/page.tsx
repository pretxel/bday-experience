import { notFound } from "next/navigation";

/**
 * The root path.
 *
 * It does not redirect anywhere: the experience lives at a random, unguessable
 * slug, and pointing `/` at it would give the location away to anyone who
 * typed the domain. Whoever the experience is for opens the full link.
 */
export default function RootPage(): never {
  notFound();
}

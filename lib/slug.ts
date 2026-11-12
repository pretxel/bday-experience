import "server-only";

import path from "node:path";

/**
 * Slug handling.
 *
 * A slug is the recipient identifier that appears in the URL. It is used to
 * build a filesystem path, so it is validated against a strict pattern before
 * it is ever allowed to touch the disk, and the resolved path is additionally
 * checked to be inside the content directory.
 */

const SLUG_PATTERN = /^[a-z0-9-]{1,64}$/;

/** True when the value is a well-formed slug. */
export function isValidSlug(slug: unknown): slug is string {
  return typeof slug === "string" && SLUG_PATTERN.test(slug);
}

/** Absolute path of the directory that holds the Markdown content. */
export function contentDirectory(): string {
  return path.join(process.cwd(), "content");
}

/**
 * Resolve the Markdown file for a slug.
 *
 * Returns `null` when the slug is malformed or when the resolved path would
 * escape the content directory.
 */
export function resolveContentPath(slug: string): string | null {
  if (!isValidSlug(slug)) {
    return null;
  }

  const directory = path.resolve(contentDirectory());
  const target = path.resolve(path.join(directory, `${slug}.md`));

  if (target !== directory && !target.startsWith(directory + path.sep)) {
    return null;
  }

  return target;
}

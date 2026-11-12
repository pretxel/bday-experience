import "server-only";

import { access, readFile } from "node:fs/promises";
import { cache } from "react";

import matter from "gray-matter";

import { resolveContentPath } from "@/lib/slug";
import { resolvePlaylistEmbedUrl } from "@/lib/spotify/url";

import { renderMarkdownBlocks } from "./render";
import { frontmatterSchema } from "./schema";

/**
 * Loads the Markdown content for a recipient.
 *
 * The loader never throws: it returns a discriminated result so every caller
 * is forced to handle the failure path. That is what makes the graceful
 * degradation reliable rather than accidental.
 */

/** Why a content file could not be loaded. */
export type ContentFailureReason =
  | "not_found"
  | "parse_error"
  | "invalid_frontmatter";

export interface ExperienceContent {
  /** The slug this content belongs to. */
  slug: string;
  title: string;
  recipient: string;
  dateLabel: string;
  subtitle: string | null;
  /** Canonical Spotify embed URL, or `null` when no playlist is configured. */
  spotifyEmbedUrl: string | null;
  /** Sanitized HTML for the letter body, as one string. */
  bodyHtml: string;
  /** The letter body split into top-level sanitized blocks. */
  bodyBlocks: string[];
}

export type ContentResult =
  | { ok: true; content: ExperienceContent }
  | { ok: false; reason: ContentFailureReason };

async function loadContent(slug: string): Promise<ContentResult> {
  const filePath = resolveContentPath(slug);

  if (filePath === null) {
    return { ok: false, reason: "not_found" };
  }

  let source: string;

  try {
    source = await readFile(filePath, "utf8");
  } catch {
    return { ok: false, reason: "not_found" };
  }

  let data: unknown;
  let body: string;

  try {
    const parsed = matter(source);
    data = parsed.data;
    body = parsed.content;
  } catch {
    console.error(
      `[birthday-experience] Could not parse the frontmatter of content/${slug}.md.`,
    );
    return { ok: false, reason: "parse_error" };
  }

  const frontmatter = frontmatterSchema.safeParse(data);

  if (!frontmatter.success) {
    console.error(
      `[birthday-experience] Invalid frontmatter in content/${slug}.md:`,
      frontmatter.error.issues.map((issue) =>
        `${issue.path.join(".") || "(root)"}: ${issue.message}`,
      ),
    );
    return { ok: false, reason: "invalid_frontmatter" };
  }

  let bodyHtml = "";
  let bodyBlocks: string[] = [];

  try {
    bodyBlocks = await renderMarkdownBlocks(body);
    bodyHtml = bodyBlocks.join("");
  } catch (error) {
    console.error(
      `[birthday-experience] Could not render content/${slug}.md:`,
      error instanceof Error ? error.message : "unknown error",
    );
    return { ok: false, reason: "parse_error" };
  }

  return {
    ok: true,
    content: {
      slug,
      title: frontmatter.data.title,
      recipient: frontmatter.data.recipient,
      dateLabel: frontmatter.data.dateLabel,
      subtitle: frontmatter.data.subtitle ?? null,
      spotifyEmbedUrl: resolvePlaylistEmbedUrl({
        spotifyUrl: frontmatter.data.spotifyUrl,
        playlistId: frontmatter.data.playlistId,
      }),
      bodyHtml,
      bodyBlocks,
    },
  };
}

/**
 * Whether a slug has a content file.
 *
 * Used by the access endpoint so a session is never issued for a recipient
 * that does not exist, without revealing that fact to the caller.
 */
export async function hasContent(slug: string): Promise<boolean> {
  const filePath = resolveContentPath(slug);

  if (filePath === null) {
    return false;
  }

  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the content for a slug.
 *
 * Memoised for the duration of a request so the file is read and parsed at
 * most once, even when several components ask for the same content.
 */
export const getContent = cache(loadContent);

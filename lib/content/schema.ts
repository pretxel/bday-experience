import { z } from "zod";

/**
 * The frontmatter contract for a content file.
 *
 * Every field is optional at the type level but the required ones are
 * enforced here, so a malformed file fails with a precise reason instead of
 * rendering a half-empty page.
 */
export const frontmatterSchema = z.object({
  /** Headline shown on the welcome page. */
  title: z.string().trim().min(1, "title must not be empty"),

  /** The person the experience is for. */
  recipient: z.string().trim().min(1, "recipient must not be empty"),

  /** Short line describing the occasion, e.g. "Tu día especial". */
  dateLabel: z.string().trim().min(1, "dateLabel must not be empty"),

  /** Optional line under the title. */
  subtitle: z.string().trim().min(1).optional(),

  /** Spotify playlist URL — either the regular or the embed form. */
  spotifyUrl: z.string().trim().min(1).optional(),

  /** Spotify playlist id, used when the URL form is inconvenient. */
  playlistId: z.string().trim().min(1).optional(),
});

export type Frontmatter = z.infer<typeof frontmatterSchema>;

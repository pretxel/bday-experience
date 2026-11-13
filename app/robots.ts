import type { MetadataRoute } from "next";

/**
 * `robots.txt`.
 *
 * The whole experience is private, so every crawler is asked to stay away.
 *
 * This is belt and braces rather than the only line of defence: the
 * `X-Robots-Tag: noindex, nofollow, noarchive` header is sent with every
 * response, and the root layout emits the matching `robots` metadata. A
 * crawler that ignores `robots.txt` still receives a `noindex` header, and a
 * crawler that ignores headers still receives the `robots.txt` instruction.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: "/",
      },
    ],
  };
}

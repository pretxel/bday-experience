import { NextResponse, type NextRequest } from "next/server";

/**
 * Content Security Policy.
 *
 * The policy is nonce-based: a fresh nonce is generated for every response
 * and Next.js picks it up from the request header, applying it to the
 * scripts and styles it injects. That keeps `script-src` free of
 * `'unsafe-inline'`, so an injected script cannot run even if the Markdown
 * sanitiser were ever bypassed.
 *
 * The policy is intentionally *not* set in `next.config.ts`: the nonce has to
 * be generated per request, and the response header has to match the request
 * header exactly.
 */

function buildContentSecurityPolicy(nonce: string): string {
  /*
   * React's development build uses `eval()` to reconstruct call stacks, so the
   * development policy has to allow it. The production policy never does:
   * `NODE_ENV` is inlined at build time, so this branch disappears entirely
   * from a production bundle.
   */
  const isDevelopment = process.env.NODE_ENV === "development";

  return [
    "default-src 'self'",
    /*
     * The nonce covers the inline bootstrap scripts, and `'self'` covers the
     * chunks, which are all served from this origin.
     *
     * `'strict-dynamic'` is deliberately NOT used. It makes the browser
     * ignore `'self'`, and the Turbopack HMR client is injected as a script
     * tag without a nonce — so it gets blocked, its dynamic import fails
     * with a ChunkLoadError, and the dev runtime answers with a full page
     * reload. That produced an endless reload loop in development.
     */
    `script-src 'self' 'nonce-${nonce}'${
      isDevelopment ? " 'unsafe-eval'" : ""
    }`,
    // Inline styles are still needed for the ambient background and for the
    // reveal delays.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    // The Spotify embed is the only third-party frame we allow.
    "frame-src https://open.spotify.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // The private experience must never be embedded elsewhere.
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export default function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const policy = buildContentSecurityPolicy(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("Content-Security-Policy", policy);

  return response;
}

export const config = {
  matcher: [
    {
      /*
       * Everything that renders HTML, except the static assets and the API
       * routes, whose JSON responses need no policy.
       */
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};

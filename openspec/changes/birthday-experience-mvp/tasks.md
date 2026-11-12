## 1. Project Scaffolding and Toolchain

- [x] 1.1 Scaffold the Next.js application with `create-next-app` (App Router, TypeScript, ESLint, Tailwind, `src/` disabled, import alias `@/*`), in the repository root.
- [x] 1.2 Enable TypeScript strict mode and add `noUncheckedIndexedAccess` plus `exactOptionalPropertyTypes` to `tsconfig.json`; verify `npm run typecheck` passes on the empty scaffold.
- [x] 1.3 Install runtime dependencies: `framer-motion`, `gray-matter`, `remark`, `remark-parse`, `remark-rehype`, `rehype-sanitize`, `rehype-stringify`, `unist-util-visit`, `zod`, `@upstash/redis`, `@upstash/ratelimit`, plus `unified` and `server-only`.
- [x] 1.4 Install dev dependencies: `vitest`, `puppeteer-core` for the browser verification, and add the `test` script to `package.json`.
- [x] 1.5 Configure `vitest.config.mts` to include `tests/**/*.test.ts` with a Node environment, aliasing `@` to the project root and `server-only` to its no-op build.
- [x] 1.6 Configure `next.config.ts` with `outputFileTracingIncludes` tracing `./content/**/*` into the serverless bundle, plus the static security headers from task 12.1.
- [x] 1.7 Establish the directory skeleton (`app/`, `components/`, `content/`, `lib/`, `scripts/`, `tests/`) exactly as described in design.md §17.
- [x] 1.8 Verify: `npm run typecheck && npm run lint && npm run build` all pass on the scaffold.

## 2. Environment Configuration

- [x] 2.1 Implement `lib/config/env.ts` with a zod schema covering `ACCESS_CODE_HASH`, `ACCESS_CODE_SALT`, `SESSION_SECRET`, `RECIPIENT_SLUG` (default `ana`), `NEXT_PUBLIC_SITE_URL`, `UPSTASH_REDIS_REST_URL`, and `UPSTASH_REDIS_REST_TOKEN`.
- [x] 2.2 Make the module fail fast on a missing or malformed required variable, naming the offending variable in the error, and export a frozen typed configuration object.
- [x] 2.3 Ensure no secret is referenced from a client component; verified with a deliberate client-side read, which fails the build with `'server-only' cannot be imported from a Client Component module`.
- [x] 2.4 Implement `scripts/hash-code.mjs` that accepts a plaintext code (from an argument or a hidden prompt), generates a random salt, derives the scrypt hash, and prints `ACCESS_CODE_HASH` and `ACCESS_CODE_SALT` without persisting the plaintext.
- [x] 2.5 Write `.env.example` documenting every variable with a purpose comment and an example value, plus `.env.local` for local development using values produced by task 2.4.
- [x] 2.6 Verify: `npm run typecheck` passes and `node scripts/hash-code.mjs "test-code"` prints a salt/hash pair that verifies successfully.

## 3. Authentication Primitives

- [x] 3.1 Implement `lib/auth/constants.ts` with the session cookie name, schema version, session lifetime, and access-code maximum length.
- [x] 3.2 Implement `lib/auth/password.ts`: `hashCode(code, salt)` using `crypto.scrypt` with a fixed cost and key length, and `verifyCode(code, salt, expectedHash)` that normalizes both sides to a fixed-length digest and compares them with `crypto.timingSafeEqual`.
- [x] 3.3 Handle malformed, missing, or wrongly-sized stored hashes in `verifyCode` by returning `false` rather than throwing.
- [x] 3.4 Implement `lib/auth/session.ts`: `createSessionToken({ slug })` producing `base64url(payload).base64url(hmacSha256)`, with the payload carrying version, slug, issued-at, expiry, and a random session id.
- [x] 3.5 Implement `verifySessionToken(token)` that validates structure, compares the HMAC with `crypto.timingSafeEqual`, and checks the expiry, returning a typed result instead of throwing.
- [x] 3.6 Implement `lib/auth/cookies.ts` with `buildSessionCookie(token)` and `clearSessionCookie()` setting `HttpOnly`, `SameSite=Lax`, `Path=/`, an explicit `Max-Age`, and `Secure` in production.
- [x] 3.7 Implement `lib/slug.ts` with `isValidSlug` (pattern `^[a-z0-9-]{1,64}$`) and `resolveContentPath` that rejects any resolved path outside the content directory.
- [x] 3.8 Write unit tests covering: correct code verifies, wrong code fails, wrong salt fails, malformed hash returns false, tampered payload fails, expired session fails, session for another slug fails, and valid session passes.
- [x] 3.9 Verify: `npm run test && npm run typecheck` pass with the new tests green.

## 4. Rate Limiting

- [x] 4.1 Implement `lib/rate-limit/limiter.ts` using `@upstash/ratelimit` with a sliding window over the Upstash Redis REST client, keyed by a hashed client IP plus the target slug.
- [x] 4.2 Extract the client IP from `x-forwarded-for` / `x-vercel-forwarded-for` with a safe fallback, and hash it before using it as a limiter key.
- [x] 4.3 Return a typed result (`allowed`, `remaining`, `retryAfterSeconds`) and never rely on in-memory state across requests.
- [x] 4.4 When the Redis environment variables are absent, log a prominent startup warning, allow access, and expose a `configured` flag so the API layer can report the degraded mode.
- [x] 4.5 Write a unit test asserting that the limiter never uses a module-level in-memory counter and that an unconfigured limiter returns `allowed: true` with a warning flag.
- [x] 4.6 Verify: `npm run test && npm run typecheck` pass.

## 5. Markdown Content Pipeline

- [x] 5.1 Implement `lib/content/schema.ts` with a zod frontmatter schema: `title`, `recipient`, `dateLabel` required strings; `spotifyUrl`, `playlistId`, `subtitle` optional.
- [x] 5.2 Implement `lib/content/loader.ts` that validates the slug, resolves the path via `lib/slug.ts`, reads `content/<slug>.md`, and returns a discriminated union `{ ok: true, content } | { ok: false, reason }` with reasons `not_found`, `parse_error`, and `invalid_frontmatter`.
- [x] 5.3 Wrap the loader with React `cache()` so a file is read and parsed at most once per request.
- [x] 5.4 Implement `lib/content/render.ts`: `gray-matter` split, then `remark-parse` → `remark-rehype` with `allowDangerousHtml: false` → `rehype-sanitize` with an explicit tag/attribute allow-list → `rehype-stringify`, plus `renderMarkdownBlocks` which splits the sanitized tree into top-level blocks for the staggered reveal.
- [x] 5.5 Implement `lib/spotify/url.ts` to extract a playlist id from either Spotify URL form with a strict id pattern and canonicalize it to the embed URL; return `null` for anything else.
- [x] 5.6 Add `content/ana.md` with the frontmatter contract and a sample letter body.
- [x] 5.7 Write unit tests covering: valid content loads, missing file returns `not_found`, invalid frontmatter returns `invalid_frontmatter`, a `<script>` tag is stripped, an `onclick` attribute is stripped, a `javascript:` href is neutralized, and both Spotify URL forms canonicalize correctly.
- [x] 5.8 Verify: `npm run test && npm run typecheck` pass.

## 6. API Route Handlers

- [x] 6.1 Implement `POST /api/access` with `runtime = 'nodejs'` and `dynamic = 'force-dynamic'`: validate the `{ code, slug }` body with zod, reject oversized codes before hashing, and return HTTP 400 for a malformed body.
- [x] 6.2 In the handler, apply the rate limiter before verification; return HTTP 429 with `Retry-After` when the limit is exceeded.
- [x] 6.3 Verify the code with `verifyCode`, and on success set the session cookie with `Cache-Control: no-store` and return `{ ok: true }`.
- [x] 6.4 Return HTTP 401 with `{ ok: false, error: 'invalid_credentials' }` for every failure mode — unknown slug, wrong code, malformed stored hash — using one identical response builder.
- [x] 6.5 Implement `POST /api/logout` that always clears the cookie and returns an identical response whether or not a session was present.
- [x] 6.6 Verify: `npm run typecheck && npm run lint` pass and a manual `curl` against `next start` confirms the 400/401/429/200 behaviors and the `Set-Cookie` attributes.

## 7. Routing and Layout Shell

- [x] 7.1 Implement `app/layout.tsx` as the root layout with `next/font/google` loading Cormorant Garamond (display) and Inter (sans), global metadata, and `robots: { index: false, follow: false }`.
- [x] 7.2 Implement `app/page.tsx` to redirect `/` to `/${RECIPIENT_SLUG}`.
- [x] 7.3 Implement `app/[slug]/layout.tsx` as the public shell that renders the ambient background and the children, without any session guard.
- [x] 7.4 Implement `app/[slug]/(protected)/layout.tsx` with the server-side session guard that calls `verifySessionToken` for the requested slug and `redirect`s to `/${slug}` on failure.
- [x] 7.5 Implement `app/[slug]/(protected)/loading.tsx` and `app/[slug]/(protected)/error.tsx` with a themed loading state and a generic error state that exposes no internal detail.
- [x] 7.6 Implement `app/[slug]/not-found.tsx` and the root `not-found.tsx` with a graceful in-theme not-found page.
- [x] 7.7 Implement the shared navigation component with the current-page indicator and links to `bienvenida`, `playlist`, and `carta` for the active slug.
- [x] 7.8 Verify: `npm run build` passes and, in `next start`, an unauthenticated request to a protected page redirects to the gate while the gate itself renders.

## 8. Access Gate

- [x] 8.1 Implement `components/access/AccessGate.tsx` as a client component with a labeled code field, submit handling against `/api/access`, and a disabled state while the request is in flight.
- [x] 8.2 On success, redirect the visitor to `/${slug}/bienvenida`; on failure, display a generic message identical for every failure mode.
- [x] 8.3 Implement `app/[slug]/page.tsx` to render the gate with a themed, romantic presentation and the recipient slug in the copy.
- [x] 8.4 Ensure the gate form is operable by keyboard, has an associated label, and shows a focus-visible ring.
- [x] 8.5 Verify: `npm run typecheck && npm run lint` pass and the gate can be completed end to end in `next start` with the correct code.

## 9. Private Pages

- [x] 9.1 Implement `app/[slug]/(protected)/bienvenida/page.tsx` rendering the greeting, the recipient name from frontmatter, the date label, and a link to the letter.
- [x] 9.2 Implement `app/[slug]/(protected)/playlist/page.tsx` rendering the Spotify embed in a pre-sized container using the canonicalized embed URL.
- [x] 9.3 Render a styled "playlist unavailable" placeholder when the Spotify URL is missing or invalid.
- [x] 9.4 Implement `app/[slug]/(protected)/carta/page.tsx` rendering the sanitized letter HTML via `dangerouslySetInnerHTML` inside a server component, with the letter typography styled in `globals.css`.
- [x] 9.5 Handle every loader failure reason with a graceful fallback that shows no raw error text.
- [x] 9.6 Verify: `npm run build` passes and each of the three pages renders its content with a valid session.

## 10. Design System and Ambient Background

- [x] 10.1 Define the Tailwind v4 `@theme` tokens in `app/globals.css`: the warm plum/blush/cream/gold palette, the display and sans font variables, the spacing scale, and the shared easing curves.
- [x] 10.2 Implement `components/ambient/AmbientBackground.tsx` as layered radial-gradient washes plus a CSS grain overlay, with `pointer-events: none` and no raster assets.
- [x] 10.3 Implement the ambient drift as a slow CSS keyframe animation with a duration long enough to read as ambient rather than animated.
- [x] 10.4 Implement the shared page container with a readable maximum width, centered, with the responsive spacing used by every page.
- [x] 10.5 Style the access form, navigation, letter body, and playlist panel against the theme tokens, including focus-visible and hover states.
- [x] 10.6 Verify: `npm run typecheck && npm run lint && npm run build` pass and the pages render legibly at 360px, 768px, and 1440px widths.

## 11. Motion Layer

- [x] 11.1 Implement `components/motion/MotionProvider.tsx` as a client component that defines shared variants and transition timing for the experience.
- [x] 11.2 Implement `components/motion/Reveal.tsx` with a staggered entrance used by the welcome and playlist panels. The reveal is CSS-driven on purpose: Framer Motion renders its `initial` state inline, so a `opacity: 0` initial state would leave the content invisible whenever the client bundle does not run.
- [x] 11.3 Implement `components/motion/PageTransition.tsx` providing the cross-fade and subtle vertical movement between private pages.
- [x] 11.4 Implement the letter's staggered block reveal, keeping the rendered text identical to the sanitized output.
- [x] 11.5 Gate every animation behind `useReducedMotion()`, collapsing entrances to a plain fade and disabling the ambient drift.
- [x] 11.6 Ensure all animated content is visible when animation does not run: the server-rendered state is the final state, so a failed or interrupted animation leaves the content readable.
- [x] 11.7 Verify: `npm run typecheck && npm run lint && npm run build` pass, and with `prefers-reduced-motion: reduce` emulated the pages show no transform or continuous animation.

## 12. Security Headers, Metadata, and Noindex

- [x] 12.1 Add the security headers in `next.config.ts`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy`, and `X-Robots-Tag: noindex, nofollow, noarchive`.
- [x] 12.1a Implement the Content-Security-Policy in `proxy.ts` with a per-request nonce, `script-src 'self' 'nonce-…' 'strict-dynamic'`, `style-src 'self' 'unsafe-inline'`, `frame-src https://open.spotify.com`, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'` and `form-action 'self'`. A static policy without a nonce blocks Next.js's own inline scripts and the application never hydrates.
- [x] 12.2 Set `X-Robots-Tag: noindex, nofollow` on all responses and export `robots: { index: false, follow: false }` from the root layout.
- [x] 12.3 Confirm the Spotify embed is permitted by the CSP and that no other third-party origin is allowed to frame or script the app.
- [x] 12.4 Verify: `npm run build` passes, a browser session reports no Content-Security-Policy violations, and `curl -I` on a private page shows every header, including the absence of the private content in any header value.

## 13. Test Suite

- [x] 13.1 Complete the auth unit tests from task 3.8, including constant-time comparison and slug-binding cases.
- [x] 13.2 Complete the content pipeline tests from task 5.7, including the sanitization cases.
- [x] 13.3 Add a slug validation test covering traversal, uppercase, spaces, and over-length inputs.
- [x] 13.4 Add a session-cookie attribute test asserting `HttpOnly`, `SameSite=Lax`, `Path=/`, an explicit expiry, and `Secure` in production mode.
- [x] 13.5 Add a test asserting the access endpoint returns a byte-identical body for an unknown slug and for a wrong code.
- [x] 13.6 Verify: `npm run test` passes with no skipped or todo tests, and `npm run typecheck && npm run lint` remain green.

## 14. Documentation and Deployment Readiness

- [x] 14.1 Write `README.md` covering the local setup, the hash-generation script, the full environment variable reference, and the required production rate-limit store.
- [x] 14.2 Document the Vercel deployment steps, including adding the Upstash Redis integration, setting every environment variable, and verifying that a private page renders after the first deploy.
- [x] 14.3 Document the Vercel Firewall rate-limiting rule as recommended defense in depth and the code-rotation procedure.
- [x] 14.4 Document the content authoring format: frontmatter fields, Markdown features, the Spotify URL forms, and what happens on an invalid file.
- [x] 14.5 Add a `.gitignore` that excludes `.env`, `.env.local`, `node_modules`, and build output while keeping `.env.example` tracked.
- [x] 14.6 Verify the full local flow end to end in `next start`: gate → wrong code → correct code → welcome → playlist → letter → logout → gate.
- [x] 14.7 Verify: `npm run typecheck && npm run lint && npm run test && npm run build` all pass from a clean install.

## Context

This repository currently contains only the OpenSpec workflow scaffolding — there is no application code, no starter template, and no dependency manifest. The change is therefore greenfield: it introduces the complete `Birthday Experience` application.

The product is a private, single-recipient birthday site. One visitor opens a personalized URL (`/[slug]`), unlocks it with a shared secret code, and moves through three intimate pages: a welcome, a Spotify playlist, and a handwritten letter. Content is authored in Markdown so it can be edited without touching application code.

The hard constraints come from the brief and are non-negotiable:

- No Supabase, no PostgreSQL or any other database, no separate Fastify backend, no external CMS.
- No mutable state written to the filesystem at runtime.
- Private Markdown must not be reachable through the `public/` directory.
- Markdown must be parsed and rendered on the server only, and the resulting HTML must be sanitized.
- One shared access code; only a salted scrypt hash lives in environment variables.
- Sessions are HMAC-SHA256 signed cookies: HttpOnly, Secure in production, SameSite=Lax, expiring.
- Constant-time comparison for every hash and signature check; generic authentication error messages.
- Rate limiting must be Vercel-compatible — in-memory counters in a serverless function are not acceptable.
- Private routes validate the session server-side and emit `noindex` metadata.
- The result must deploy cleanly to Vercel serverless functions.

Stakeholders are effectively two: the person building it (maintainer) and the single recipient. "Intimate and elegant" is a hard product requirement, not a nice-to-have, so motion and visual design are first-class concerns rather than polish at the end.

## Goals / Non-Goals

**Goals:**

- A single Next.js App Router application, TypeScript strict mode, that runs as Vercel serverless functions with no external runtime services beyond an optional Redis-backed rate limiter.
- A working access flow: code entry → server-side verification → signed session cookie → protected pages → logout.
- A Markdown content pipeline that is server-only, sanitized, frontmatter-validated, and degrades gracefully on missing or malformed content.
- Slug-driven routing where adding a second recipient is a file addition and an env var, not a code change.
- A visually considered romantic experience: typography, palette, ambient background, and restrained Framer Motion transitions, honoring `prefers-reduced-motion`.
- Deployment readiness: documented env vars, a script to generate the code hash, security headers, and a passing `typecheck` + `lint` + `build`.

**Non-Goals:**

- Multi-user accounts, registration, password reset, roles, or an admin interface.
- Any persistence layer. There is no database, no KV store for content, and no filesystem writes at runtime.
- A second backend service. Route Handlers in the Next.js app are the only server surface.
- A CMS. Markdown files in git are the editing workflow.
- Rich audio/video beyond the Spotify embed iframe.
- Analytics, A/B testing, or third-party tracking beyond what the Spotify embed itself loads.

## Decisions

### 1. One Next.js App Router application, no companion backend

**Decision.** The entire product lives in a single Next.js App Router app. Route Handlers under `app/api/**/route.ts` are the only server surface; server components are the primary rendering model.

**Rationale.** The brief forbids a separate Fastify backend and any database. A single app removes the cross-service auth boundary entirely — there is no second origin to defend, no session to share across services, and no network hop. Vercel deploys the app as serverless functions with no additional infrastructure.

**Alternatives considered.** *Fastify + Next split* — rejected by the brief and it would force a shared-session mechanism across two origins. *Supabase* — rejected by the brief; also unnecessary, since there is exactly one recipient and one secret.

### 2. Slug as configuration, content addressed by filename

**Decision.** The recipient slug comes from `RECIPIENT_SLUG` and is a random eight-character key (`scripts/generate-slug.mjs`). `content/<slug>.md` holds that recipient's content. `/` responds with a not-found page rather than redirecting.

**Rationale.** The slug must be changeable without duplicating logic, and content must not live in `public/`. Keying the Markdown filename by slug makes a second recipient a pure file addition plus an env change, with no database.

Making the slug random is what makes the URL itself unguessable: a slug like `ana` gives the recipient's name away to anyone who guesses the domain, and it makes the link something that has to be shared carefully. Eight characters from a 30-symbol alphabet is roughly 6.5 × 10¹¹ possibilities.

Because of that, `/` deliberately does not redirect to the slug. A redirect would hand the location to anyone who typed the root domain, which defeats the point of a random key. The root is a dead end that says the experience has its own address, and the only way in is the full link.

**Alternatives considered.** *A single `content/index.md`* — rejected; it cannot support multiple slugs. *Slug embedded in a JSON manifest* — rejected as redundant, since the content file's frontmatter already carries the metadata. *Readable slugs like `ana`* — rejected; they leak the name and are guessable.

### 3. Access code stored as a salted scrypt hash, never as plaintext

**Decision.** `crypto.scrypt` (Node's built-in, no native dependency) derives a key from the submitted code and a per-deployment random salt. `ACCESS_CODE_HASH` and `ACCESS_CODE_SALT` are the only code-related values in the environment. A `scripts/hash-code.mjs` helper prints a ready-to-paste pair so the plaintext code never has to be written into an env file or committed.

**Rationale.** The brief mandates a salted password hash in env vars. scrypt is memory-hard and ships in Node's standard library, so there is no `bcrypt`/`argon2` native build step to fail on Vercel. Because the salt is per-deployment and stored alongside the hash, a stolen `.env` cannot be attacked with a precomputed table.

**Comparisons.** *`bcrypt`* — well understood, but adds a native module or a WASM shim; no advantage here for a single low-entropy-secret gate. *Plain SHA-256 of the code* — fast, which is exactly wrong for an attacker with a wordlist. *Plaintext comparison* — rejected outright; it would place the code in the environment.

### 4. Stateless signed session cookie (HMAC-SHA256)

**Decision.** On successful verification the server issues a cookie `bday_session` whose value is `base64url(payload).base64url(hmacSha256(payload, SESSION_SECRET))`. The payload is a compact JSON object carrying the schema version, the slug the session was issued for, the issue time, the expiry, and a random session id. The cookie is `HttpOnly`, `SameSite=Lax`, `Secure` in production, `Path=/`, and bounded by an explicit `maxAge`.

**Rationale.** A stateless signed cookie needs no server-side session store — no database, no Redis — and therefore survives Vercel's stateless function instances and cold starts. Binding the payload to the slug means a session minted for one recipient cannot be replayed against another. The expiry is enforced at verification time, not merely advisory on the cookie.

**Comparisons.** *Server-side sessions with a store* — rejected, since it reintroduces shared state. *JWT library* — a dependency that would implement exactly this payload-plus-HMAC scheme, with a wider attack surface than necessary. *Opaque random token* — rejected, since the server would have to remember it.

### 5. Constant-time comparison everywhere it matters

**Decision.** Every secret comparison uses `crypto.timingSafeEqual` on fixed-length buffers. Hashes are normalized to a fixed length (SHA-256 of the derived key, hex-encoded) before comparison, so the buffers are always the same size and `timingSafeEqual` never throws on a length mismatch. Signature verification compares the raw 32-byte HMAC digests.

**Rationale.** Length-normalizing before comparing is the standard way to satisfy both `timingSafeEqual`'s equal-length precondition and the constant-time requirement. Comparing raw scrypt outputs directly is not viable — the lengths differ.

### 6. Auth enforced in server components and Route Handlers, not in middleware

**Decision.** The protected pages live in a route group `app/[slug]/(protected)/`. Its `layout.tsx` is a server component that validates the session and redirects to `app/[slug]/page.tsx` when the session is missing or invalid. **Every private page additionally calls `requireSession()` itself, before it loads any content.** Route Handlers validate independently.

**Rationale.** Middleware runs on the Edge runtime, where `node:crypto`'s `scrypt` is unavailable, so code verification could not live there. Keeping all verification in one Node-runtime module means there is a single implementation of "what is a valid session" — no chance of the middleware and the server disagreeing.

The page-level check is not redundant, and it was added because implementation exposed a real leak. **Layouts and pages render in parallel in the App Router**, so a guard in the layout alone does not stop the page from loading its data: the page still read the content and serialised it into the body of the redirect response, which an unauthenticated visitor could read. Because each page now awaits `requireSession()` *before* calling the content loader, the private data is never read — let alone serialised — for an unauthenticated request. The layout guard remains as the single place that owns the redirect and the navigation chrome.

**Comparisons.** *Middleware for auth* — rejected, as described; Edge crypto limits are real and would force a second implementation. *Per-page checks only* — rejected; it is error-prone, since every new page must remember to call the guard. *Both* — chosen: the layout owns the redirect, the pages own the data boundary.

### 7. Rate limiting through a Vercel-compatible Redis store

**Decision.** The access endpoint is rate limited per client IP using a sliding-window limiter backed by Upstash Redis over REST (the same service behind Vercel KV), configured by `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. A `@upstash/ratelimit` limiter allows a small number of attempts per window; exceeding it returns `429` with a `Retry-After` header and the same generic body as any other auth failure. If the Redis environment variables are absent, the endpoint still works but the deployment logs a loud warning at startup and the README marks the configuration as required before production.

**Rationale.** An in-memory counter resets on every cold start and is per-instance, so it would be useless on Vercel. A shared store is the only correct answer for serverless. Upstash's REST API needs no long-lived TCP connection, which suits short-lived functions and can be added to a Vercel project in one click.

**Alternatives considered.** *In-memory `Map` in the module scope* — explicitly rejected by the brief and ineffective on serverless. *Vercel Firewall / WAF rate-limiting rules* — a genuine Vercel-native option, but it lives in dashboard configuration rather than the repository, so it cannot be verified by the build and would silently do nothing on other platforms. It is recommended as defense in depth in the README, not as the primary mechanism.

### 8. Markdown pipeline: parse, convert, sanitize — no raw HTML

**Decision.** `content/<slug>.md` is split into frontmatter and body by `gray-matter`. The body is converted with `remark-parse` → `remark-rehype` (with `allowDangerousHtml: false`, so raw HTML in the Markdown is discarded) → `rehype-sanitize` with an explicit allow-list → `rehype-stringify`. The result is a sanitized HTML string rendered on the server via `dangerouslySetInnerHTML`.

**Rationale.** Dropping raw HTML at the `remark-rehype` stage means a Markdown file cannot inject a `<script>` even before sanitization runs; `rehype-sanitize` is then the second, independent line of defense. This ordering is safer than sanitizing an HTML string after the fact, and it produces exactly the tag set the Markdown pipeline can generate — no attribute allow-list guesswork for arbitrary raw HTML.

**Comparisons.** *`remark-html` + `sanitize-html`* — equivalent in effect but requires sanitizing an HTML string produced from raw HTML, which is the weaker ordering. *Client-side rendering* — rejected, because the brief requires server-side rendering and it would ship private content to the browser before the session is checked.

### 9. Frontmatter validated with zod into a typed result

**Decision.** A zod schema describes the frontmatter: `title` (required string), `recipient` (required string), `dateLabel` (required string), `spotifyUrl` (optional URL), plus optional `playlistId` and `subtitle`. The loader returns a discriminated union — `{ ok: true, content }` or `{ ok: false, reason }` — instead of throwing across the module boundary.

**Rationale.** An explicit result type forces every caller to handle the failure path, which is what makes graceful degradation reliable instead of accidental. The schema is the single source of truth for what a content file may contain, and it is the natural place to enforce the Spotify URL rules.

### 10. Spotify embed URL is normalized from either accepted form

**Decision.** The frontmatter may carry either `https://open.spotify.com/playlist/<id>` or `https://open.spotify.com/embed/playlist/<id>`; the loader extracts the playlist id with a strict pattern and canonicalizes it to `https://open.spotify.com/embed/playlist/<id>` for the iframe `src`.

**Rationale.** People copy both forms from Spotify. Normalizing server-side keeps the client from constructing a URL from an unvalidated string, and the strict id pattern prevents an arbitrary URL from being smuggled into an iframe `src`.

### 11. Filesystem content loading with explicit output tracing

**Decision.** The loader reads `content/<slug>.md` at request time with `fs.readFile`, resolving the path from `process.cwd()`. The slug is validated against `^[a-z0-9-]{1,64}$` before it touches the filesystem, and the resolved path is verified to stay inside the content directory. `next.config.ts` declares `outputFileTracingIncludes` for `./content/**/*` so the files are guaranteed to be traced into the Vercel serverless bundle. Reads are memoized per request with React's `cache()`.

**Rationale.** `process.cwd()` is the serverless function's root, and explicit output tracing removes the guesswork from the bundler's file-inclusion rules. The slug regex plus the containment check defeat path traversal — a slug like `../../etc/passwd` is rejected before any filesystem call. `cache()` avoids re-reading and re-parsing the same file twice in one request without introducing cross-request state.

### 12. Static, server-rendered pages with client islands for motion

**Decision.** Pages are React Server Components by default. Only the components that need interactivity are `"use client"` islands. A `<MotionProvider>` wraps the protected subtree so variants and transition timing are defined once. Every animation checks `useReducedMotion()` and collapses to a plain fade (or no motion) when the user prefers reduced motion.

**Rationale.** Client-side motion in an App Router app needs explicit `"use client"` boundaries; keeping those boundaries tight preserves the server-rendering and small-bundle benefits. The reduced-motion check is not optional polish — vestibular sensitivity is a real accessibility concern, and it is a cheap guard to add at the motion layer.

**Implementation note — entrances are CSS, transitions are Framer Motion.** Framer Motion was measured rendering on the server: it emits the `initial` state inline, so `initial={{ opacity: 0 }}` puts `style="opacity:0"` in the server-rendered HTML. If the client bundle never runs, the content would stay invisible forever. The entrance reveals are therefore plain CSS animations driven by a `data-reveal` attribute and a `--reveal-delay` custom property, which run without JavaScript at all and whose base state is the final, visible state. Framer Motion keeps the parts where it earns its place: the page transition and the interactive feedback on the access form. The reduced-motion query collapses both layers — the CSS animation through the global media query, the Framer Motion animations through `useReducedMotion()`.

### 13. Visual design system: warm editorial romance

**Decision.** Typography pairs a high-contrast display serif (Cormorant Garamond) for headings with a neutral sans (Inter) for body and UI, both loaded through `next/font/google` for self-hosting and zero layout shift. The palette is a warm, low-saturation set — deep plum, blush, cream, and gold accents — defined once as Tailwind v4 `@theme` tokens in `globals.css`. The background is a layered ambient composition: soft radial gradients, a subtle grain overlay, and slow drifting light — CSS and Framer Motion only, no image assets and no video.

**Rationale.** Romantic here means restrained and editorial, not neon or over-decorated. Self-hosted fonts avoid a third-party request and remove FOUT. CSS-only ambience keeps the bundle small and the page fast, and it scales to any viewport without shipping raster backgrounds.

### 14. Environment configuration validated in one module

**Decision.** `lib/config/env.ts` parses `process.env` with zod at import time and exports a typed, frozen configuration object. Missing or malformed required variables fail fast with a clear message naming the variable. Only genuinely public values (`NEXT_PUBLIC_SITE_URL`) are exposed to the client, and they are never secret. `.env.example` documents every variable with a comment describing its purpose and an example.

**Rationale.** A single validated config module means no component reaches into `process.env` directly, secrets cannot be accidentally referenced from a client component, and misconfiguration surfaces at boot rather than at the moment a user tries to log in.

### 15. Security headers and noindex metadata

**Decision.** `proxy.ts` sets a Content-Security-Policy with a per-request nonce: `default-src 'self'`, `script-src 'self' 'nonce-…' 'strict-dynamic'`, `style-src 'self' 'unsafe-inline'`, `frame-src https://open.spotify.com`, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`. The nonce is generated per request, passed to Next.js through the request header, and echoed on the response so the two match exactly. `next.config.ts` adds the static headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy`, and `X-Robots-Tag: noindex, nofollow, noarchive`. Every private route exports `robots: { index: false, follow: false }`.

**Rationale.** A static `script-src 'self'` without a nonce blocks Next.js's own inline bootstrap scripts, and the page never hydrates — the application visibly breaks. A nonce keeps the strict policy and makes hydration work. The CSP is the main defense against content injection reaching a third-party origin. `frame-ancestors 'none'` stops the private experience from being embedded in a phishing page. `noindex` prevents a search engine from caching any part of the private experience, and the `X-Robots-Tag` header covers crawlers that ignore the meta tag.

**Implementation note — Next 16 renamed the middleware file.** The convention is now `proxy.ts` at the project root, not `middleware.ts`; `middleware.ts` still works but is deprecated. The proxy deliberately does *not* perform any authentication — it only mints the nonce. Authentication stays in the server components, for the reasons given in decision 6.

**Implementation note — `'strict-dynamic'` had to go.** The first version of the policy included `'strict-dynamic'`, which makes a CSP3 browser *ignore* `'self'` and every host source: only nonce-bearing scripts and scripts loaded by them are allowed. Turbopack injects its HMR client as a plain `<script src>` tag with no nonce, so the browser blocked it, its dynamic import failed with a `ChunkLoadError`, and the dev runtime answered with a full page reload — which produced an **endless reload loop** (33 document loads in 5 seconds, with every asset served from cache). The policy is now `script-src 'self' 'nonce-…'`, which still forbids inline scripts without the nonce and still forbids third-party script origins, and lets the framework's own same-origin chunks load. The regression guard lives in `scripts/verify-visual.mjs`, which counts document loads over a window and fails if the page reloads itself.

### 16. Verification strategy

**Decision.** `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run test` all pass before the change is considered done. Vitest covers the security-critical pure functions: scrypt verification (right code, wrong code, wrong salt, malformed hash), session signing and verification (tampering, expiry, wrong slug), slug validation, frontmatter validation, and the Markdown sanitizer's rejection of an embedded `<script>`.

**Rationale.** The auth primitives are the one part of the app where a silent bug is a security hole, and they are pure functions — precisely what unit tests are good at. A green `build` is also the only reliable proof that the server-only boundaries hold, since Next.js fails the build if a server-only module is imported into a client component.

### 17. Application structure

```text
bday-experience/
  app/
    layout.tsx                  # root layout: fonts, metadata, ambient background
    page.tsx                    # redirect -> /${RECIPIENT_SLUG}
    globals.css                 # Tailwind v4 import + @theme design tokens
    not-found.tsx
    api/
      access/route.ts           # POST: verify code, set session cookie
      logout/route.ts           # POST: clear session cookie
    [slug]/
      page.tsx                  # gate: access code form (public)
      layout.tsx                # public shell for the gate
      not-found.tsx
      (protected)/
        layout.tsx              # session guard + nav + motion provider
        loading.tsx
        error.tsx
        bienvenida/page.tsx     # personalized welcome
        playlist/page.tsx       # Spotify playlist embed
        carta/page.tsx          # birthday letter
  components/
    access/AccessGate.tsx       # AccessGate form (client)
    ambient/AmbientBackground.tsx
    motion/                     # MotionProvider, Reveal, PageTransition
    layout/                     # SiteNav, SiteFooter, LogoutButton
    content/                    # ContentUnavailable
  content/
    ana.md
  lib/
    config/env.ts               # validated configuration (server-only)
    config/env-schema.ts        # pure zod schema, unit tested
    auth/{constants,password,session,cookies,credentials,guard}.ts
    content/{schema,loader,render}.ts
    rate-limit/limiter.ts
    spotify/url.ts
    slug.ts
  proxy.ts                      # per-request CSP nonce
  scripts/hash-code.mjs
  scripts/verify-visual.mjs     # browser-based verification
  tests/                        # vitest unit tests
```

**Rationale.** The route group `(protected)` is the key structural decision: it puts the session guard in exactly one `layout.tsx` that wraps all three private pages while leaving `app/[slug]/page.tsx` — the gate — outside that guard. `lib/` holds all server logic. The pure parts of the security layer (`password.ts`, `session.ts`, `cookies.ts`, `env-schema.ts`) are deliberately free of environment access, so they can be unit tested without a deployment; the modules that read the environment (`credentials.ts`, `guard.ts`, `env.ts`) are marked `server-only` so importing them from a Client Component is a build error.

**Implementation note — `server-only`.** The package is a two-line guard: `import "server-only"` makes a build fail if a client component imports the module. It is the mechanism that guarantees a secret can never reach the browser, and it is what turns the "secret referenced from a client component" scenario into a build error rather than a runtime surprise. The test suite aliases it to the package's no-op build so the modules stay unit testable.

### 18. API contracts

`POST /api/access`

- Request: `{ "code": string, "slug": string }`, validated by zod; a malformed body returns `400` with a generic message.
- Success: `200` with `{ "ok": true }`, a `Set-Cookie` for `bday_session`, and `Cache-Control: no-store`.
- Failure: `401` with `{ "ok": false, "error": "invalid_credentials" }` — the same body and status for an unknown slug, a wrong code, and a malformed stored hash, so nothing is distinguishable by an attacker.
- Rate limited: `429` with `Retry-After`.

`POST /api/logout`

- Always clears the cookie, returns `200` with `{ "ok": true }`. Idempotent, and it never reveals whether a session existed.

Both handlers are `runtime = 'nodejs'` and `dynamic = 'force-dynamic'`.

### 19. Markdown data flow

```text
request to /{slug}/carta
  -> (protected)/layout.tsx  : requireSession(slug) -> redirect to /{slug} if invalid
  -> carta/page.tsx (server) : requireSession(slug)   <- BEFORE any content is read
       -> getContent(slug)
            -> slug validated against ^[a-z0-9-]{1,64}$  (traversal guard)
            -> fs.readFile(content/<slug>.md)           (ENOENT -> { ok:false, reason:'not_found' })
            -> gray-matter split                        (parse error -> { ok:false, reason:'parse_error' })
            -> frontmatter validated by zod             (invalid -> { ok:false, reason:'invalid_frontmatter' })
            -> spotifyUrl normalised to canonical embed URL
            -> body -> remark-parse -> remark-rehype (allowDangerousHtml:false)
                     -> rehype-sanitize(allow-list) -> link hardening -> rehype-stringify
            -> top-level blocks split for the staggered reveal
  -> render sanitized HTML with dangerouslySetInnerHTML
```

The result of `getContent` is memoized per request via React `cache()`. Server-side failures are logged with detail; the visitor sees only a graceful, generic message.

The split into top-level blocks happens after sanitisation, on the hast tree, so it never has to parse HTML with a regular expression: each top-level element becomes its own HTML string, and the letter page renders one wrapper per block with an increasing `--reveal-delay`. The revealed text is byte-identical to the sanitised output.

### 20. Error states and fallbacks

| Condition | Server behavior | Visitor sees |
|---|---|---|
| Unknown slug (no content file) | `404` | "Esta experiencia no existe." with a quiet, in-theme page |
| Missing or malformed frontmatter | Log the zod issue; `404` | Same graceful missing page — never the raw error |
| Markdown body empty after rendering | Render an empty letter body | The letter page still renders with title, recipient, and date label |
| Missing or invalid `spotifyUrl` | Omit the iframe | A styled "Playlist coming soon" placeholder panel |
| Wrong code, unknown slug, malformed stored hash | `401`, identical body | The same generic "código incorrecto" message |
| Rate limit exceeded | `429` + `Retry-After` | "Demasiados intentos. Espera un momento." |
| Session missing, expired, tampered, or wrong slug | Redirect to `/{slug}` | The access-code gate |
| Redis not configured | Warn at startup | Access still works; README marks it as a production requirement |

In every case the visitor-facing output reveals nothing about internal state, and no private content ever reaches a response body that is not behind a valid session.

### 21. The access form is only usable once the client has hydrated

**Decision.** The submit button and the code field are disabled until the client component has mounted. The form element also carries `method="post"` so that even an unexpected native submission cannot put the code in the query string.

**Rationale.** Before hydration, the form has no React handler, so the browser performs a native GET submission and appends the code to the URL as `?code=…`. That value would land in the browser history, in the referrer of any outgoing link, and in the server access logs — the exact thing the design is trying to prevent. Disabling the control until hydration removes the window in which the native submission is possible, and the `method="post"` is the belt-and-braces fallback.

**Implementation note.** This was found by the browser verification script, not by reading the code: the scripted login ended up at `/ana?code=…`.

## Risks / Trade-offs

- **[Upstash Redis becomes a runtime dependency for rate limiting]** → It is a one-click Vercel Marketplace add-on with a free tier; the REST API needs no connection pooling; and the README documents the Vercel Firewall rule as a second layer. The access endpoint degrades to "unlimited but logged" rather than breaking if the environment variables are missing.
- **[Reading content from the filesystem at request time may not survive bundling]** → `outputFileTracingIncludes` explicitly traces `./content/**/*` into the function bundle, and the deployment checklist requires verifying that a private page renders after the first production deploy.
- **[Editing content requires a redeploy]** → Accepted for a single-recipient MVP. Markdown-in-git is the chosen editing workflow, and the trade-off buys zero infrastructure and zero credentials for content.
- **[One shared secret is a single point of failure — there is no recovery path if it is lost]** → `scripts/hash-code.mjs` makes rotation a two-minute operation, and a rotation requires no code change. Documented in the README.
- **[A single shared code is guessable if weak]** → The rate limiter bounds online attempts, the code is never transmitted anywhere except over TLS to the server, and the README recommends a high-entropy code.
- **[Sharing the link leaks the experience if the code is also shared]** → Mitigated by keeping the code out of the URL, plus `noindex` and `frame-ancestors 'none'`.
- **[Tailwind v4's CSS-first configuration is less familiar than a JS config file]** → Design tokens live in one `@theme` block in `globals.css`, which is easy to review and change.
- **[A CSP with `'unsafe-inline'` for styles is weaker than a nonce-based policy]** → Nonces are impractical with the Next.js App Router's inline bootstrap scripts; the script policy is still restricted to `'self'` and `'unsafe-inline'` is scoped to styles only. This is a deliberate, documented trade-off.
- **[The Spotify embed loads third-party resources and reveals visitor IPs to Spotify]** → Accepted — the embed is the requested feature. A self-hosted fallback playlist is out of scope.
- **[No tests cover the UI]** → Accepted. The security-critical logic is unit tested, and the visual layer is verified manually against the design intent.

## Migration Plan

Greenfield — there is no existing behavior to migrate and no data to back up.

1. Scaffold the app: `create-next-app` with TypeScript, Tailwind, ESLint, App Router, and the `src/`-less layout used above; install Framer Motion, `gray-matter`, the `remark`/`rehype` family, `rehype-sanitize`, `zod`, `@upstash/redis`, `@upstash/ratelimit`, and Vitest.
2. Configure the environment locally from `.env.example`: run `node scripts/hash-code.mjs "<code>"` to obtain `ACCESS_CODE_HASH` and `ACCESS_CODE_SALT`, then generate `SESSION_SECRET` with `openssl rand -hex 32`.
3. Add `content/ana.md` with the frontmatter contract and the letter body.
4. Implement `lib/` first (config → password → session → rate limit → content), then the API routes, then the gate, then the protected pages, then the motion layer.
5. Verify locally: `npm run typecheck && npm run lint && npm run test && npm run build`, then exercise the full flow in `next dev`.
6. Deploy to Vercel: import the GitHub repository, add the environment variables (including the Upstash Redis REST URL and token), and confirm the first production deploy renders a private page correctly — which is the real test that content tracing worked.
7. Add the Vercel Firewall rate-limiting rule as defense in depth, and confirm `robots`/noindex behavior with a crawler check.

**Rollback.** There is no data to roll back. To revert, promote the previous Vercel deployment or redeploy the previous commit; the only external state is the environment configuration, which is additive and version-controlled in `.env.example`.

## Open Questions

- What is the final Spotify playlist id? The implementation uses a clearly marked placeholder until the real playlist is chosen.
- Is a second recipient actually needed? The design supports it, but it may be unnecessary — worth confirming before any content work is duplicated.
- Should the experience include optional ambient background music with a mute control? Deliberately excluded from the MVP; recording the decision here in case it is wanted later.
- What are the final rate-limit thresholds? The design assumes roughly 5 attempts per 15 minutes per IP; the exact values should be set once real usage is known.
- Which deployment domain should be used? A custom domain improves the feeling of a personal gift and should be chosen before the content is finalized.

## Why

A birthday message should feel personal and private, but today there is no way to ship a polished, cinematic birthday experience that is gated for one specific person without standing up a database, a CMS, and a separate backend. We want a single-recipient MVP: one deployable Next.js app where the recipient unlocks a personalized welcome, a Spotify playlist, and a handwritten letter — all content editable in plain Markdown, all behind one shared secret code, and safe to deploy to Vercel serverless.

## What Changes

- Scaffold a Next.js App Router application in TypeScript strict mode with Tailwind CSS and Framer Motion.
- Add a slug-driven route tree (`/[slug]`, `/[slug]/bienvenida`, `/[slug]/playlist`, `/[slug]/carta`) with `/` redirecting to the configured recipient slug.
- Introduce a shared-secret-code access gate: server-side scrypt hash verification, HMAC-SHA256 signed session cookie, logout endpoint, and Vercel-compatible rate limiting on the access endpoint.
- Protect every content-bearing page with a server-side session check and emit `noindex` metadata for private routes.
- Build a Markdown content pipeline: frontmatter-validated content files in `content/` (outside `public/`), parsed and rendered to sanitized HTML on the server only.
- Deliver the romantic visual layer: welcome screen, playlist embed, letter page, and subtle Framer Motion transitions across the experience.
- Add a `.env.example` documenting the required environment variables and deployment notes for Vercel.

### Non-goals

- No database, Supabase, or persistent user records — this is a single-recipient MVP.
- No separate Fastify backend or external CMS; Next.js route handlers and Markdown files cover both.
- No multi-user accounts, registration, password reset, roles, or admin UI.
- No runtime filesystem writes; all mutable data lives in Markdown files and environment variables.
- No playlist playback proxying, analytics, or third-party tracking beyond the Spotify embed.

## Capabilities

### New Capabilities
- `access-control`: Shared secret-code entry, server-side code verification with salted scrypt hashing, HMAC-SHA256 signed session cookies with expiry, logout, constant-time comparisons, generic error responses, Vercel-compatible rate limiting, and server-side protection of private routes.
- `birthday-content`: Markdown-based content authoring with validated frontmatter (title, recipient, dateLabel, spotifyUrl), server-side parsing and sanitized rendering, graceful handling of missing or invalid content, and support for multiple slugs without a database.
- `experience-routes`: Slug-addressable route structure (`/[slug]`, `/[slug]/bienvenida`, `/[slug]/playlist`, `/[slug]/carta`), root redirect to the configured recipient slug, shared navigation and layout, responsive presentation, and `noindex` metadata on private pages.
- `romantic-animations`: Framer Motion-driven entrance, transition, and reveal animations that give the welcome, playlist, and letter pages an elegant, intimate feel while respecting `prefers-reduced-motion`.

### Modified Capabilities
<!-- None — this is the first change in the project. -->
- None.

## Impact

- **New application code**: the entire `bday-experience` Next.js app (App Router, `app/`, `components/`, `lib/`, `content/`, `public/`).
- **Dependencies added**: `next`, `react`, `react-dom`, `framer-motion`, `gray-matter`, `remark`, `remark-html`/`remark-rehype`, `rehype-sanitize`, `zod`, `tailwindcss`; dev deps for TypeScript, ESLint, and the Next.js type/plugin setup.
- **Environment variables (new)**: access-code hash, salt, session secret, recipient slug, and rate-limit configuration — all documented in `.env.example`.
- **Deployment**: Vercel serverless target; no persistent runtime storage, no external services, no database migrations.
- **Existing systems**: none — this repository currently contains only the OpenSpec workflow scaffolding, so the change introduces the application rather than modifying existing behavior.

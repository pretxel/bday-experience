## ADDED Requirements

### Requirement: Access code gate
The system SHALL present a secret-code entry screen at `/[slug]` and SHALL accept a single shared access code as the only credential required to enter the experience. The access code SHALL NOT appear in any URL, in any client-side bundle, or in any response body.

#### Scenario: Visitor arrives at the personalized URL
- **WHEN** a visitor opens `/[slug]` with no valid session
- **THEN** the system renders an access-code form and does not render any private content

#### Scenario: Correct code is submitted
- **WHEN** a visitor submits the correct access code for the slug
- **THEN** the server sets a session cookie and the visitor is redirected to the welcome page

#### Scenario: Code is never exposed to the client
- **WHEN** any JavaScript bundle, page source, or API response served to the browser is inspected
- **THEN** the access code, its hash, and its salt are absent

### Requirement: Server-side credential verification
The system SHALL verify the submitted access code on the server by deriving a key with `crypto.scrypt` using the stored salt and comparing it against the stored hash using a constant-time comparison. The plaintext code MUST NOT be stored in environment variables, files, or source control.

#### Scenario: Submitted code matches the stored hash
- **WHEN** a visitor submits the access code that corresponds to the stored salted hash
- **THEN** the server grants access

#### Scenario: Submitted code does not match
- **WHEN** a visitor submits any other access code
- **THEN** the server denies access without revealing whether the slug, the code, or the stored hash was the problem

#### Scenario: Code hash is generated out of band
- **WHEN** the maintainer runs the provided hash-generation script with a plaintext code
- **THEN** the script prints a salt and hash that can be placed in environment variables, and the plaintext is not persisted by the script

#### Scenario: Comparison is resistant to timing attacks
- **WHEN** the stored hash and the derived key are compared
- **THEN** the comparison uses a fixed-length constant-time equality check and does not short-circuit on the first differing byte

### Requirement: Generic authentication errors
The system SHALL return an identical status code and an identical response body for every authentication failure, including an unknown slug, an incorrect code, and a malformed stored hash. The system MUST NOT distinguish failure modes in the response body, in headers, or in client-visible messages.

#### Scenario: Unknown slug is submitted
- **WHEN** a visitor submits a code for a slug that does not exist
- **THEN** the response is byte-for-byte identical to the response for an incorrect code

#### Scenario: Error responses carry no diagnostic detail
- **WHEN** an authentication request fails
- **THEN** the response body contains only a generic error identifier and no stack trace, file path, hash, or internal message

### Requirement: Signed session cookie
The system SHALL issue an HMAC-SHA256 signed session cookie after successful authentication. The cookie MUST be `HttpOnly`, `SameSite=Lax`, `Secure` in production, scoped to `Path=/`, and bounded by an explicit expiration. The cookie payload SHALL include the schema version, the slug the session was issued for, the issue time, the expiry, and a random session identifier.

#### Scenario: Session cookie attributes on successful login
- **WHEN** the server issues a session cookie
- **THEN** the `Set-Cookie` header includes `HttpOnly`, `SameSite=Lax`, `Path=/`, a `Max-Age` or `Expires` bound, and `Secure` whenever the application is running in production

#### Scenario: Cookie is not readable by client scripts
- **WHEN** the browser stores the session cookie
- **THEN** `document.cookie` does not expose the session value

### Requirement: Session verification
The system SHALL verify session cookies server-side using a constant-time comparison of the HMAC signature, and SHALL reject a session that is malformed, whose signature does not match, whose expiry has passed, or whose slug does not match the requested slug.

#### Scenario: Valid session is accepted
- **WHEN** a request carries a correctly signed, unexpired session for the requested slug
- **THEN** the request is treated as authenticated

#### Scenario: Tampered payload is rejected
- **WHEN** the payload of a session cookie is modified while the signature is left unchanged
- **THEN** the session is rejected and the visitor is redirected to the access-code gate

#### Scenario: Expired session is rejected
- **WHEN** a request carries a correctly signed session whose expiry is in the past
- **THEN** the session is rejected and the visitor is redirected to the access-code gate

#### Scenario: Session issued for another slug is rejected
- **WHEN** a request for slug A carries a valid session issued for slug B
- **THEN** the session is rejected for slug A

### Requirement: Protected pages
The system SHALL validate the session on the server before rendering any page that contains private content, and SHALL redirect an unauthenticated visitor to the access-code gate for that slug. The validation SHALL happen before any private content is read or serialised into a response.

#### Scenario: Private page without a session
- **WHEN** a visitor requests a private page with no session cookie
- **THEN** the server responds with a redirect to the access-code gate and the private content is not present in the response body

#### Scenario: The redirect body contains no private content
- **WHEN** an unauthenticated visitor requests a private page and receives the redirect
- **THEN** neither the rendered content nor its serialised form appears anywhere in the response body, including the framework's own data payload

#### Scenario: Private page with a valid session
- **WHEN** a visitor requests a private page with a valid session
- **THEN** the server renders the page with the private content

#### Scenario: Guard is applied to every private route
- **WHEN** a new page is added under the protected route group
- **THEN** it inherits the session guard from the group's layout without requiring an additional check

### Requirement: Logout
The system SHALL provide a logout endpoint that clears the session cookie. The endpoint SHALL be idempotent and SHALL NOT reveal whether a session was present.

#### Scenario: Logout with a valid session
- **WHEN** a visitor triggers logout
- **THEN** the session cookie is cleared and the visitor is returned to the access-code gate

#### Scenario: Logout without a session
- **WHEN** logout is triggered without a session cookie
- **THEN** the response is identical in status and body to the authenticated logout response

### Requirement: Rate limiting on the access endpoint
The system SHALL apply rate limiting to the access endpoint using a shared store that works across Vercel serverless instances. The system MUST NOT implement rate limiting with in-memory state held in a serverless function. When the limit is exceeded, the system SHALL return HTTP 429 with a `Retry-After` header.

#### Scenario: Attempt within the limit
- **WHEN** a client makes an access attempt within the configured allowance
- **THEN** the request is processed normally

#### Scenario: Attempt beyond the limit
- **WHEN** a client exceeds the configured allowance for its IP within the window
- **THEN** the server returns HTTP 429 with a `Retry-After` header and no session cookie

#### Scenario: Limits are shared across serverless instances
- **WHEN** two requests arrive at different function instances within the same window
- **THEN** the shared counter accounts for both requests rather than each instance counting independently

#### Scenario: Rate limiter is not configured
- **WHEN** the rate-limit store environment variables are absent
- **THEN** the application starts with a prominent warning, access still functions, and the documentation states that the store must be configured before production use

### Requirement: Request payload validation

The system SHALL validate every access and logout request payload with a schema before processing it, and SHALL reject malformed payloads without processing them.

#### Scenario: Missing code field
- **WHEN** a request to the access endpoint omits the code field
- **THEN** the server rejects the request with HTTP 400 and a generic message

#### Scenario: Oversized code field
- **WHEN** a request to the access endpoint sends a code exceeding the maximum accepted length
- **THEN** the server rejects the request with HTTP 400 without performing a hash derivation

### Requirement: The access code never reaches the URL
The system SHALL ensure the access code is never placed in a URL, in the browser history, or in any request query string, including when the page has not finished hydrating.

#### Scenario: The form is submitted before hydration
- **WHEN** a visitor submits the form before the client has hydrated
- **THEN** the submission does not place the code in the query string, because the control is not yet actionable

#### Scenario: The code is not in the address bar
- **WHEN** a visitor completes the access flow
- **THEN** the resulting URL contains no access code
The system SHALL validate every access and logout request payload with a schema before processing it, and SHALL reject malformed payloads without processing them.

#### Scenario: Missing code field
- **WHEN** a request to the access endpoint omits the code field
- **THEN** the server rejects the request with HTTP 400 and a generic message

#### Scenario: Oversized code field
- **WHEN** a request to the access endpoint sends a code exceeding the maximum accepted length
- **THEN** the server rejects the request with HTTP 400 without performing a hash derivation

### Requirement: Security headers and indexing
The system SHALL set a Content-Security-Policy with a per-request nonce that allows only same-origin scripts, permits framing only the Spotify embed origin, and denies framing of the application itself. The policy SHALL NOT permit inline scripts without a nonce. All routes, public and private, SHALL be marked as non-indexable.

#### Scenario: Response headers
- **WHEN** any page is served
- **THEN** the response includes `X-Content-Type-Options: nosniff`, a Content-Security-Policy, and an `X-Robots-Tag` directive of `noindex, nofollow`

#### Scenario: The policy does not block the application
- **WHEN** a page is loaded in a browser that enforces the policy
- **THEN** the application hydrates and works, and no policy violation is reported

#### Scenario: The policy does not make the page reload itself
- **WHEN** a page is left open in a browser
- **THEN** the document is not reloaded repeatedly, and the framework's own scripts and chunks load normally

#### Scenario: Private route metadata
- **WHEN** a private page is rendered
- **THEN** the page emits robot metadata instructing search engines not to index or follow it

### Requirement: Environment configuration
The system SHALL read all configuration from environment variables validated by a schema at startup, and SHALL fail fast with a message naming the missing variable when a required variable is absent or malformed. Secrets MUST NOT be exposed to client bundles.

#### Scenario: Missing required variable
- **WHEN** a required environment variable is absent at startup
- **THEN** the application fails fast with an error that names the missing variable

#### Scenario: Secret is referenced from a client component
- **WHEN** a client component attempts to read a secret environment variable
- **THEN** the value is `undefined` in the browser and the build reports the invalid client reference

### Requirement: No private content in responses or logs
The system SHALL NOT include private Markdown content, the access code, its hash, its salt, or the session secret in any API response, log line, or error message returned to the client.

#### Scenario: Content read failure
- **WHEN** the content loader fails to read or parse a content file
- **THEN** the detail is logged server-side only and the visitor receives a generic message

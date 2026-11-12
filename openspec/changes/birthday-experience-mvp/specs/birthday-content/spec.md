## ADDED Requirements

### Requirement: Markdown content files
The system SHALL store all personalized editable content in Markdown files under the repository's `content/` directory, one file per recipient named `<slug>.md`. The `content/` directory MUST NOT be located inside `public/`, and its files MUST NOT be served as static assets.

#### Scenario: Content lives outside the public directory
- **WHEN** the repository is inspected
- **THEN** the content directory is a sibling of `public/` and contains Markdown files

#### Scenario: Direct request for a content file
- **WHEN** a client requests `/ana.md` or `/content/ana.md` over HTTP
- **THEN** the server does not return the private content file

#### Scenario: Content file is included in the deployment bundle
- **WHEN** the application is built for deployment
- **THEN** the content files are traced into the serverless function bundle so private pages can read them at runtime

### Requirement: Frontmatter contract
Each content file SHALL begin with YAML frontmatter providing at least `title`, `recipient`, and `dateLabel`, and MAY provide `spotifyUrl`, `playlistId`, and `subtitle`. The system SHALL validate the frontmatter against a schema before using it.

#### Scenario: Valid frontmatter
- **WHEN** a content file provides `title`, `recipient`, and `dateLabel` as non-empty strings
- **THEN** the content loads successfully and the metadata is available to the pages

#### Scenario: Missing required field
- **WHEN** a content file omits `title`, `recipient`, or `dateLabel`
- **THEN** loading fails with an invalid-frontmatter result and no page renders with partial metadata

#### Scenario: Frontmatter is not a mapping
- **WHEN** a content file's frontmatter is malformed or empty
- **THEN** loading fails with an invalid-frontmatter result rather than a crash

### Requirement: Server-side Markdown rendering
The system SHALL parse and render Markdown on the server only. The client SHALL NOT receive raw Markdown source for private content and SHALL NOT contain a Markdown parser capable of rendering it.

#### Scenario: Rendering happens on the server
- **WHEN** a private page is requested
- **THEN** the response body contains the already-rendered HTML and no Markdown parser is shipped to the browser for private content

#### Scenario: Raw HTML in Markdown is discarded
- **WHEN** a content file's body contains a raw HTML tag
- **THEN** the raw tag is discarded rather than passed through to the rendered output

### Requirement: HTML sanitization
The system SHALL sanitize rendered HTML before it is injected into a page, using an allow-list restricted to the tags and attributes the Markdown pipeline can legitimately produce. The sanitized output SHALL NOT contain script elements, event-handler attributes, or `javascript:` URLs.

#### Scenario: Script injection attempt
- **WHEN** a content file's body contains a `<script>` element
- **THEN** the rendered output contains no script element and no executable code

#### Scenario: Event handler injection attempt
- **WHEN** a content file's body contains an element with an `onclick` attribute
- **THEN** the rendered output omits the event-handler attribute

#### Scenario: Dangerous URL scheme
- **WHEN** a content file's body contains a link whose href uses the `javascript:` scheme
- **THEN** the rendered output omits or neutralizes the href

### Requirement: Graceful handling of missing or invalid content
The system SHALL handle a missing content file, an unparsable file, invalid frontmatter, an empty body, and a missing Spotify URL without throwing an unhandled error or rendering a broken page.

#### Scenario: Missing content file
- **WHEN** a slug has no corresponding content file
- **THEN** the server responds with a graceful not-found page and a generic message

#### Scenario: Invalid frontmatter
- **WHEN** a content file's frontmatter fails validation
- **THEN** the server logs the specific validation issue server-side and shows a generic message to the visitor

#### Scenario: Empty Markdown body
- **WHEN** a content file has a valid frontmatter and an empty body
- **THEN** the letter page still renders with its title, recipient, and date label

#### Scenario: Missing Spotify URL
- **WHEN** a content file omits `spotifyUrl` or provides an invalid one
- **THEN** the playlist page renders a styled placeholder instead of an iframe

### Requirement: Slug safety
The system SHALL validate a slug against a strict pattern before using it to construct a filesystem path, and SHALL verify that the resolved path remains inside the content directory.

#### Scenario: Traversal attempt in the slug
- **WHEN** a request contains a slug such as `../../etc/passwd` or `..%2F..%2Fsecret`
- **THEN** the slug is rejected before any filesystem access occurs

#### Scenario: Uppercase or invalid characters in the slug
- **WHEN** a request contains a slug with uppercase letters, spaces, or path separators
- **THEN** the slug is rejected as invalid

### Requirement: Spotify playlist URL normalization
The system SHALL accept either a Spotify playlist URL or a Spotify embed playlist URL in the content frontmatter, extract the playlist identifier with a strict pattern, and canonicalize it to the embed form used for the iframe source. The system MUST NOT place an unvalidated string into the iframe source.

#### Scenario: Standard playlist URL is provided
- **WHEN** the frontmatter provides `https://open.spotify.com/playlist/<id>`
- **THEN** the iframe source is `https://open.spotify.com/embed/playlist/<id>`

#### Scenario: Embed playlist URL is provided
- **WHEN** the frontmatter provides `https://open.spotify.com/embed/playlist/<id>`
- **THEN** the iframe source is that same embed URL

#### Scenario: Identifier does not match the expected pattern
- **WHEN** the provided URL does not contain a valid playlist identifier
- **THEN** the playlist is treated as unavailable and a placeholder is rendered instead of an iframe

### Requirement: Multiple slugs without a database
The system SHALL resolve content by slug from Markdown files alone, such that adding a recipient requires no schema migration, no database record, and no application code change.

#### Scenario: A second recipient is added
- **WHEN** a second content file `content/<other-slug>.md` is added and the slug is made accessible
- **THEN** its pages render its own content using the same implementation

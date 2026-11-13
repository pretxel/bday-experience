## ADDED Requirements

### Requirement: Slug-addressed route structure
The system SHALL expose the routes `/[slug]`, `/[slug]/bienvenida`, `/[slug]/playlist`, and `/[slug]/carta`, and SHALL render the same layout and behavior for every slug without duplicating application logic. The slug SHALL be a random key of at least eight characters.

#### Scenario: Routes resolve for a slug
- **WHEN** a visitor requests `/8efyvkwz`, `/8efyvkwz/bienvenida`, `/8efyvkwz/playlist`, or `/8efyvkwz/carta`
- **THEN** the corresponding page is rendered for that recipient

#### Scenario: Implementation is not duplicated per slug
- **WHEN** the route implementation is inspected
- **THEN** a single dynamic route implementation serves every slug

#### Scenario: The slug is not guessable
- **WHEN** the slug is generated
- **THEN** it consists of eight random characters, so the URL cannot be guessed from the name of the recipient

### Requirement: Root path
The system SHALL respond with a not-found page at the root path, and SHALL NOT redirect to the recipient slug. The recipient slug is a random, unguessable key, so pointing the root at it would reveal where the experience lives to anyone who typed the domain.

#### Scenario: Visiting the root path
- **WHEN** a visitor requests `/`
- **THEN** the server responds with a not-found page that contains no link to the experience

#### Scenario: The root page does not leak the slug
- **WHEN** the root path is requested
- **THEN** neither the response body nor the `Location` header mentions the recipient slug

#### Scenario: The experience is reached only by its full link
- **WHEN** a visitor opens `/${RECIPIENT_SLUG}`
- **THEN** the access gate renders normally

### Requirement: Protected route group
The system SHALL place all private pages inside a single protected route group whose layout performs the session validation, so that every private page inherits the guard and the access-code gate remains outside it. Each private page SHALL additionally verify the session before reading any private content.

#### Scenario: Guard applies to every private page
- **WHEN** a visitor requests any page inside the protected group
- **THEN** the session is validated by the group's layout before the page renders

#### Scenario: Private data is not read for an unauthenticated request
- **WHEN** a visitor without a session requests a private page
- **THEN** the private content is never loaded, so it cannot appear in the response

#### Scenario: Access gate is not blocked by the guard
- **WHEN** a visitor without a session requests the access-code gate
- **THEN** the gate renders normally instead of redirecting to itself

### Requirement: Session binding to slug
The system SHALL bind an issued session to the slug it was created for, and SHALL reject that session when it is presented for a different slug.

#### Scenario: Session presented for a different slug
- **WHEN** a valid session issued for slug A is used to request a page for slug B
- **THEN** the request is treated as unauthenticated

### Requirement: Unknown slug handling
The system SHALL respond with a not-found response for a slug that has no corresponding content, and SHALL NOT render any private content or reveal whether other slugs exist.

#### Scenario: Request for an unknown slug
- **WHEN** a visitor requests `/unknown-slug` or `/unknown-slug/carta`
- **THEN** the server responds with a graceful not-found page

### Requirement: Navigation between the private pages
The system SHALL provide navigation that lets the visitor move between the welcome, playlist, and letter pages of the same slug, with the current page indicated.

#### Scenario: Moving between pages
- **WHEN** a visitor selects a navigation link
- **THEN** the corresponding page of the same slug is loaded

#### Scenario: Current page is indicated
- **WHEN** a private page is rendered
- **THEN** the navigation marks that page as the current one for assistive technology and for visual styling

### Requirement: Responsive presentation
The system SHALL render the experience legibly on mobile, tablet, and desktop viewports, with no horizontal scrolling and with the letter, playlist embed, and access form remaining usable at 360 pixels wide.

#### Scenario: Small viewport
- **WHEN** the page is rendered at 360 pixels wide
- **THEN** content fits within the viewport, the access form remains operable, and the Spotify embed is fully visible

#### Scenario: Large viewport
- **WHEN** the page is rendered on a wide display
- **THEN** the content is constrained to a readable maximum width and centered rather than stretched edge to edge

### Requirement: Noindex metadata on private routes
The system SHALL mark the access gate and every private page as non-indexable via page metadata and a response header.

#### Scenario: Gate page metadata
- **WHEN** the access gate is rendered
- **THEN** its metadata instructs search engines not to index it

#### Scenario: Private page metadata
- **WHEN** a private page is rendered
- **THEN** its metadata instructs search engines not to index or follow it

### Requirement: Loading and error states
The system SHALL provide a route-level loading state for private pages and SHALL render an error state that does not expose internal details when a page fails to render.

#### Scenario: Navigation between pages
- **WHEN** a private page is loading
- **THEN** a themed loading indicator is shown in place of the page content

#### Scenario: Unhandled page error
- **WHEN** a private page throws
- **THEN** the visitor sees a generic, themed error state and no stack trace or internal message

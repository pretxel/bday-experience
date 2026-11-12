## ADDED Requirements

### Requirement: Server-rendered pages with motion islands
The system SHALL render pages on the server and SHALL confine Framer Motion to explicitly client-side components, so that motion code does not prevent the private content from being server-rendered. The system SHALL drive the staged entrance reveals with a mechanism that also runs when scripting is unavailable.

#### Scenario: Private page is server-rendered
- **WHEN** a private page is requested with a valid session
- **THEN** the response body contains the rendered private content from the server

#### Scenario: Motion components are client boundaries
- **WHEN** a component uses Framer Motion hooks
- **THEN** it is marked as a client component and is imported by a server component through a client boundary

#### Scenario: The entrance reveal survives a missing client bundle
- **WHEN** the server-rendered HTML is delivered without the client bundle executing
- **THEN** the content is already visible, because the server-rendered state is the final state and the animation only decorates it

### Requirement: Welcome page entrance
The system SHALL animate the welcome page with a staged entrance in which the greeting, the recipient name, and the call to action appear in sequence with a soft easing, so that the page reads as a deliberate reveal rather than a static render.

#### Scenario: Welcome page loads
- **WHEN** the welcome page becomes visible
- **THEN** its elements animate into place in a staged sequence rather than appearing all at once

#### Scenario: Welcome page entrance repeats
- **WHEN** the visitor navigates back to the welcome page
- **THEN** the entrance animation plays again

### Requirement: Page transitions
The system SHALL animate transitions between the private pages with a cross-fade and a subtle vertical movement, and SHALL NOT block navigation with an animation that requires an explicit dismiss.

#### Scenario: Navigating from welcome to letter
- **WHEN** the visitor selects the letter page
- **THEN** the outgoing page fades and the incoming page settles into place without a modal or blocking overlay

#### Scenario: Navigation remains responsive
- **WHEN** a transition is in progress
- **THEN** the navigation links remain operable and the visitor is never trapped on a transition

### Requirement: Letter reveal
The system SHALL reveal the letter body progressively, staggering its blocks so the letter reads as if it is being written or unfolded, and SHALL preserve the exact rendered text so that animation never alters the content.

#### Scenario: Letter page loads
- **WHEN** the letter page becomes visible
- **THEN** the letter's blocks are revealed in sequence with a slight delay between them

#### Scenario: Letter text is unmodified
- **WHEN** the letter has finished animating
- **THEN** the visible text is identical to the sanitized Markdown output

### Requirement: Playlist page motion
The system SHALL animate the playlist panel and its surrounding copy into place, and SHALL render the Spotify embed inside a container whose dimensions are reserved so the layout does not shift when the iframe loads.

#### Scenario: Playlist panel loads
- **WHEN** the playlist page becomes visible
- **THEN** the panel animates into place and the embed occupies a stable, pre-sized container

#### Scenario: Embed fails to load
- **WHEN** the Spotify iframe does not load
- **THEN** the surrounding layout is unchanged and the visitor sees a graceful placeholder

### Requirement: Reduced motion support
The system SHALL respect the operating system's reduced-motion preference by collapsing entrance, stagger, and transition animations to a plain, non-moving presentation. No component SHALL animate indefinitely when reduced motion is requested.

#### Scenario: Reduced motion is enabled
- **WHEN** the visitor's system requests reduced motion
- **THEN** content appears without transform or motion effects and ambient continuous animations are disabled

#### Scenario: Reduced motion preference changes at runtime
- **WHEN** the visitor changes the reduced-motion preference while the experience is open
- **THEN** subsequent rendering respects the new preference

### Requirement: Ambient background
The system SHALL render a shared ambient background layer beneath every page — soft gradient washes and a subtle grain — implemented with CSS and motion primitives rather than raster image assets, so it adapts to any viewport without additional network requests.

#### Scenario: Ambient background renders
- **WHEN** any page of the experience is displayed
- **THEN** the ambient layer is present beneath the content and does not intercept pointer events

#### Scenario: Background on a small viewport
- **WHEN** the viewport is narrow
- **THEN** the ambient layer scales to the viewport without causing horizontal scrolling

### Requirement: Access gate feedback
The system SHALL animate the access-code form's validation feedback, showing a distinct, non-motion-dependent indication of a failed attempt, and SHALL disable submission while the request is in flight so a failed attempt cannot be replayed by rapid clicking.

#### Scenario: Failed attempt
- **WHEN** the server rejects the submitted code
- **THEN** the form shows a generic error indication and returns to an enabled state

#### Scenario: Request in flight
- **WHEN** the access request is pending
- **THEN** the submit control is disabled and cannot trigger a second request

### Requirement: Motion does not block content
The system SHALL ensure that all private content is present and readable regardless of animation state, so that content is never hidden behind an animation that never runs — including when JavaScript is slow, disabled, or fails to load.

#### Scenario: JavaScript is unavailable
- **WHEN** scripting is disabled or fails to load
- **THEN** the private content is still visible and the page remains usable

#### Scenario: Animation is interrupted
- **WHEN** an entrance animation is interrupted partway through
- **THEN** the content settles to its final visible state rather than remaining invisible

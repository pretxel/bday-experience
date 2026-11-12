/**
 * The ambient background.
 *
 * Layered radial-gradient washes plus a CSS grain overlay — no images, no
 * network requests, and it scales to any viewport. It is decorative only, so
 * it is hidden from assistive technology and never intercepts pointer events.
 */
export function AmbientBackground() {
  return (
    <div
      aria-hidden="true"
      className="grain pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Base wash. */}
      <div className="absolute inset-0 bg-plum-950" />

      {/* Warm blush light, drifting slowly. */}
      <div className="ambient-drift absolute -top-[30%] left-[8%] h-[70vmax] w-[70vmax] rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--color-blush-600)_38%,transparent),transparent_65%)] blur-[60px]" />

      {/* A cooler plum light on the opposite side. */}
      <div
        className="ambient-drift absolute -bottom-[35%] -right-[15%] h-[65vmax] w-[65vmax] rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--color-plum-600)_45%,transparent),transparent_65%)] blur-[70px]"
        style={{ animationDelay: "-11s" }}
      />

      {/* A small gold glimmer. */}
      <div
        className="ambient-breathe absolute top-[15%] right-[22%] h-[26vmax] w-[26vmax] rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--color-gold-500)_16%,transparent),transparent_70%)] blur-[50px]"
        style={{ animationDelay: "-4s" }}
      />

      {/* Vignette, so the edges of the page fall away. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,color-mix(in_oklab,var(--color-plum-950)_88%,transparent)_100%)]" />
    </div>
  );
}

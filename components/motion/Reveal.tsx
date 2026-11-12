/**
 * A staged entrance.
 *
 * The animation is driven by CSS rather than by a client-side animation
 * library, on purpose: CSS animations run even when scripting is unavailable
 * or slow, so the content is never stuck invisible. `data-reveal` marks the
 * element, `--reveal-delay` staggers it, and the reduced-motion media query
 * in `globals.css` collapses the whole thing to an instant reveal.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  /** Delay in milliseconds before the element starts revealing. */
  delay?: number;
  className?: string;
}) {
  return (
    <div
      data-reveal=""
      className={className}
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

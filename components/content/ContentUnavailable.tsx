/** The graceful state shown when a content file cannot be used. */
export function ContentUnavailable() {
  return (
    <div className="page-shell flex flex-1 flex-col items-center justify-center py-24 text-center">
      <p className="text-xs tracking-[0.35em] text-gold-400/70 uppercase">
        Un momento
      </p>
      <h1 className="mt-6 font-display text-3xl text-cream-50 sm:text-4xl">
        Esta parte todavía no está lista
      </h1>
      <p className="mt-5 max-w-sm text-sm leading-relaxed text-blush-200/55">
        La estoy terminando. Vuelve en un momento.
      </p>
    </div>
  );
}

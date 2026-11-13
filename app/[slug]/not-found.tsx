/**
 * The not-found page for a recipient.
 *
 * No link back either: the only way in is the full, correct link.
 */
export default function SlugNotFound() {
  return (
    <main className="page-shell flex flex-1 flex-col items-center justify-center py-24 text-center">
      <p className="text-xs tracking-[0.35em] text-gold-400/70 uppercase">
        No encontrado
      </p>
      <h1 className="mt-6 font-display text-4xl text-cream-50 sm:text-5xl">
        Esta experiencia no existe
      </h1>
      <p className="mt-5 max-w-sm text-sm leading-relaxed text-blush-200/55">
        Puede que el enlace esté mal escrito, o que esta sorpresa sea para
        otra persona.
      </p>
    </main>
  );
}

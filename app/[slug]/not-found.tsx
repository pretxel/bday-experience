import Link from "next/link";

/** The not-found page for a recipient. */
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
      <Link
        href="/"
        className="mt-9 rounded-xl border border-blush-300/20 px-6 py-3 text-sm tracking-[0.18em] text-cream-100 uppercase transition-colors duration-300 hover:border-gold-400/50 hover:text-gold-300"
      >
        Volver
      </Link>
    </main>
  );
}

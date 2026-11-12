import Link from "next/link";

/** The root not-found page. */
export default function NotFound() {
  return (
    <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="text-xs tracking-[0.35em] text-gold-400/70 uppercase">
        No encontrado
      </p>
      <h1 className="mt-6 font-display text-4xl text-cream-50 sm:text-5xl">
        Aquí no hay nada
      </h1>
      <p className="mt-5 max-w-sm text-sm leading-relaxed text-blush-200/55">
        Puede que esta dirección no exista, o que el enlace haya cambiado.
      </p>
      <Link
        href="/"
        className="mt-9 rounded-xl border border-blush-300/20 px-6 py-3 text-sm tracking-[0.18em] text-cream-100 uppercase transition-colors duration-300 hover:border-gold-400/50 hover:text-gold-300"
      >
        Volver
      </Link>
    </div>
  );
}

"use client";

import { useEffect } from "react";

/**
 * The themed error state.
 *
 * It shows nothing about what went wrong: the detail stays in the server
 * logs, where it belongs.
 */
export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[birthday-experience] A private page failed to render.");
  }, [error]);

  return (
    <div className="page-shell flex flex-1 flex-col items-center justify-center py-24 text-center">
      <p className="text-xs tracking-[0.35em] text-gold-400/80 uppercase">
        Algo no salió bien
      </p>
      <h1 className="mt-6 font-display text-3xl text-cream-50 sm:text-4xl">
        Esta página no se pudo mostrar
      </h1>
      <p className="mt-5 max-w-sm text-sm leading-relaxed text-blush-200/60">
        Vuelve a intentarlo en un momento. Si el problema continúa, escríbeme.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 cursor-pointer rounded-xl border border-blush-300/20 px-6 py-3 text-sm tracking-[0.2em] text-cream-100 uppercase transition-colors duration-300 hover:border-gold-400/50 hover:text-gold-300"
      >
        Reintentar
      </button>
    </div>
  );
}

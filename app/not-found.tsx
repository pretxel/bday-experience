import { AmbientBackground } from "@/components/ambient/AmbientBackground";

/**
 * The root not-found page.
 *
 * There is no link back: the root is a dead end on purpose, and pointing
 * anywhere would either leak the slug or land on this same page.
 */

/**
 * Rendered per request on purpose.
 *
 * The global 404 is prerendered by default, and a prerendered document
 * cannot carry the per-request CSP nonce — every inline script in it is
 * blocked by the policy. Rendering it dynamically puts the nonce in the
 * markup.
 */
export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <>
      <AmbientBackground />
      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <p className="text-xs tracking-[0.35em] text-gold-400/70 uppercase">
          No encontrado
        </p>
        <h1 className="mt-6 font-display text-4xl text-cream-50 sm:text-5xl">
          Aquí no hay nada
        </h1>
        <p className="mt-5 max-w-sm text-sm leading-relaxed text-blush-200/55">
          Esta experiencia tiene su propia dirección. Si te la han compartido,
          ábrela tal cual, con el enlace completo.
        </p>
      </div>
    </>
  );
}

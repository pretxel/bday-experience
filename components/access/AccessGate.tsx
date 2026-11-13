"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

import { DURATION, EASE } from "@/components/motion/MotionProvider";

/**
 * The access gate.
 *
 * A single shared code unlocks the experience. The failure message is the
 * same for every rejection, so nothing about the stored credentials can be
 * inferred from what the visitor sees.
 */
/**
 * `false` while the component is being server-rendered or hydrated, `true`
 * afterwards.
 *
 * `useSyncExternalStore` is the idiomatic way to express "am I hydrated?"
 * without setting state inside an effect.
 */
const noopSubscribe = () => () => {};

function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function AccessGate({ slug }: { slug: string }) {
  const router = useRouter();

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  /**
   * The form is only usable once the client has hydrated.
   *
   * Before that, a native submit would put the access code into the query
   * string, where it would end up in the browser history and in the server
   * logs. The button stays disabled until hydration completes.
   */
  const hydrated = useHydrated();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, slug }),
      });

      if (response.ok) {
        const payload: unknown = await response.json();

        if (
          typeof payload === "object" &&
          payload !== null &&
          (payload as { ok?: unknown }).ok === true
        ) {
          router.replace(`/${slug}/bienvenida`);
          router.refresh();
          return;
        }
      }

      setError(
        response.status === 429
          ? "Demasiados intentos. Espera un momento e inténtalo de nuevo."
          : "Ese código no es correcto. Inténtalo de nuevo.",
      );
    } catch {
      setError("No pudimos comprobar el código. Inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="page-shell flex flex-1 flex-col items-center justify-center py-16">
      <div className="w-full max-w-md">
        <div data-reveal className="text-center">
          <p className="text-xs tracking-[0.35em] text-gold-400/80 uppercase">
            Una experiencia privada
          </p>
          <h1 className="mt-6 font-display text-4xl leading-tight text-cream-50 sm:text-5xl">
            Algo he preparado
            <br />
            <span className="italic text-blush-200">para ti</span>
          </h1>
          <p className="mt-6 text-sm leading-relaxed text-blush-200/60">
            Para entrar, escribe el código que compartimos.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          method="post"
          className="panel mt-10 p-7"
          data-reveal
          style={{ "--reveal-delay": "160ms" } as React.CSSProperties}
        >
          <label
            htmlFor="access-code"
            className="block text-xs tracking-[0.2em] text-blush-200/60 uppercase"
          >
            Código de acceso
          </label>

          <input
            id="access-code"
            name="code"
            type="password"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            maxLength={128}
            disabled={pending || !hydrated}
            aria-invalid={error !== null}
            aria-describedby={error !== null ? "access-code-error" : undefined}
            className="mt-3 w-full rounded-xl border border-blush-300/15 bg-plum-950/50 px-4 py-3 text-lg tracking-[0.3em] text-cream-50 transition-colors duration-300 placeholder:text-blush-200/25 focus:border-gold-400/50 focus:outline-none disabled:opacity-60"
            placeholder="••••••••"
          />

          <AnimatePresence initial={false}>
            {error !== null && (
              <motion.p
                id="access-code-error"
                role="alert"
                key="error"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: DURATION.quick, ease: EASE }}
                className="mt-4 text-sm text-blush-300"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={pending || !hydrated}
            className="mt-6 w-full cursor-pointer rounded-xl bg-linear-to-r from-blush-600 to-plum-600 px-6 py-3 text-sm tracking-[0.2em] text-cream-50 uppercase transition-all duration-300 hover:from-blush-500 hover:to-plum-500 hover:shadow-[0_10px_40px_-16px_rgba(221,155,173,0.6)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
          >
            {pending ? "Comprobando…" : "Abrir"}
          </button>
        </form>
      </div>
    </main>
  );
}

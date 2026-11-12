import Link from "next/link";
import { notFound } from "next/navigation";

import { ContentUnavailable } from "@/components/content/ContentUnavailable";
import { Reveal } from "@/components/motion/Reveal";
import { requireSession } from "@/lib/auth/guard";
import { getContent } from "@/lib/content/loader";

/** The personalized welcome. */
export default async function BienvenidaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // The session is checked before the content is loaded, so nothing private
  // is ever read — let alone serialised — for an unauthenticated visitor.
  await requireSession(slug);

  const result = await getContent(slug);

  if (!result.ok) {
    if (result.reason === "not_found") {
      notFound();
    }

    return <ContentUnavailable />;
  }

  const { title, recipient, dateLabel, subtitle } = result.content;

  return (
    <section className="page-shell flex flex-1 flex-col items-center justify-center py-16 text-center sm:py-24">
      <Reveal>
        <p className="text-xs tracking-[0.35em] text-gold-400/80 uppercase">
          {dateLabel}
        </p>
      </Reveal>

      <Reveal delay={140}>
        <h1 className="mt-7 max-w-2xl font-display text-5xl leading-[1.05] text-cream-50 sm:text-6xl md:text-7xl">
          {title}
        </h1>
      </Reveal>

      <Reveal delay={300}>
        <div
          aria-hidden="true"
          className="mt-8 h-px w-16 bg-linear-to-r from-transparent via-gold-400/60 to-transparent"
        />
      </Reveal>

      {subtitle !== null && (
        <Reveal delay={400}>
          <p className="mt-8 max-w-xl text-base leading-relaxed text-blush-200/70 sm:text-lg">
            {subtitle}
          </p>
        </Reveal>
      )}

      <Reveal delay={520}>
        <p className="mt-10 font-display text-2xl italic text-blush-200 sm:text-3xl">
          Para {recipient}
        </p>
      </Reveal>

      <Reveal delay={640}>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <Link
            href={`/${slug}/carta`}
            className="rounded-xl bg-linear-to-r from-blush-600 to-plum-600 px-7 py-3 text-sm tracking-[0.18em] text-cream-50 uppercase transition-all duration-300 hover:from-blush-500 hover:to-plum-500 hover:shadow-[0_12px_40px_-18px_rgba(221,155,173,0.7)]"
          >
            Leer la carta
          </Link>
          <Link
            href={`/${slug}/playlist`}
            className="rounded-xl border border-blush-300/20 px-7 py-3 text-sm tracking-[0.18em] text-cream-100 uppercase transition-colors duration-300 hover:border-gold-400/50 hover:text-gold-300"
          >
            Escuchar la playlist
          </Link>
        </div>
      </Reveal>

      <Reveal delay={760}>
        <p className="mt-14 text-sm text-blush-200/35">
          Esto es solo el comienzo.
        </p>
      </Reveal>
    </section>
  );
}

import { notFound } from "next/navigation";

import { ContentUnavailable } from "@/components/content/ContentUnavailable";
import { Reveal } from "@/components/motion/Reveal";
import { requireSession } from "@/lib/auth/guard";
import { getContent } from "@/lib/content/loader";

/**
 * The Spotify playlist.
 *
 * The embed is rendered inside a container with reserved dimensions, so the
 * layout never shifts when the iframe finishes loading.
 */
export default async function PlaylistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Checked before the content is loaded: see the note in `requireSession`.
  await requireSession(slug);

  const result = await getContent(slug);

  if (!result.ok) {
    if (result.reason === "not_found") {
      notFound();
    }

    return <ContentUnavailable />;
  }

  const { title, recipient, spotifyEmbedUrl } = result.content;

  return (
    <section className="page-shell flex flex-1 flex-col items-center py-16 sm:py-20">
      <Reveal className="text-center">
        <p className="text-xs tracking-[0.35em] text-gold-400/80 uppercase">
          La banda sonora
        </p>
        <h1 className="mt-6 font-display text-4xl text-cream-50 sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 text-sm text-blush-200/55">
          Canciones para {recipient}
        </p>
      </Reveal>

      <Reveal delay={180} className="mt-12 w-full max-w-2xl">
        {spotifyEmbedUrl !== null ? (
          <div className="panel overflow-hidden p-2 sm:p-3">
            <iframe
              src={spotifyEmbedUrl}
              title="Playlist de cumpleaños"
              height={352}
              width="100%"
              loading="lazy"
              /*
               * Spotify's player honours the `color-scheme` attribute of the
               * iframe it is embedded in. React has no typed prop for it, so
               * it is passed through as a custom attribute.
               */
              {...({ "color-scheme": "dark" } as Record<string, string>)}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
              className="block h-[352px] w-full rounded-xl"
              style={{ border: 0 }}
            />
          </div>
        ) : (
          <div className="panel flex min-h-[352px] flex-col items-center justify-center gap-4 p-10 text-center">
            <span
              aria-hidden="true"
              className="h-10 w-10 rounded-full border border-gold-400/30 bg-linear-to-br from-blush-600/30 to-plum-600/30"
            />
            <p className="font-display text-xl text-cream-100">
              La playlist está casi lista
            </p>
            <p className="max-w-sm text-sm leading-relaxed text-blush-200/50">
              Te la estaré enviando en cuanto la termine. Mientras tanto, quédate
              un momento por aquí.
            </p>
          </div>
        )}
      </Reveal>

      <Reveal delay={320}>
        <p className="mt-10 max-w-lg text-center text-sm leading-relaxed text-blush-200/40">
          Pon los cascos. Baja el volumen del mundo. Esto es para ti.
        </p>
      </Reveal>
    </section>
  );
}

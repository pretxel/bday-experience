import { notFound } from "next/navigation";

import { ContentUnavailable } from "@/components/content/ContentUnavailable";
import { requireSession } from "@/lib/auth/guard";
import { getContent } from "@/lib/content/loader";

/**
 * The birthday letter.
 *
 * The Markdown was parsed and sanitized on the server; this component only
 * injects the resulting HTML. Each block is revealed in sequence so the
 * letter reads as if it is being unfolded.
 */
export default async function CartaPage({
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

  const { title, recipient, dateLabel, bodyBlocks } = result.content;

  return (
    <article className="page-shell flex flex-1 flex-col items-center py-16 sm:py-20">
      <header className="max-w-2xl text-center">
        <div data-reveal>
          <p className="text-xs tracking-[0.35em] text-gold-400/80 uppercase">
            {dateLabel}
          </p>
        </div>
        <div data-reveal style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
          <h1 className="mt-6 font-display text-4xl text-cream-50 sm:text-5xl">
            {title}
          </h1>
        </div>
        <div
          data-reveal
          style={{ "--reveal-delay": "220ms" } as React.CSSProperties}
        >
          <p className="mt-4 font-display text-xl italic text-blush-200/80">
            Para {recipient}
          </p>
        </div>
      </header>

      <div className="letter-body mt-14 w-full max-w-2xl">
        {bodyBlocks.map((block, index) => (
          <div
            key={index}
            data-reveal
            style={{ "--reveal-delay": `${280 + index * 110}ms` } as React.CSSProperties}
            dangerouslySetInnerHTML={{ __html: block }}
          />
        ))}
      </div>

      {bodyBlocks.length === 0 && (
        <p className="mt-14 text-sm text-blush-200/40">
          La carta está en camino.
        </p>
      )}
    </article>
  );
}

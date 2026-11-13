import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteNav } from "@/components/layout/SiteNav";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { PageTransition } from "@/components/motion/PageTransition";
import { requireSession } from "@/lib/auth/guard";
import { getContent } from "@/lib/content/loader";

/**
 * The protected shell.
 *
 * Every private page inherits the session guard from this layout, so a new
 * page cannot accidentally be left unguarded.
 */
export default async function ProtectedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  await requireSession(slug);

  /*
   * The recipient's name comes from the content, never from the slug: the
   * slug is a random key and says nothing about who the experience is for.
   * The loader is memoised per request, so this costs nothing extra.
   */
  const result = await getContent(slug);
  const recipient = result.ok ? result.content.recipient : null;

  return (
    <MotionProvider>
      <SiteNav slug={slug} />
      <main className="flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
      <SiteFooter recipient={recipient} />
    </MotionProvider>
  );
}

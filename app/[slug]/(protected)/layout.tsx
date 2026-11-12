import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteNav } from "@/components/layout/SiteNav";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { PageTransition } from "@/components/motion/PageTransition";
import { requireSession } from "@/lib/auth/guard";

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

  return (
    <MotionProvider>
      <SiteNav slug={slug} />
      <main className="flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
      <SiteFooter slug={slug} />
    </MotionProvider>
  );
}

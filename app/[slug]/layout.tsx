import { notFound } from "next/navigation";

import { AmbientBackground } from "@/components/ambient/AmbientBackground";
import { isValidSlug } from "@/lib/slug";

/**
 * The public shell for a recipient.
 *
 * It deliberately contains no session guard: the access gate lives at
 * `/[slug]` and must stay reachable without a session.
 */
export default async function SlugLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}>) {
  const { slug } = await params;

  if (!isValidSlug(slug)) {
    notFound();
  }

  return (
    <>
      <AmbientBackground />
      <div className="relative z-10 flex min-h-dvh flex-col">{children}</div>
    </>
  );
}

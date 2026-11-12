import { notFound } from "next/navigation";

import { AccessGate } from "@/components/access/AccessGate";
import { hasContent } from "@/lib/content/loader";

/**
 * The access screen.
 *
 * It shows no private content — only the fact that a recipient exists — so
 * nothing is revealed before the code is entered.
 */
export default async function GatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!(await hasContent(slug))) {
    notFound();
  }

  return <AccessGate slug={slug} />;
}

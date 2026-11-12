import { redirect } from "next/navigation";

import { env } from "@/lib/config/env";

/**
 * The root path redirects to the configured recipient.
 *
 * Changing `RECIPIENT_SLUG` is all it takes to point the deployment at a
 * different person.
 */
export default function RootPage(): never {
  redirect(`/${env.RECIPIENT_SLUG}`);
}

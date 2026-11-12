"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The navigation between the three private pages of a recipient.
 *
 * The current page is marked with `aria-current` so it is announced as well
 * as styled.
 */
const LINKS = [
  { segment: "bienvenida", label: "Bienvenida" },
  { segment: "playlist", label: "Playlist" },
  { segment: "carta", label: "Carta" },
] as const;

export function SiteNav({ slug }: { slug: string }) {
  const pathname = usePathname();

  return (
    <header className="page-shell pt-8 pb-2">
      <nav aria-label="Secciones">
        <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {LINKS.map((link) => {
            const href = `/${slug}/${link.segment}`;
            const isCurrent = pathname === href;

            return (
              <li key={link.segment}>
                <Link
                  href={href}
                  aria-current={isCurrent ? "page" : undefined}
                  className={`relative text-sm tracking-[0.18em] uppercase transition-colors duration-300 ${
                    isCurrent
                      ? "text-gold-300"
                      : "text-blush-200/60 hover:text-blush-200"
                  }`}
                >
                  {link.label}
                  <span
                    aria-hidden="true"
                    className={`absolute -bottom-1.5 left-1/2 h-px -translate-x-1/2 bg-gold-400 transition-all duration-500 ${
                      isCurrent ? "w-full" : "w-0"
                    }`}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}

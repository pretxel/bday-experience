import { LogoutButton } from "./LogoutButton";

/**
 * The footer of the private pages.
 *
 * The recipient's name comes from the content, not from the slug — the slug
 * is a random key.
 */
export function SiteFooter({ recipient }: { recipient: string | null }) {
  return (
    <footer className="page-shell mt-auto pt-10 pb-8">
      <div className="flex items-center justify-center gap-4">
        <span
          aria-hidden="true"
          className="h-px w-10 bg-linear-to-r from-transparent to-blush-300/30"
        />
        <LogoutButton />
        <span
          aria-hidden="true"
          className="h-px w-10 bg-linear-to-l from-transparent to-blush-300/30"
        />
      </div>
      {recipient !== null && (
        <p className="mt-4 text-center text-[0.7rem] tracking-[0.2em] text-blush-200/25 uppercase">
          Para {recipient}
        </p>
      )}
    </footer>
  );
}

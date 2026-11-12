import { LogoutButton } from "./LogoutButton";

/** The footer of the private pages. */
export function SiteFooter({ slug }: { slug: string }) {
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
      <p className="mt-4 text-center text-[0.7rem] tracking-[0.2em] text-blush-200/25 uppercase">
        Para {slug.charAt(0).toUpperCase() + slug.slice(1)}
      </p>
    </footer>
  );
}

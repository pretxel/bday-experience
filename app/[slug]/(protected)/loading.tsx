/** The themed loading state for the private pages. */
export default function ProtectedLoading() {
  return (
    <div className="page-shell flex flex-1 flex-col items-center justify-center py-24">
      <div
        aria-hidden="true"
        className="ambient-breathe h-2 w-2 rounded-full bg-gold-400 shadow-[0_0_30px_8px_rgba(220,189,118,0.35)]"
      />
      <p className="mt-6 text-xs tracking-[0.35em] text-blush-200/40 uppercase">
        Un momento
      </p>
    </div>
  );
}

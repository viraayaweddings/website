/**
 * Shown while a screen's queries run.
 *
 * Every admin page is force-dynamic and opens with several database reads, so
 * navigation used to leave the previous screen on the display with no sign that
 * anything was happening.
 */
export default function AdminLoading() {
  return (
    <div className="vw-admin-loading px-6 py-10" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <div className="vw-skeleton h-8 w-64" />
        <div className="vw-skeleton h-4 w-96" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="vw-skeleton h-24" />
          ))}
        </div>
        <div className="vw-skeleton h-64" />
      </div>
    </div>
  );
}

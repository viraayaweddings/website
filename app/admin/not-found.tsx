import Link from "next/link";

/**
 * The [id] routes call notFound() for a bad id or a deleted row; without this
 * they fell through to the site's own 404, which is not the admin chrome.
 */
export default function AdminNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border p-6" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
        <p className="vw-eyebrow">Admin</p>
        <h1 className="mt-2 text-lg font-semibold" style={{ color: "var(--ink)" }}>
          Not found
        </h1>
        <p className="mt-3 text-sm leading-6" style={{ color: "var(--ink-soft)" }}>
          That record does not exist, or it was deleted while you were looking at it.
        </p>
        <Link href="/admin" className="vw-btn vw-btn-secondary mt-5">
          Back to the dashboard
        </Link>
      </div>
    </div>
  );
}

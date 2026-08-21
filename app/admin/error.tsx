"use client";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const message =
    error.name === "DatabaseUnavailableError" || /database|postgres|DATABASE_URL|POSTGRES_URL/i.test(error.message)
      ? "The admin panel cannot reach Postgres. In Vercel, confirm POSTGRES_URL is set for Production, redeploy, then open /admin/health to see the exact error."
      : error.message || "Something went wrong loading the admin panel.";

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="max-w-lg rounded-2xl border border-red-200 bg-red-50 p-6 text-red-950">
        <h1 className="text-lg font-semibold">Admin unavailable</h1>
        <p className="mt-3 text-sm leading-6">{message}</p>
        <button
          type="button"
          className="mt-4 rounded-lg bg-red-900 px-4 py-2 text-sm font-medium text-white"
          onClick={() => reset()}
        >
          Try again
        </button>
      </div>
    </div>
  );
}

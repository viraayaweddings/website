/**
 * Server layout for every admin screen.
 *
 * Client components (nav rail, top bar, toasts) are siblings of the main
 * column — page content never crosses a client boundary, which breaks vinext
 * production renders when action buttons or tables are server components.
 *
 * The toaster is not wrapped in Suspense. Every admin screen is force-dynamic,
 * so `useSearchParams()` needs no boundary here, and inside one the component
 * never hydrated at all: its effect did not run on a full page load, and no
 * server action's success or error message was ever shown.
 */
import type { User } from "@/worker/db/schema";
import { AdminHeaderBar } from "./AdminHeaderBar";
import { SideNav } from "./SideNav";
import { Toaster } from "./Toaster";

export function AdminShell({
  user,
  title,
  subtitle,
  actions,
  children,
}: {
  user: User;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const safeUser = { name: user.name, email: user.email, role: user.role };

  return (
    <div className="flex min-h-screen">
      <SideNav role={safeUser.role} name={safeUser.name} email={safeUser.email} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeaderBar user={safeUser} title={title} />

        <main className="min-w-0 flex-1 px-4 py-5 md:px-6 md:py-7">
          <div className="mx-auto w-full max-w-[86rem]">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <h1 className="vw-display text-2xl font-semibold" style={{ color: "var(--ink)" }}>
                  {title}
                </h1>
                {subtitle ? (
                  <p className="mt-1 text-sm" style={{ color: "var(--ink-soft)" }}>
                    {subtitle}
                  </p>
                ) : null}
              </div>
              {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
            </div>

            {children}
          </div>
        </main>
      </div>

      <Toaster />
    </div>
  );
}

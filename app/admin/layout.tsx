import type { Metadata } from "next";
import { redirect } from "next/navigation";
import "./admin.css";
import { THEME_BOOTSTRAP } from "./_lib/theme";
import { AdminCsrfMeta } from "./_components/AdminCsrfMeta";
import { adminPathFromRequest } from "./_lib/admin-path";
import { loadAdminCsrf } from "@/worker/admin/csrf";

export const metadata: Metadata = {
  title: "Admin · Viraaya Weddings",
  robots: { index: false, follow: false },
};

// Server-rendered per request: every page reads the session cookie.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const token = await loadAdminCsrf();
  if (!token) {
    const next = await adminPathFromRequest();
    redirect(`/api/admin/csrf?next=${encodeURIComponent(next)}`);
  }

  return (
    // `vw-admin` scopes the panel's tokens so none of them reach the public
    // site, whose stylesheet is shared and must stay untouched.
    // suppressHydrationWarning: the bootstrap script below rewrites data-theme
    // before React hydrates, so the server's "light" and the client's actual
    // theme are expected to differ on that one attribute.
    <div className="vw-admin" data-theme="light" suppressHydrationWarning>
      <AdminCsrfMeta />
      {/* Applies the stored theme before the first paint; a React effect would
          run a frame too late and flash the wrong one. */}
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      <div className="vw-admin-surface">{children}</div>
    </div>
  );
}

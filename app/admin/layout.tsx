import type { Metadata } from "next";
import "./admin.css";
import { THEME_BOOTSTRAP } from "./_components/ThemeToggle";

export const metadata: Metadata = {
  title: "Admin · Viraaya Weddings",
  robots: { index: false, follow: false },
};

// Server-rendered per request: every page reads the session cookie.
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    // `vw-admin` scopes the panel's tokens so none of them reach the public
    // site, whose stylesheet is shared and must stay untouched.
    // suppressHydrationWarning: the bootstrap script below rewrites data-theme
    // before React hydrates, so the server's "light" and the client's actual
    // theme are expected to differ on that one attribute.
    <div className="vw-admin" data-theme="light" suppressHydrationWarning>
      {/* Applies the stored theme before the first paint; a React effect would
          run a frame too late and flash the wrong one. */}
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      <div className="vw-admin-surface">{children}</div>
    </div>
  );
}

"use client";

/**
 * The interactive half of the shell: navigation rail, sticky top bar with
 * breadcrumb and search.
 *
 * Client-side so the rail can own the drawer state and highlight the current
 * route. Page headings and action buttons render in AdminShell (server) and
 * arrive here through `children`.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { CommandPalette } from "./CommandPalette";
import { Icon } from "./icons";
import { navLabel } from "./nav";
import { SideNav } from "./SideNav";
import { ThemeToggle } from "./ThemeToggle";
import { Toaster } from "./Toaster";

export function ShellChrome({
  user,
  title,
  children,
}: {
  user: { name: string; email: string; role: string };
  /** Used for breadcrumb labelling only (serialisable). */
  title: string;
  children: React.ReactNode;
}) {
  const [drawer, setDrawer] = useState(false);
  const pathname = usePathname();
  const section = navLabel(pathname);
  const onSectionRoot = section === title;

  return (
    <div className="flex min-h-screen">
      <SideNav
        role={user.role}
        name={user.name}
        email={user.email}
        open={drawer}
        onClose={() => setDrawer(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-40 flex items-center gap-3 border-b px-4 py-2.5 md:px-6"
          style={{
            borderColor: "var(--line)",
            background: "color-mix(in srgb, var(--canvas) 85%, transparent)",
            backdropFilter: "blur(10px)",
          }}
        >
          <button
            type="button"
            onClick={() => setDrawer(true)}
            className="vw-btn vw-btn-ghost vw-btn-icon md:hidden"
            aria-label="Open menu"
          >
            <Icon name="menu" size={18} />
          </button>

          <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-xs sm:flex">
            <Link href="/admin" className="hover:underline" style={{ color: "var(--ink-faint)" }}>
              Admin
            </Link>
            <span style={{ color: "var(--ink-faint)" }}>
              <Icon name="chevronRight" size={12} />
            </span>
            <span className="truncate font-medium" style={{ color: onSectionRoot ? "var(--ink)" : "var(--ink-faint)" }}>
              {section}
            </span>
            {onSectionRoot ? null : (
              <>
                <span style={{ color: "var(--ink-faint)" }}>
                  <Icon name="chevronRight" size={12} />
                </span>
                <span className="truncate font-medium" style={{ color: "var(--ink)" }}>
                  {title}
                </span>
              </>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <CommandPalette role={user.role} />
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="vw-btn vw-btn-ghost vw-btn-icon"
              title="Open the site"
              aria-label="Open the public site in a new tab"
            >
              <Icon name="external" size={16} />
            </a>
            <ThemeToggle />
            <span
              className="ml-1 grid h-8 w-8 flex-none place-items-center rounded-full text-xs font-semibold"
              style={{ background: "var(--accent-wash)", color: "var(--accent-strong)", border: "1px solid var(--accent-line)" }}
              title={`${user.name} · ${user.role}`}
            >
              {initials(user.name || user.email)}
            </span>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-5 md:px-6 md:py-7">
          <div className="mx-auto w-full max-w-[86rem]">{children}</div>
        </main>
      </div>

      <Suspense fallback={null}>
        <Toaster />
      </Suspense>
    </div>
  );
}

function initials(value: string): string {
  const parts = value.trim().split(/[\s@.]+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CommandPalette } from "./CommandPalette";
import { Icon } from "./icons";
import { navLabel } from "./nav";
import { ThemeToggle } from "./ThemeToggle";

export const ADMIN_NAV_OPEN_EVENT = "vw-admin-open-nav";

export function AdminHeaderBar({
  user,
  title,
}: {
  user: { name: string; email: string; role: string };
  title: string;
}) {
  const pathname = usePathname();
  const section = navLabel(pathname);
  const onSectionRoot = section === title;

  return (
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
        onClick={() => window.dispatchEvent(new Event(ADMIN_NAV_OPEN_EVENT))}
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
  );
}

function initials(value: string): string {
  const parts = value.trim().split(/[\s@.]+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

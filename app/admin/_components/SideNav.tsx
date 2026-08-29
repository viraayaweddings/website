"use client";

/**
 * The navigation rail.
 *
 * Client-side for three reasons: it highlights the current route without each
 * page having to pass its own href, it collapses to an icon strip on wide
 * screens, and it becomes a drawer on narrow ones. The collapsed choice is
 * remembered per browser.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Icon, Monogram } from "./icons";
import { CsrfInput } from "./CsrfInput";
import { ADMIN_NAV_OPEN_EVENT } from "./AdminHeaderBar";
import { navGroupsFor } from "./nav";

const COLLAPSE_KEY = "vw-admin-rail";
const COLLAPSE_CHANGE_EVENT = "vw-admin-rail-change";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

function isCurrent(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

function subscribeCollapsed(callback: () => void): () => void {
  window.addEventListener(COLLAPSE_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(COLLAPSE_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function serverCollapsedSnapshot(): boolean {
  return false;
}

export function SideNav({
  role,
  name,
  email,
  csrfToken,
}: {
  role: string;
  name: string;
  email: string;
  csrfToken: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Expanded for the server and the first client render. The stored browser
  // choice is read through useSyncExternalStore so hydration keeps the same
  // text/link tree and React updates it immediately after.
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, serverCollapsedSnapshot);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(ADMIN_NAV_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(ADMIN_NAV_OPEN_EVENT, onOpen);
  }, []);

  const toggleCollapsed = useCallback(() => {
    const next = !readCollapsed();
    try {
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
    } catch {
      /* private browsing; the rail simply stays expanded */
    }
    window.dispatchEvent(new Event(COLLAPSE_CHANGE_EVENT));
  }, []);

  const groups = navGroupsFor(role);
  const width = collapsed ? "4.25rem" : "15rem";

  return (
    <>
      {open ? (
        <button
          type="button"
          className="vw-scrim md:hidden"
          onClick={close}
          aria-label="Close menu"
        />
      ) : null}

      <aside
        className="vw-rail vw-drawer vw-scroll"
        data-open={open}
        style={{ width }}
        aria-label="Sections"
      >
        <div className="flex items-center gap-2.5 px-3 py-4">
          <Monogram size={32} />
          {collapsed ? null : (
            <span className="min-w-0">
              <span className="vw-display block truncate text-sm" style={{ color: "var(--rail-ink-strong)" }}>
                Viraaya Weddings
              </span>
              <span className="block text-[0.625rem] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--accent)" }}>
                Admin
              </span>
            </span>
          )}
          <button
            type="button"
            onClick={close}
            className="vw-btn vw-btn-ghost vw-btn-icon ml-auto md:hidden"
            style={{ color: "var(--rail-ink)" }}
            aria-label="Close menu"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <nav className="flex-1 space-y-5 px-2 pb-4">
          {groups.map((group) => (
            <div key={group.title}>
              {collapsed ? (
                <div className="mx-2 mb-2 border-t" style={{ borderColor: "var(--rail-hover)" }} />
              ) : (
                <p className="vw-rail-group">{group.title}</p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const on = isCurrent(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-on={on}
                      onClick={close}
                      className="vw-rail-link"
                      title={collapsed ? item.label : undefined}
                      aria-current={on ? "page" : undefined}
                      style={collapsed ? { justifyContent: "center", padding: "0.55rem" } : undefined}
                    >
                      <span className="vw-rail-icon">
                        <Icon name={item.icon} size={17} />
                      </span>
                      {collapsed ? <span className="sr-only">{item.label}</span> : <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto border-t px-2 py-3" style={{ borderColor: "var(--rail-hover)" }}>
          {collapsed ? null : (
            <div className="mb-2 px-2">
              <p className="truncate text-xs font-semibold" style={{ color: "var(--rail-ink-strong)" }}>
                {name}
              </p>
              <p className="truncate text-[0.6875rem]" style={{ color: "var(--rail-ink)" }}>
                {email}
              </p>
            </div>
          )}

          <form action="/admin/logout" method="post">
            <CsrfInput token={csrfToken} />
            <button
              type="submit"
              className="vw-rail-link w-full"
              style={collapsed ? { justifyContent: "center", padding: "0.55rem" } : undefined}
              title="Sign out"
            >
              <span className="vw-rail-icon">
                <Icon name="logout" size={17} />
              </span>
              {collapsed ? <span className="sr-only">Sign out</span> : <span>Sign out</span>}
            </button>
          </form>

          <button
            type="button"
            onClick={toggleCollapsed}
            className="vw-rail-link mt-0.5 hidden w-full md:flex"
            style={collapsed ? { justifyContent: "center", padding: "0.55rem" } : undefined}
            title={collapsed ? "Expand menu" : "Collapse menu"}
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
          >
            <span className="vw-rail-icon">
              <Icon name={collapsed ? "chevronRight" : "chevronLeft"} size={17} />
            </span>
            {collapsed ? null : <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

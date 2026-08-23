"use client";

/**
 * Light/dark switch for the panel.
 *
 * The choice is stored per browser and applied by an inline script in the
 * layout before first paint, so this component only has to keep the two in
 * step after a click. The key and that script live in _lib/theme.ts, which
 * the layout can import without crossing a client boundary.
 *
 * The current theme lives on the DOM rather than in React state — the
 * bootstrap script owns it before React exists — so it is read through
 * useSyncExternalStore. That keeps the button honest without an effect that
 * would set state on every mount.
 */

import { useCallback, useSyncExternalStore } from "react";
import { THEME_KEY } from "../_lib/theme";
import { Icon } from "./icons";

const THEME_CHANGE_EVENT = "vw-admin-theme-change";

function root(): HTMLElement | null {
  return document.querySelector(".vw-admin");
}

function isDark(): boolean {
  return root()?.getAttribute("data-theme") === "dark";
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(THEME_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function serverSnapshot(): boolean {
  return false;
}

export function ThemeToggle() {
  // Light for the server and the first client render. The bootstrap script may
  // already have applied a stored dark theme before hydration; reading it only
  // after mount prevents the button text/icon from disagreeing with the HTML
  // React is hydrating.
  const dark = useSyncExternalStore(subscribe, isDark, serverSnapshot);

  const toggle = useCallback(() => {
    const next = !isDark();
    const element = root();
    if (!element) return;

    // Transitions are suppressed across the switch so the panel never sits
    // half-way between the two themes while a dozen surfaces cross-fade.
    element.classList.add("vw-admin-flip");
    element.setAttribute("data-theme", next ? "dark" : "light");
    window.requestAnimationFrame(() => element.classList.remove("vw-admin-flip"));
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      /* private browsing; the choice simply does not persist */
    }
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      className="vw-btn vw-btn-ghost vw-btn-icon"
      title={dark ? "Switch to light" : "Switch to dark"}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={dark}
    >
      <Icon name={dark ? "sun" : "moon"} size={16} />
    </button>
  );
}

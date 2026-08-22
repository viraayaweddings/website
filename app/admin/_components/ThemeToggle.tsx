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

/** Subscribers are notified by the toggle itself; nothing else changes it. */
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function root(): HTMLElement | null {
  return document.querySelector(".vw-admin");
}

function isDark(): boolean {
  return root()?.getAttribute("data-theme") === "dark";
}

export function ThemeToggle() {
  // Light on the server: the markup is rendered before the browser's stored
  // choice is known, and the bootstrap script corrects it before paint.
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

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
    for (const listener of listeners) listener();
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

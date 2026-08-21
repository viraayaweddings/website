"use client";

/**
 * Turns the `?saved=` / `?error=` / `?deleted=` parameters that every server
 * action redirects with into transient toasts.
 *
 * Reading them from the URL rather than from state is what keeps the actions
 * plain redirects. The parameters are stripped once shown, so a refresh or a
 * shared link does not replay a message about something that already happened.
 */

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "./icons";

interface Toast {
  id: number;
  tone: "ok" | "bad" | "info";
  message: string;
}

const VISIBLE_MS = 5200;

export function Toaster() {
  const searchParams = useSearchParams();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    const found: Omit<Toast, "id">[] = [];

    const error = searchParams.get("error");
    if (error) found.push({ tone: "bad", message: error });

    const saved = searchParams.get("saved");
    if (saved !== null) found.push({ tone: "ok", message: saved && saved !== "1" ? saved : "Saved." });

    const deleted = searchParams.get("deleted");
    if (deleted !== null) found.push({ tone: "ok", message: deleted && deleted !== "1" ? deleted : "Deleted." });

    if (!found.length) return;

    const url = new URL(window.location.href);
    for (const key of ["error", "saved", "deleted"]) url.searchParams.delete(key);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);

    let next = 0;
    const timer = window.setTimeout(
      () => setToasts(found.map((toast) => ({ ...toast, id: next++ }))),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [searchParams]);

  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((toast) => window.setTimeout(() => dismiss(toast.id), VISIBLE_MS));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [toasts, dismiss]);

  if (!toasts.length) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[70] flex flex-col gap-2"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className={`vw-toast vw-toast-${toast.tone} pointer-events-auto`}>
          <span className="mt-0.5 flex-none" style={{ color: toast.tone === "bad" ? "var(--bad)" : "var(--ok)" }}>
            <Icon name={toast.tone === "bad" ? "warning" : "check"} size={15} />
          </span>
          <p className="min-w-0 flex-1 break-words">{toast.message}</p>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss"
            className="vw-btn vw-btn-ghost vw-btn-icon vw-btn-sm -mr-1 -mt-0.5 flex-none"
          >
            <Icon name="close" size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

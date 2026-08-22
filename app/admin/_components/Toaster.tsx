"use client";

/**
 * Turns the `?saved=` / `?error=` / `?deleted=` parameters that every server
 * action redirects with into transient toasts.
 *
 * Reading them from the URL rather than from state is what keeps the actions
 * plain redirects. The parameters are stripped once shown, so a refresh or a
 * shared link does not replay a message about something that already happened.
 *
 * The queue lives outside React, and that is the whole point. Stripping the
 * parameters changes the URL, the router re-renders this subtree from a fresh
 * server payload, and a toast held in component state was thrown away in the
 * same tick it was added — so no server action in the panel ever showed its
 * success or error message. A module-level queue survives that remount; so does
 * `consumedSearch`, which is what stops a message being shown twice.
 *
 * The values are read from `window.location` rather than from the hook, which
 * comes back empty on a full page load here. The hook stays as the effect's
 * dependency because it is what changes when a redirect is a soft navigation.
 */

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { Icon } from "./icons";

interface Toast {
  id: number;
  tone: "ok" | "bad" | "info";
  message: string;
}

const VISIBLE_MS = 5200;
const MESSAGE_KEYS = ["error", "saved", "deleted"] as const;
const EMPTY: readonly Toast[] = [];

let queue: readonly Toast[] = EMPTY;
let nextId = 0;
/** The query string already turned into toasts, so a re-render cannot repeat it. */
let consumedSearch: string | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function dismissToast(id: number): void {
  queue = queue.filter((toast) => toast.id !== id);
  emit();
}

function pushToasts(found: Omit<Toast, "id">[]): void {
  const added = found.map((toast) => ({ ...toast, id: nextId++ }));
  queue = [...queue, ...added];
  emit();
  // Expiry is scheduled here rather than in an effect, so a remount does not
  // restart the clock on a message the reader has already had time to see.
  for (const toast of added) window.setTimeout(() => dismissToast(toast.id), VISIBLE_MS);
}

function readMessages(search: string): Omit<Toast, "id">[] {
  const params = new URLSearchParams(search);
  const found: Omit<Toast, "id">[] = [];

  const error = params.get("error");
  if (error) found.push({ tone: "bad", message: error });

  const saved = params.get("saved");
  if (saved !== null) found.push({ tone: "ok", message: saved && saved !== "1" ? saved : "Saved." });

  const deleted = params.get("deleted");
  if (deleted !== null) found.push({ tone: "ok", message: deleted && deleted !== "1" ? deleted : "Deleted." });

  return found;
}

/** Reads whatever the URL is carrying, then rewrites it without the message. */
function consumeUrlMessages(): void {
  const search = window.location.search;
  if (consumedSearch === search) return;
  consumedSearch = search;

  const found = readMessages(search);
  if (!found.length) return;

  const url = new URL(window.location.href);
  for (const key of MESSAGE_KEYS) url.searchParams.delete(key);
  // Marked consumed before the URL changes, so the re-run this causes is a
  // no-op rather than a second look at the same message.
  consumedSearch = url.search;
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);

  pushToasts(found);
}

export function Toaster() {
  // Only a change signal: the values are read from the URL.
  const searchParams = useSearchParams();
  const toasts = useSyncExternalStore(
    subscribe,
    () => queue,
    () => EMPTY,
  );

  const dismiss = useCallback((id: number) => dismissToast(id), []);

  useEffect(() => {
    consumeUrlMessages();
  }, [searchParams]);

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

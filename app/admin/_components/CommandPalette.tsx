"use client";

/**
 * Ctrl/Cmd+K: go anywhere, or find any venue, article, city or submission by
 * name without first working out which list it lives in.
 *
 * Navigation entries are matched locally so the palette is useful the instant
 * it opens; content is fetched from /admin/search, debounced, with each request
 * superseding the last so a fast typist never sees an older answer land.
 *
 * State is reset in the handlers that open and close it rather than in an
 * effect watching `open` — an effect would set state during a render pass that
 * has already committed, and cascade a second one.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon, type IconName } from "./icons";
import { navFor, type NavItem } from "./nav";

interface Hit {
  group: string;
  title: string;
  detail: string;
  href: string;
  status?: string;
}

/** A palette row: a navigation target and a content hit look the same here. */
interface Row extends Hit {
  icon: IconName;
}

const DEBOUNCE_MS = 180;
const MIN_QUERY = 2;

export function CommandPalette({ role }: { role: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  /** Bumped per keystroke; a response for an older token is discarded. */
  const token = useRef(0);

  const pages = useMemo(() => navFor(role), [role]);

  const matchedPages = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return pages;
    return pages.filter(
      (page) => page.label.toLowerCase().includes(needle) || (page.hint || "").toLowerCase().includes(needle),
    );
  }, [pages, query]);

  const results = useMemo<Row[]>(
    () => [
      ...matchedPages.map((page: NavItem) => ({
        group: "Go to",
        title: page.label,
        detail: page.hint || "",
        href: page.href,
        icon: page.icon,
      })),
      ...hits.map((hit) => ({ ...hit, icon: groupIcon(hit.group) })),
    ],
    [matchedPages, hits],
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setHits([]);
    setCursor(0);
  }, []);

  const show = useCallback(() => {
    setOpen(true);
    // Focus once the dialog has actually mounted.
    window.setTimeout(() => inputRef.current?.focus(), 10);
  }, []);

  // Open on Ctrl/Cmd+K from anywhere, close on Escape.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (open) close();
        else show();
      } else if (event.key === "Escape" && open) {
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, show]);

  // Only the fetch lives in an effect, and it sets state asynchronously.
  useEffect(() => {
    const needle = query.trim();
    if (needle.length < MIN_QUERY) return;

    const mine = ++token.current;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/admin/search?q=${encodeURIComponent(needle)}`);
        const body = (await response.json()) as { hits?: Hit[] };
        if (mine !== token.current) return; // A newer keystroke already won.
        setHits(body.hits ?? []);
      } catch {
        if (mine === token.current) setHits([]);
      } finally {
        if (mine === token.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    // Bumping on cleanup is what makes a superseded request harmless: the
    // cleanup only runs because the query moved on, or the palette closed.
    return () => {
      window.clearTimeout(timer);
      token.current += 1;
    };
  }, [query]);

  const onQueryChange = (value: string) => {
    setQuery(value);
    setCursor(0);
    if (value.trim().length < MIN_QUERY) {
      setHits([]);
      setLoading(false);
    } else {
      setLoading(true);
    }
  };

  const go = useCallback(
    (href: string) => {
      close();
      window.location.assign(href);
    },
    [close],
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((current) => (results.length ? (current + 1) % results.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((current) => (results.length ? (current - 1 + results.length) % results.length : 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const chosen = results[cursor];
      if (chosen) go(chosen.href);
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={show} className="vw-btn vw-btn-secondary gap-2 font-normal" aria-label="Search">
        <Icon name="search" size={15} />
        <span className="hidden sm:inline" style={{ color: "var(--ink-faint)" }}>
          Search…
        </span>
        <span className="vw-kbd ml-2 hidden sm:inline">Ctrl K</span>
      </button>
    );
  }

  let lastGroup = "";

  return (
    <>
      {/* A real button, so the backdrop is reachable by keyboard for free. */}
      <button type="button" className="vw-scrim" onClick={close} aria-label="Close search" />

      <div className="pointer-events-none fixed inset-0 z-[61] grid place-items-start justify-center pt-[10vh]">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Search and navigate"
          className="vw-dialog pointer-events-auto mx-4 w-[min(38rem,92vw)] overflow-hidden"
        >
          <div className="flex items-center gap-2.5 border-b px-4" style={{ borderColor: "var(--line)" }}>
            <Icon name="search" size={17} />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search venues, articles, cities, submissions…"
              aria-label="Search"
              className="w-full bg-transparent py-3.5 text-sm outline-none"
              style={{ color: "var(--ink)" }}
            />
            {loading ? (
              <span className="text-xs" style={{ color: "var(--ink-faint)" }}>
                …
              </span>
            ) : null}
            <button type="button" onClick={close} className="vw-kbd" aria-label="Close">
              Esc
            </button>
          </div>

          <div className="vw-scroll max-h-[52vh] overflow-y-auto p-2">
            {results.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm" style={{ color: "var(--ink-faint)" }}>
                {query.trim().length < MIN_QUERY ? "Type at least two characters." : "Nothing matches that."}
              </p>
            ) : (
              results.map((result, index) => {
                const heading = result.group !== lastGroup ? result.group : "";
                lastGroup = result.group;

                return (
                  <div key={`${result.href}-${index}`}>
                    {heading ? <p className="vw-eyebrow px-3 pb-1 pt-3 first:pt-1">{heading}</p> : null}
                    <button
                      type="button"
                      onMouseEnter={() => setCursor(index)}
                      onClick={() => go(result.href)}
                      aria-current={index === cursor}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left"
                      style={{
                        background: index === cursor ? "var(--surface-hover)" : "transparent",
                        color: "var(--ink)",
                      }}
                    >
                      <span className="flex-none" style={{ color: "var(--ink-faint)" }}>
                        <Icon name={result.icon} size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{result.title}</span>
                        {result.detail ? (
                          <span className="block truncate text-xs" style={{ color: "var(--ink-faint)" }}>
                            {result.detail}
                          </span>
                        ) : null}
                      </span>
                      {result.status ? (
                        <span className="vw-badge vw-badge-neutral flex-none">{result.status}</span>
                      ) : null}
                      <span className="flex-none" style={{ color: "var(--ink-faint)" }}>
                        <Icon name="chevronRight" size={14} />
                      </span>
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div
            className="flex items-center gap-3 border-t px-4 py-2 text-xs"
            style={{ borderColor: "var(--line)", color: "var(--ink-faint)" }}
          >
            <span className="flex items-center gap-1">
              <span className="vw-kbd">↑</span>
              <span className="vw-kbd">↓</span> move
            </span>
            <span className="flex items-center gap-1">
              <span className="vw-kbd">↵</span> open
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

function groupIcon(group: string): IconName {
  if (group === "Venues") return "venue";
  if (group === "Articles") return "article";
  if (group === "City pages") return "city";
  if (group === "Submissions") return "inbox";
  return "search";
}

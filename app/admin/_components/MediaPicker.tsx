"use client";

/**
 * Choose a picture from the media library, or upload one into it.
 *
 * Image fields used to be a file input and a path box, which meant the only way
 * to reuse a picture already on the site was to know its key. The library is
 * the source of truth for every image, so the field browses it: the value it
 * writes is the same `/media/<key>` path the renderers expect, whether it was
 * picked or uploaded.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ACCEPTED_UPLOAD_MIME_LIST, MAX_UPLOAD_BYTES } from "@/worker/admin/media-config";
import { Spinner } from "./FormControls";
import { Icon } from "./icons";

const MAX_MB = Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024);

interface LibraryImage {
  url: string;
  filename: string;
  size: number;
  width: number;
  height: number;
}

/** Stored values are already `/media/...`; a bare key is tolerated on read. */
export function imageSrc(value: string): string {
  const trimmed = (value || "").trim();
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed : `/media/${trimmed}`;
}

export function MediaPicker({
  label,
  name,
  defaultValue = "",
  required,
  hint,
  shape = "wide",
}: {
  label: string;
  /** Hidden field the chosen `/media/...` path is written to. */
  name: string;
  defaultValue?: string;
  required?: boolean;
  hint?: string;
  /** Wide for banners, card for thumbnails and social images. */
  shape?: "wide" | "card";
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);

  const box = shape === "wide" ? "h-24 w-40" : "h-24 w-24";
  const preview = imageSrc(value);

  return (
    <div>
      <span className="vw-label">
        {label}
        {required ? <span style={{ color: "var(--bad)" }}> *</span> : null}
      </span>

      <input type="hidden" name={name} value={value} />

      <div className="flex items-start gap-3">
        {preview ? (
          // Plain img: these come from R2, not the asset pipeline.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className={`vw-thumb flex-none object-cover ${box}`} loading="lazy" />
        ) : (
          <span
            className={`vw-thumb grid flex-none place-items-center ${box}`}
            style={{ color: "var(--ink-faint)" }}
            aria-hidden="true"
          >
            <Icon name="image" size={18} />
          </span>
        )}

        <div className="min-w-0 flex-1 space-y-2">
          <p className="vw-mono truncate text-xs" style={{ color: "var(--ink-faint)" }} title={value}>
            {value || (required ? "Required — nothing chosen yet" : "Nothing chosen")}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="vw-btn vw-btn-secondary vw-btn-sm" onClick={() => setOpen(true)}>
              <Icon name="image" size={13} />
              {value ? "Change picture" : "Choose picture"}
            </button>
            {value ? (
              <button type="button" className="vw-btn vw-btn-ghost vw-btn-sm" onClick={() => setValue("")}>
                <Icon name="close" size={13} />
                Clear
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <span className="vw-hint">
        {hint ? `${hint} ` : ""}
        Pictures come from the media library. Uploads join it, so the same file is never stored twice.
      </span>

      {open ? (
        <MediaBrowser
          title={label}
          onClose={() => setOpen(false)}
          onPick={(url) => {
            setValue(url);
            setOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

/** The modal itself. Mounted only while open so it never fetches in the background. */
function MediaBrowser({
  title,
  onClose,
  onPick,
}: {
  title: string;
  onClose: () => void;
  onPick: (url: string) => void;
}) {
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef(0);

  /**
   * Fetching happens outside React state on purpose: the effect below only
   * subscribes to the result, so nothing is set synchronously while rendering.
   */
  const fetchPage = useCallback(async (nextQuery: string, nextPage: number) => {
    const params = new URLSearchParams();
    if (nextQuery) params.set("q", nextQuery);
    if (nextPage > 1) params.set("page", String(nextPage));
    const response = await fetch(`/admin/media/upload${params.toString() ? `?${params}` : ""}`);
    const result = (await response.json()) as {
      images?: LibraryImage[];
      total?: number;
      hasMore?: boolean;
      error?: string;
    };
    if (!response.ok || !result.images) throw new Error(result.error || "Could not load the image library.");
    return result;
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchPage(query, page)
      .then((result) => {
        if (cancelled) return;
        setImages(result.images ?? []);
        setTotal(Number(result.total ?? result.images?.length ?? 0));
        setHasMore(Boolean(result.hasMore));
        setNotice("");
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setNotice(error instanceof Error ? error.message : "Could not load the image library.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchPage, query, page]);

  useEffect(() => {
    searchRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => () => window.clearTimeout(searchTimer.current), []);

  const upload = async (file: File) => {
    setLoading(true);
    setNotice("");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/admin/media/upload", { method: "POST", body });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        setNotice(result.error || "That upload failed.");
        return;
      }
      onPick(result.url);
    } catch {
      setNotice("That upload failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="vw-scrim" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Choose a picture for ${title}`}
        className="vw-dialog fixed inset-4 z-[66] mx-auto flex max-w-4xl flex-col overflow-hidden sm:inset-8"
      >
        <div className="vw-card-head flex-none">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold" style={{ color: "var(--ink)" }}>
              Choose a picture
            </h2>
            <p className="truncate text-xs" style={{ color: "var(--ink-faint)" }}>
              {total ? `${total.toLocaleString("en-IN")} in the library` : "Media library"} · for {title}
            </p>
          </div>
          <button
            type="button"
            className="vw-btn vw-btn-ghost vw-btn-icon vw-btn-sm"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="close" size={14} />
          </button>
        </div>

        <div
          className="flex flex-none flex-wrap items-center gap-2 border-b px-5 py-3"
          style={{ borderColor: "var(--line)" }}
        >
          <span className="vw-search-field min-w-[12rem] flex-1">
            <span className="vw-search-icon" style={{ color: "var(--ink-faint)" }}>
              <Icon name="search" size={15} />
            </span>
            <input
              ref={searchRef}
              type="search"
              className="vw-input vw-search-input"
              placeholder="Search by file name"
              aria-label="Search the image library"
              onChange={(event) => {
                const next = event.target.value;
                window.clearTimeout(searchTimer.current);
                searchTimer.current = window.setTimeout(() => {
                  setLoading(true);
                  setPage(1);
                  setQuery(next.trim());
                }, 320);
              }}
            />
          </span>
          <label className="vw-btn vw-btn-secondary vw-btn-sm" style={{ cursor: "pointer" }}>
            <Icon name="upload" size={13} />
            Upload
            <input
              type="file"
              accept={ACCEPTED_UPLOAD_MIME_LIST}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void upload(file);
              }}
            />
          </label>
        </div>

        <div className="vw-scroll min-h-0 flex-1 overflow-y-auto p-5">
          {notice ? (
            <div className="vw-alert vw-alert-bad mb-3" role="alert">
              <span className="mt-0.5 flex-none">
                <Icon name="warning" size={15} />
              </span>
              <div className="min-w-0">{notice}</div>
            </div>
          ) : null}

          {loading ? (
            <p className="flex items-center gap-2 text-sm" style={{ color: "var(--ink-faint)" }}>
              <Spinner /> Loading…
            </p>
          ) : images.length === 0 ? (
            <div className="vw-empty">
              <span className="vw-empty-icon">
                <Icon name="image" size={20} />
              </span>
              <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                {query ? "No pictures match" : "Nothing uploaded yet"}
              </p>
              <p className="max-w-sm text-sm">
                {query ? "Try a different file name." : "Upload one above and it joins the library."}
              </p>
            </div>
          ) : (
            <div className="vw-grid-cards">
              {images.map((image) => (
                <button
                  key={image.url}
                  type="button"
                  onClick={() => onPick(image.url)}
                  className="vw-card overflow-hidden p-0 text-left transition hover:-translate-y-px"
                  title={image.filename}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt=""
                    className="h-28 w-full object-cover"
                    loading="lazy"
                    style={{ background: "var(--surface-2)" }}
                  />
                  <span className="block truncate px-2.5 py-2 text-xs" style={{ color: "var(--ink-soft)" }}>
                    {image.filename}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          className="flex flex-none items-center justify-between gap-3 border-t px-5 py-3 text-xs"
          style={{ borderColor: "var(--line)", color: "var(--ink-faint)" }}
        >
          <span>Up to {MAX_MB}MB · JPEG, PNG, WebP or AVIF</span>
          <span className="flex items-center gap-2">
            <button
              type="button"
              className="vw-btn vw-btn-secondary vw-btn-sm"
              disabled={page <= 1 || loading}
              onClick={() => {
                setLoading(true);
                setPage((current) => Math.max(1, current - 1));
              }}
            >
              <Icon name="chevronLeft" size={13} />
              Previous
            </button>
            <button
              type="button"
              className="vw-btn vw-btn-secondary vw-btn-sm"
              disabled={!hasMore || loading}
              onClick={() => {
                setLoading(true);
                setPage((current) => current + 1);
              }}
            >
              Next
            </button>
          </span>
        </div>
      </div>
    </>
  );
}

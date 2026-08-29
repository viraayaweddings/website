"use client";

/**
 * Drag-and-drop upload zone for the image library.
 *
 * Posts to the same endpoint the editor uses, one file at a time so a single
 * rejected file does not take the rest of the batch with it, then refreshes the
 * server component so the new images appear in the grid.
 */

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ACCEPTED_UPLOAD_MIME_LIST, MAX_UPLOAD_BYTES } from "@/worker/admin/media-config";
import { Icon } from "./icons";
import { Spinner } from "./FormControls";
import { formatBytes } from "./ui";
import { adminCsrfHeader } from "../_lib/csrf-fetch";

const ACCEPTED = new Set(ACCEPTED_UPLOAD_MIME_LIST.split(","));

export function Uploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(0);
  const [failures, setFailures] = useState<string[]>([]);

  const send = useCallback(
    async (files: File[]) => {
      const problems: string[] = [];
      const images = files.filter((file) => {
        if (!ACCEPTED.has(file.type)) {
          problems.push(`${file.name}: choose a JPEG, PNG, WebP or AVIF image`);
          return false;
        }
        if (file.size > MAX_UPLOAD_BYTES) {
          problems.push(`${file.name}: must be under ${formatBytes(MAX_UPLOAD_BYTES)}`);
          return false;
        }
        return true;
      });
      if (!images.length) {
        setFailures(problems);
        return;
      }

      setFailures([]);
      setBusy(images.length);

      for (const file of images) {
        try {
          const body = new FormData();
          body.append("file", file);
          const response = await fetch("/admin/media/upload", {
            method: "POST",
            body,
            headers: adminCsrfHeader(),
          });
          const result = (await response.json()) as { error?: string };
          if (!response.ok) problems.push(`${file.name}: ${result.error || "upload failed"}`);
        } catch {
          problems.push(`${file.name}: upload failed`);
        } finally {
          setBusy((current) => current - 1);
        }
      }

      setFailures(problems);
      router.refresh();
    },
    [router],
  );

  return (
    <div className="h-full">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          void send([...event.dataTransfer.files]);
        }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Upload images"
        className="flex h-full min-h-[14.5rem] cursor-pointer flex-col items-center justify-center gap-2 rounded-[16px] border-2 border-dashed px-6 py-9 text-center transition"
        style={{
          borderColor: over ? "var(--accent)" : "var(--line-strong)",
          background: over ? "var(--accent-wash)" : "var(--surface-2)",
        }}
      >
        <span
          className="grid h-11 w-11 place-items-center rounded-full"
          style={{ background: "var(--surface)", color: over ? "var(--accent)" : "var(--ink-faint)" }}
        >
          {busy > 0 ? <Spinner size={18} /> : <Icon name="upload" size={19} />}
        </span>
        <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
          {busy > 0 ? `Uploading ${busy} file${busy === 1 ? "" : "s"}…` : "Drop images here, or click to choose"}
        </p>
        <p className="text-xs" style={{ color: "var(--ink-faint)" }}>
          JPEG, PNG, WebP or AVIF up to {formatBytes(MAX_UPLOAD_BYTES)}. Identical files are stored once and shared.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_UPLOAD_MIME_LIST}
          multiple
          aria-label="Choose images to upload"
          className="hidden"
          onChange={(event) => {
            void send([...(event.target.files ?? [])]);
            event.target.value = "";
          }}
        />
      </div>

      {failures.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs" style={{ color: "var(--bad)" }} role="alert">
          {failures.map((failure) => (
            <li key={failure}>{failure}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

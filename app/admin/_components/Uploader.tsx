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
import { Icon } from "./icons";
import { Spinner } from "./FormControls";

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

export function Uploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(0);
  const [failures, setFailures] = useState<string[]>([]);

  const send = useCallback(
    async (files: File[]) => {
      const images = files.filter((file) => file.type.startsWith("image/"));
      if (!images.length) return;

      setFailures([]);
      setBusy(images.length);

      const problems: string[] = [];
      for (const file of images) {
        try {
          const body = new FormData();
          body.append("file", file);
          const response = await fetch("/admin/media/upload", { method: "POST", body });
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
    <div>
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
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[16px] border-2 border-dashed px-6 py-9 text-center transition"
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
          JPEG, PNG, WebP or AVIF. Identical files are stored once and shared.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
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

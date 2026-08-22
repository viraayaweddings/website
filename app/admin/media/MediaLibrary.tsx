"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BulkSelection, RowCheckbox } from "../_components/BulkBar";
import { CopyButton, SubmitButton } from "../_components/FormControls";
import { Icon } from "../_components/icons";
import { Badge } from "../_components/ui";

export type MediaReferenceView = {
  what: string;
  where: string;
  adminPath: string;
  publicPath?: string;
};

export type MediaLibraryItem = {
  key: string;
  filename: string;
  contentType: string;
  size: number;
  sizeLabel: string;
  uploadedBy: string;
  createdAt: string;
  createdLabel: string;
  relativeLabel: string;
  references: MediaReferenceView[];
};

type DeleteMediaAction = (formData: FormData) => Promise<void>;
const MEDIA_BULK_FORM = "media-bulk-form";

function imagePath(item: MediaLibraryItem): string {
  return `/media/${item.key}`;
}

function fileLabel(item: MediaLibraryItem): string {
  return item.filename || item.key;
}

function fileKind(item: MediaLibraryItem): string {
  return item.contentType.replace("image/", "").toUpperCase();
}

function DetailRows({ rows }: { rows: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="vw-divide text-sm">
      {rows.map((row) => (
        <div key={row.label} className="grid gap-1 py-2.5 first:pt-0 last:pb-0">
          <dt className="text-xs font-medium" style={{ color: "var(--ink-faint)" }}>
            {row.label}
          </dt>
          <dd className="min-w-0 break-words" style={{ color: "var(--ink)" }}>
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function UsageList({ references }: { references: MediaReferenceView[] }) {
  if (references.length === 0) {
    return (
      <div className="rounded-[8px] border p-3 text-sm" style={{ borderColor: "var(--warn-line)", background: "var(--warn-wash)", color: "var(--warn)" }}>
        Not used on any tracked page.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {references.map((reference, index) => (
        <li key={`${reference.adminPath}-${reference.what}-${index}`} className="rounded-[8px] border p-3" style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex-none" style={{ color: "var(--ink-faint)" }}>
              <Icon name="link" size={13} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" style={{ color: "var(--ink)" }}>
                {reference.where}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--ink-faint)" }}>
                {reference.what}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Link href={reference.adminPath} className="vw-btn vw-btn-secondary vw-btn-sm">
                  <Icon name="edit" size={13} />
                  Edit
                </Link>
                {reference.publicPath ? (
                  <a href={reference.publicPath} target="_blank" rel="noopener noreferrer" className="vw-btn vw-btn-ghost vw-btn-sm">
                    <Icon name="external" size={13} />
                    View
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function MediaDetailsDrawer({
  item,
  isAdmin,
  deleteAction,
  onClose,
}: {
  item: MediaLibraryItem;
  isAdmin: boolean;
  deleteAction: DeleteMediaAction;
  onClose: () => void;
}) {
  const [origin] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));
  const path = imagePath(item);
  const fullUrl = origin ? `${origin}${path}` : path;
  const canDelete = isAdmin && item.references.length === 0;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={`Image details for ${fileLabel(item)}`}>
      <button type="button" className="vw-scrim" onClick={onClose} aria-label="Close image details" />
      <aside className="vw-dialog fixed inset-y-0 right-0 z-[71] flex w-full max-w-[28rem] flex-col overflow-hidden rounded-none">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: "var(--line)" }}>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold" style={{ color: "var(--ink)" }}>
              Image details
            </p>
            <p className="truncate text-xs" style={{ color: "var(--ink-faint)" }}>
              {fileLabel(item)}
            </p>
          </div>
          <button type="button" className="vw-btn vw-btn-ghost vw-btn-icon vw-btn-sm" onClick={onClose} aria-label="Close image details">
            <Icon name="close" size={14} />
          </button>
        </div>

        <div className="vw-scroll min-h-0 flex-1 overflow-y-auto">
        {/* Plain img: media is served by the app, not the static asset pipeline. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={path} alt="" className="max-h-72 w-full object-contain" style={{ background: "var(--surface-2)" }} />

        <div className="vw-card-pad space-y-4">
          <div>
            <div className="mb-1 flex items-start gap-2">
              <h2 className="min-w-0 flex-1 break-words text-base font-semibold" style={{ color: "var(--ink)" }}>
                {fileLabel(item)}
              </h2>
              {item.references.length === 0 ? <Badge tone="warn">Unused</Badge> : <Badge tone="ok">In use</Badge>}
            </div>
            <p className="vw-mono break-all text-xs" style={{ color: "var(--ink-faint)" }}>
              {path}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <CopyButton value={fullUrl} label="full URL" />
            <CopyButton value={path} label="media path" />
            <a href={path} target="_blank" rel="noopener noreferrer" className="vw-btn vw-btn-secondary vw-btn-sm">
              <Icon name="external" size={13} />
              Open
            </a>
            <a href={path} download={fileLabel(item)} className="vw-btn vw-btn-secondary vw-btn-sm">
              <Icon name="download" size={13} />
              Download
            </a>
          </div>

          <section>
            <p className="vw-eyebrow mb-2">Details</p>
            <DetailRows
              rows={[
                { label: "File name", value: fileLabel(item) },
                { label: "Type", value: item.contentType },
                { label: "Format", value: fileKind(item) },
                { label: "Size", value: item.sizeLabel },
                { label: "Uploaded", value: `${item.createdLabel} (${item.relativeLabel})` },
                { label: "Uploaded by", value: item.uploadedBy || "Unknown" },
                { label: "Used on", value: `${item.references.length} ${item.references.length === 1 ? "place" : "places"}` },
              ]}
            />
          </section>

          <section>
            <p className="vw-eyebrow mb-2">URLs</p>
            <DetailRows
              rows={[
                {
                  label: "Full URL",
                  value: (
                    <span className="flex min-w-0 items-center gap-1">
                      <span className="vw-mono min-w-0 flex-1 break-all">{fullUrl}</span>
                      <CopyButton value={fullUrl} label="full URL" />
                    </span>
                  ),
                },
                {
                  label: "Path",
                  value: (
                    <span className="flex min-w-0 items-center gap-1">
                      <span className="vw-mono min-w-0 flex-1 break-all">{path}</span>
                      <CopyButton value={path} label="media path" />
                    </span>
                  ),
                },
                {
                  label: "Storage key",
                  value: (
                    <span className="flex min-w-0 items-center gap-1">
                      <span className="vw-mono min-w-0 flex-1 break-all">{item.key}</span>
                      <CopyButton value={item.key} label="storage key" />
                    </span>
                  ),
                },
              ]}
            />
          </section>

          <section>
            <p className="vw-eyebrow mb-2">Used On Pages</p>
            <UsageList references={item.references} />
          </section>

          <section>
            <p className="vw-eyebrow mb-2">Advanced</p>
            <div className="flex flex-wrap gap-2">
              <CopyButton value={`<img src="${path}" alt="">`} label="HTML snippet" />
              <CopyButton value={`![](${path})`} label="Markdown snippet" />
            </div>
          </section>

          {isAdmin && canDelete ? (
            <form action={deleteAction} className="border-t pt-4" style={{ borderColor: "var(--line)" }}>
              <input type="hidden" name="key" value={item.key} />
              <SubmitButton
                variant="danger-quiet"
                size="sm"
                icon="trash"
                pendingLabel="Deleting..."
                confirm={`Delete ${fileLabel(item)} permanently?`}
                block
              >
                Delete image
              </SubmitButton>
            </form>
          ) : isAdmin ? (
            <div className="border-t pt-4" style={{ borderColor: "var(--line)" }}>
              <button type="button" className="vw-btn vw-btn-secondary vw-btn-sm vw-btn-block" disabled>
                <Icon name="info" size={13} />
                Remove references before deleting
              </button>
            </div>
          ) : null}
        </div>
        </div>
      </aside>
    </div>
  );
}

export function MediaLibrary({
  items,
  isAdmin,
  deleteAction,
  bulkDeleteAction,
}: {
  items: MediaLibraryItem[];
  isAdmin: boolean;
  deleteAction: DeleteMediaAction;
  bulkDeleteAction: DeleteMediaAction;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const selected = useMemo(
    () => items.find((item) => item.key === selectedKey) ?? null,
    [items, selectedKey],
  );

  return (
    <>
    <div>
      <div>
        {isAdmin ? (
          <form id={MEDIA_BULK_FORM}>
            <BulkSelection noun="image" formId={MEDIA_BULK_FORM}>
              <SubmitButton
                variant="danger-quiet"
                size="sm"
                icon="trash"
                pendingLabel="Deleting..."
                formAction={bulkDeleteAction}
                confirm="Delete every selected unused image? Images used on pages must be changed first."
              >
                Delete
              </SubmitButton>
            </BulkSelection>
          </form>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {items.map((item) => {
            return (
              <article
                key={item.key}
                className="vw-card relative overflow-hidden text-left transition hover:-translate-y-px"
              >
                {isAdmin ? (
                  <span className="absolute left-2 top-2 z-10 rounded-[7px] border p-1" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
                    <RowCheckbox id={item.key} label={fileLabel(item)} form={MEDIA_BULK_FORM} />
                  </span>
                ) : null}

                <button
                  type="button"
                  onClick={() => setSelectedKey(item.key)}
                  className="block w-full text-left"
                >
                  {/* Plain img: media is served by the app, not the static asset pipeline. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePath(item)}
                    alt=""
                    className="h-40 w-full object-cover"
                    style={{ background: "var(--surface-2)" }}
                    loading="lazy"
                  />

                  <span className="vw-card-pad block">
                    <span className="mb-1 flex items-start gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium" style={{ color: "var(--ink)" }}>
                        {fileLabel(item)}
                      </span>
                      <Icon name="chevronRight" size={14} className="mt-0.5 flex-none" />
                    </span>

                    <span className="block text-xs" style={{ color: "var(--ink-faint)" }}>
                      {fileKind(item)} · {item.sizeLabel} · {item.relativeLabel}
                    </span>

                    <span className="mt-2.5 block">
                      {item.references.length === 0 ? (
                        <Badge tone="warn">Not used anywhere</Badge>
                      ) : (
                        <Badge tone="ok">
                          Used {item.references.length} {item.references.length === 1 ? "time" : "times"}
                        </Badge>
                      )}
                    </span>
                  </span>
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </div>
    {selected ? (
      <MediaDetailsDrawer
        item={selected}
        isAdmin={isAdmin}
        deleteAction={deleteAction}
        onClose={() => setSelectedKey(null)}
      />
    ) : null}
    </>
  );
}

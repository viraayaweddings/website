"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { CsrfInput } from "./CsrfInput";
import { SubmitButton } from "./FormControls";
import { Icon } from "./icons";

/**
 * Two-step delete for list rows.
 *
 * The Delete control is an ordinary link that re-renders the list with
 * `?delete=<id>`; only the banner it reveals actually submits. Keeping the
 * confirmation on the server means the consequence can be spelled out with the
 * real record in front of the reader, rather than in a generic dialog.
 */
/** The Delete control on a list row: a link, not a form. */
export function DeleteRequestLink({ href, label = "Delete" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="vw-btn vw-btn-danger-quiet vw-btn-sm">
      <Icon name="trash" size={13} />
      {label}
    </Link>
  );
}

export function ConfirmDeleteBanner({
  action,
  id,
  what,
  cancelHref,
  note,
  onCancel,
  returnTo,
  csrfToken,
}: {
  action: (formData: FormData) => Promise<void>;
  id: number | string;
  /** Human description of the thing being removed. */
  what: string;
  cancelHref: string;
  /** Extra consequence worth spelling out before they commit. */
  note?: string;
  onCancel?: () => void;
  /** List view to come back to, so filters and page survive the delete. */
  returnTo?: string;
  csrfToken: string;
}) {
  const banner = useRef<HTMLDivElement>(null);

  /**
   * The banner appears after a full server navigation, so focus is back at the
   * top of the document: a screen reader announced the page rather than the
   * confirmation, and a keyboard user had to tab down to find it. Moving focus
   * here is what makes `role="alertdialog"` mean anything.
   */
  useEffect(() => {
    banner.current?.focus();
  }, []);

  return (
    <div
      ref={banner}
      tabIndex={-1}
      className="mb-4 flex flex-wrap items-start gap-3 rounded-[16px] border p-4"
      style={{ borderColor: "var(--bad-line)", background: "var(--bad-wash)" }}
      role="alertdialog"
      aria-label={`Confirm deleting ${what}`}
    >
      <span
        className="grid h-8 w-8 flex-none place-items-center rounded-full"
        style={{ background: "var(--bad)", color: "#fff" }}
      >
        <Icon name="trash" size={15} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold" style={{ color: "var(--bad)" }}>
          Delete {what}?
        </p>
        {note ? (
          <p className="mt-1 text-sm" style={{ color: "var(--ink-soft)" }}>
            {note}
          </p>
        ) : null}

        <form action={action} className="mt-3 flex flex-wrap items-center gap-2">
          <CsrfInput token={csrfToken} />
          <input type="hidden" name="id" value={id} />
          {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
          <SubmitButton variant="danger" size="sm" icon="trash" pendingLabel="Deleting…">
            Yes, delete
          </SubmitButton>
          {onCancel ? (
            <button type="button" className="vw-btn vw-btn-secondary vw-btn-sm" onClick={onCancel}>
              Cancel
            </button>
          ) : (
            <Link href={cancelHref} className="vw-btn vw-btn-secondary vw-btn-sm">
              Cancel
            </Link>
          )}
        </form>
      </div>
    </div>
  );
}

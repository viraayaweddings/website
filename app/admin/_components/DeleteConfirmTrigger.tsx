"use client";

import { useState } from "react";
import { ConfirmDeleteBanner } from "./ConfirmDelete";
import { Icon } from "./icons";

type DeleteConfirmTriggerProps = {
  action: (formData: FormData) => Promise<void>;
  id: number | string;
  what: string;
  note?: string;
  label?: string;
  /** Screen-reader label when the visible label is icon-only. */
  ariaLabel?: string;
  /** List view to come back to, so filters and page survive the delete. */
  returnTo?: string;
};

/**
 * Opens a fixed confirmation banner without putting the record id in the URL.
 */
export function DeleteConfirmTrigger({
  action,
  id,
  what,
  note,
  label = "Delete",
  ariaLabel,
  returnTo,
}: DeleteConfirmTriggerProps) {
  const [open, setOpen] = useState(false);
  const iconOnly = label === "Delete" && Boolean(ariaLabel);

  return (
    <>
      {open ? (
        <div className="fixed inset-x-4 top-4 z-50 mx-auto max-w-xl">
          <ConfirmDeleteBanner
            action={async (formData) => {
              await action(formData);
              setOpen(false);
            }}
            id={id}
            what={what}
            note={note}
            cancelHref="#"
            returnTo={returnTo}
            onCancel={() => setOpen(false)}
          />
        </div>
      ) : null}

      <button
        type="button"
        className={`vw-btn vw-btn-danger-quiet vw-btn-sm${iconOnly ? " vw-btn-icon" : ""}`}
        onClick={() => setOpen(true)}
        aria-label={ariaLabel}
      >
        <Icon name="trash" size={13} />
        {iconOnly ? null : label}
      </button>
    </>
  );
}

"use client";

/**
 * Row selection for a list, and the action bar that appears once something is
 * selected.
 *
 * The checkboxes are ordinary form inputs inside the page's own form, so the
 * bulk actions stay plain server actions. This component only tracks how many
 * are ticked, so the bar can appear, count them, and offer select-all.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./icons";

export function BulkSelection({
  children,
  noun = "item",
  formId,
}: {
  /** The action buttons, shown once at least one row is ticked. */
  children: React.ReactNode;
  noun?: string;
  /** Optional external form id for lists whose rows contain their own forms. */
  formId?: string;
}) {
  const anchor = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);

  const boxes = useCallback((): HTMLInputElement[] => {
    const form = formId ? document.getElementById(formId) : anchor.current?.closest("form");
    return form ? [...form.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="ids"]')] : [];
  }, [formId]);

  const recount = useCallback(() => {
    const all = boxes();
    setTotal(all.length);
    setCount(all.filter((box) => box.checked).length);
  }, [boxes]);

  useEffect(() => {
    const form = anchor.current?.closest("form");
    if (!form) return;
    recount();
    form.addEventListener("change", recount);
    return () => form.removeEventListener("change", recount);
  }, [recount]);

  const setAll = (checked: boolean) => {
    for (const box of boxes()) box.checked = checked;
    recount();
  };

  return (
    <div ref={anchor}>
      <div
        className="mb-3 flex flex-wrap items-center gap-2 rounded-[10px] border px-3 py-2 text-sm transition"
        style={{
          borderColor: count ? "var(--accent-line)" : "var(--line)",
          background: count ? "var(--accent-wash)" : "var(--surface)",
        }}
      >
        <label className="flex items-center gap-2 text-xs font-medium" style={{ color: "var(--ink-soft)" }}>
          <input
            type="checkbox"
            className="vw-check"
            checked={total > 0 && count === total}
            ref={(node) => {
              // The in-between state has no attribute; it must be set on the node.
              if (node) node.indeterminate = count > 0 && count < total;
            }}
            onChange={(event) => setAll(event.target.checked)}
            aria-label={`Select all ${noun}s on this page`}
          />
          {count > 0 ? (
            <span style={{ color: "var(--accent-strong)" }}>
              {count} {noun}
              {count === 1 ? "" : "s"} selected
            </span>
          ) : (
            <span>Select all on this page</span>
          )}
        </label>

        {count > 0 ? (
          <>
            <span className="flex-1" />
            <div className="flex flex-wrap items-center gap-2">{children}</div>
            <button
              type="button"
              onClick={() => setAll(false)}
              className="vw-btn vw-btn-ghost vw-btn-sm"
              aria-label="Clear selection"
            >
              <Icon name="close" size={13} />
              Clear
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

/** The per-row checkbox. Kept here so the name stays in step with the bar. */
export function RowCheckbox({
  id,
  label,
  form,
}: {
  id: number | string;
  label: string;
  /** External bulk form id, used when the checkbox cannot live inside the form. */
  form?: string;
}) {
  return (
    <input
      type="checkbox"
      name="ids"
      value={String(id)}
      form={form}
      className="vw-check"
      aria-label={`Select ${label}`}
      onClick={(event) => event.stopPropagation()}
    />
  );
}

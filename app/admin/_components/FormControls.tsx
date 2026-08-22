"use client";

/**
 * Client-side form affordances layered over the existing server actions.
 *
 * The actions are plain form posts and stay that way; these components only add
 * the feedback a form post does not give you on its own — that the submit is in
 * flight, and that leaving now would lose work.
 */

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Icon, type IconName } from "./icons";

export function SubmitButton({
  children,
  variant = "primary",
  size,
  icon,
  block,
  pendingLabel,
  name,
  value,
  confirm,
  formAction,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "danger-quiet";
  size?: "sm" | "lg";
  icon?: IconName;
  block?: boolean;
  pendingLabel?: string;
  name?: string;
  value?: string;
  /** Shown in a confirm() before the post is allowed through. */
  confirm?: string;
  /** Sends this button's submit to a different action than the form's own. */
  formAction?: (formData: FormData) => void | Promise<void>;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name={name}
      value={value}
      formAction={formAction}
      disabled={pending}
      aria-busy={pending}
      onClick={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
      className={[
        "vw-btn",
        `vw-btn-${variant}`,
        size ? `vw-btn-${size}` : "",
        block ? "vw-btn-block" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {pending ? <Spinner /> : icon ? <Icon name={icon} size={size === "sm" ? 13 : 15} /> : null}
      {pending ? pendingLabel || "Saving…" : children}
    </button>
  );
}

export function Spinner({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="flex-none">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 12 12"
          to="360 12 12"
          dur="0.7s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );
}

/**
 * Warns before a navigation that would discard edits.
 *
 * Watches the form for the first change and clears itself on submit, so the
 * prompt only appears when there is genuinely unsaved work.
 */
export function UnsavedGuard() {
  const anchor = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const form = anchor.current?.closest("form");
    if (!form) return;

    let dirty = false;
    const markDirty = () => {
      dirty = true;
    };
    const clear = () => {
      dirty = false;
    };
    const onLeave = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };

    form.addEventListener("input", markDirty);
    form.addEventListener("change", markDirty);
    form.addEventListener("submit", clear);
    window.addEventListener("beforeunload", onLeave);

    return () => {
      form.removeEventListener("input", markDirty);
      form.removeEventListener("change", markDirty);
      form.removeEventListener("submit", clear);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, []);

  return <span ref={anchor} hidden />;
}

/** Copies a value and confirms it in place, rather than in a toast. */
export function CopyButton({ value, label }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(() => setDone(false), 1600);
    return () => window.clearTimeout(timer);
  }, [done]);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
        } catch {
          /* clipboard blocked; the value is on screen to copy by hand */
        }
      }}
      title={done ? "Copied" : `Copy ${label || "to clipboard"}`}
      aria-label={done ? "Copied" : `Copy ${label || "to clipboard"}`}
      className="vw-btn vw-btn-ghost vw-btn-icon vw-btn-sm"
      style={done ? { color: "var(--ok)" } : undefined}
    >
      <Icon name={done ? "check" : "copy"} size={13} />
    </button>
  );
}

/**
 * A search box that submits as you stop typing.
 *
 * The form still works without JavaScript — this only removes the need to press
 * the button — so the filter state stays in the URL where it can be shared.
 */
export function LiveSearch({
  name,
  defaultValue,
  placeholder,
  label,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  /** Accessible name. Falls back to the placeholder, which on its own is not
   *  one: assistive tech may skip it, and it vanishes as soon as typing starts. */
  label?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = ref.current;
    if (!input) return;

    let timer = 0;
    const onInput = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => input.form?.requestSubmit(), 420);
    };

    input.addEventListener("input", onInput);
    return () => {
      window.clearTimeout(timer);
      input.removeEventListener("input", onInput);
    };
  }, []);

  return (
    <span className="relative block">
      <span
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"
        style={{ color: "var(--ink-faint)" }}
      >
        <Icon name="search" size={15} />
      </span>
      <input
        ref={ref}
        type="search"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={label || placeholder || "Search"}
        className="vw-input pl-8"
      />
    </span>
  );
}

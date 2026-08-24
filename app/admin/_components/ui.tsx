/** Presentational primitives shared across admin pages. */
import Link from "next/link";
import { Icon, type IconName } from "./icons";

/* --- feedback ------------------------------------------------------------ */

const ALERT_TONES = {
  error: { className: "vw-alert-bad", icon: "warning" },
  success: { className: "vw-alert-ok", icon: "check" },
  info: { className: "vw-alert-info", icon: "info" },
  warning: { className: "vw-alert-warn", icon: "warning" },
  quiet: { className: "vw-alert-quiet", icon: "info" },
} as const;

export function Alert({
  tone = "error",
  title,
  children,
}: {
  tone?: keyof typeof ALERT_TONES;
  title?: string;
  children: React.ReactNode;
}) {
  const { className, icon } = ALERT_TONES[tone];

  return (
    <div className={`vw-alert ${className}`} role={tone === "error" ? "alert" : undefined}>
      <span className="mt-0.5 flex-none">
        <Icon name={icon as IconName} size={15} />
      </span>
      <div className="min-w-0">
        {title ? <p className="mb-0.5 font-semibold">{title}</p> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}

/* --- containers ---------------------------------------------------------- */

export function Card({
  children,
  className = "",
  pad = true,
}: {
  children: React.ReactNode;
  className?: string;
  /** Off when the card holds its own header or a full-bleed table. */
  pad?: boolean;
}) {
  return <div className={`vw-card ${pad ? "vw-card-pad" : ""} ${className}`}>{children}</div>;
}

export function CardHead({
  title,
  hint,
  icon,
  children,
}: {
  title: string;
  hint?: string;
  icon?: IconName;
  /** Actions, aligned to the right. */
  children?: React.ReactNode;
}) {
  return (
    <div className="vw-card-head">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon ? (
          <span className="grid h-7 w-7 flex-none place-items-center rounded-lg" style={{ background: "var(--surface-hover)", color: "var(--ink-soft)" }}>
            <Icon name={icon} size={15} />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold" style={{ color: "var(--ink)" }}>
            {title}
          </h2>
          {hint ? (
            <p className="truncate text-xs" style={{ color: "var(--ink-faint)" }}>
              {hint}
            </p>
          ) : null}
        </div>
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon = "inbox",
  title,
  children,
  action,
}: {
  icon?: IconName;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="vw-empty">
      <span className="vw-empty-icon">
        <Icon name={icon} size={20} />
      </span>
      <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
        {title}
      </p>
      {children ? <p className="max-w-sm text-sm">{children}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/* --- controls ------------------------------------------------------------ */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "danger-quiet";

/** A link styled as a button, for navigation that is not a form submission. */
export function LinkButton({
  href,
  children,
  variant = "secondary",
  size,
  icon,
  external,
}: {
  href: string;
  children?: React.ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "lg";
  icon?: IconName;
  external?: boolean;
}) {
  const className = [
    "vw-btn",
    `vw-btn-${variant}`,
    size ? `vw-btn-${size}` : "",
    icon && !children ? "vw-btn-icon" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const body = (
    <>
      {icon ? <Icon name={icon} size={size === "sm" ? 13 : 15} /> : null}
      {children}
    </>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {body}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {body}
    </Link>
  );
}

export function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  autoComplete,
  hint,
  placeholder,
  prefix,
  readOnly,
  list,
  pattern,
  title,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  autoComplete?: string;
  hint?: string;
  placeholder?: string;
  /** Static text shown before the value, e.g. a URL stem. */
  prefix?: string;
  readOnly?: boolean;
  list?: string;
  pattern?: string;
  title?: string;
}) {
  return (
    <label className="block">
      <span className="vw-label">
        {label}
        {required ? <span style={{ color: "var(--bad)" }}> *</span> : null}
      </span>
      {prefix ? (
        <span className="flex items-stretch">
          <span
            className="vw-mono flex items-center rounded-l-[7px] border border-r-0 px-2.5 whitespace-nowrap"
            style={{ borderColor: "var(--line-strong)", background: "var(--surface-2)", color: "var(--ink-faint)" }}
          >
            {prefix}
          </span>
          <input
            className="vw-input rounded-l-none"
            type={type}
            name={name}
            required={required}
            defaultValue={defaultValue}
            autoComplete={autoComplete}
            placeholder={placeholder}
            readOnly={readOnly}
            list={list}
            pattern={pattern}
            title={title}
          />
        </span>
      ) : (
        <input
          className="vw-input"
          type={type}
          name={name}
          required={required}
          defaultValue={defaultValue}
          autoComplete={autoComplete}
          placeholder={placeholder}
          readOnly={readOnly}
          list={list}
          pattern={pattern}
          title={title}
        />
      )}
      {hint ? <span className="vw-hint">{hint}</span> : null}
    </label>
  );
}

export function TextArea({
  label,
  name,
  rows = 4,
  defaultValue,
  hint,
  mono,
  placeholder,
  srOnlyLabel,
}: {
  label: string;
  name: string;
  rows?: number;
  defaultValue?: string;
  hint?: string;
  mono?: boolean;
  placeholder?: string;
  srOnlyLabel?: boolean;
}) {
  return (
    <label className="block">
      <span className={srOnlyLabel ? "sr-only" : "vw-label"}>{label}</span>
      <textarea
        className={`vw-textarea ${mono ? "vw-mono" : ""}`}
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        placeholder={placeholder}
      />
      {hint ? <span className="vw-hint">{hint}</span> : null}
    </label>
  );
}

export function Select({
  label,
  name,
  defaultValue,
  options,
  hint,
  srOnlyLabel,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  hint?: string;
  srOnlyLabel?: boolean;
}) {
  return (
    <label className="block">
      <span className={srOnlyLabel ? "sr-only" : "vw-label"}>{label}</span>
      <select className="vw-select" name={name} defaultValue={defaultValue}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? <span className="vw-hint">{hint}</span> : null}
    </label>
  );
}

/* --- data display -------------------------------------------------------- */

const STATUS_TONES: Record<string, string> = {
  new: "vw-badge-info",
  contacted: "vw-badge-warn",
  qualified: "vw-badge-accent",
  won: "vw-badge-ok",
  lost: "vw-badge-neutral",
  spam: "vw-badge-bad",
  published: "vw-badge-ok",
  draft: "vw-badge-neutral",
  active: "vw-badge-ok",
  disabled: "vw-badge-bad",
  admin: "vw-badge-accent",
  editor: "vw-badge-neutral",
};

export function StatusBadge({ status, dot = true }: { status: string; dot?: boolean }) {
  return (
    <span className={`vw-badge ${STATUS_TONES[status] || "vw-badge-neutral"}`}>
      {dot ? <span className="vw-dot" /> : null}
      {/* The stored value is lower-case throughout -- "new", "draft", "admin" --
          and printing it raw read as a stray identifier next to otherwise
          sentence-cased copy. Display only; the value is untouched. */}
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : status}
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "ok" | "warn" | "bad" | "info" | "accent";
}) {
  return <span className={`vw-badge vw-badge-${tone}`}>{children}</span>;
}

/** Key/value rows, used on every detail screen. */
export function DetailList({ rows }: { rows: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="vw-divide text-sm">
      {rows.map((row) => (
        <div key={row.label} className="grid gap-1 py-2.5 first:pt-0 last:pb-0 sm:grid-cols-[10rem_1fr]">
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

/**
 * Date and time formatting lives in `../_lib/dates`, re-exported here so every
 * page keeps importing it from one place. It is a separate module because this
 * file contains JSX, which `node --experimental-strip-types` cannot strip, so a
 * test cannot import it -- see `tests/admin-dates.test.mjs`.
 */
export { formatDate, formatDateTime, formatRelative, formatStoredTimestamp } from "../_lib/dates";

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatCount(value: number): string {
  return value.toLocaleString("en-IN");
}

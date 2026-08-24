/**
 * The admin panel's date and time format: `DD-MM-YYYY`, 24-hour `HH:MM`, IST.
 *
 * Every timestamp an editor reads goes through one of these three functions, so
 * the format is decided in one place. It replaced `dateStyle: "medium"` with
 * `timeStyle: "short"` -- "24 Aug 2026, 9:35 pm" -- which was ambiguous twice
 * over: a month abbreviation reads differently to different people, and a
 * 12-hour clock makes 09:35 and 21:35 indistinguishable at a glance when
 * scanning a column of submissions.
 *
 * This lives in `_lib` rather than in `_components/ui.tsx` because ui.tsx
 * contains JSX, which `node --experimental-strip-types` cannot strip, so a test
 * cannot import it. ui.tsx re-exports these, and every caller still imports
 * from there. See `tests/admin-dates.test.mjs`.
 */

/**
 * `hour12: false` rather than `hourCycle: "h23"`: both give 00:00 at midnight
 * on current ICU builds, but `hourCycle` has a history of emitting `24:00` for
 * the same instant, and the panel prints this beside a date.
 */
const IST_PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * Assembled from `formatToParts`, not by formatting and replacing `/` with `-`.
 *
 * The separator a locale picks is not part of its contract -- `en-GB` emits
 * `24/08/2026` today, but a build that used `.` or a non-breaking space would
 * slip the wrong separator past a `replace(/\//g, "-")` without failing.
 * Naming the parts makes the output identical on every ICU build.
 */
function istParts(date: Date): Record<string, string> {
  const parts: Record<string, string> = {};
  for (const part of IST_PARTS.formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  return parts;
}

/** `null`, and anything that is not a real instant, render as an em dash. */
function usable(value: Date | number | null): Date | null {
  if (value === null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `24-08-2026, 21:35` */
export function formatDateTime(value: Date | number | null): string {
  const date = usable(value);
  if (!date) return "—";
  const { day, month, year, hour, minute } = istParts(date);
  return `${day}-${month}-${year}, ${hour}:${minute}`;
}

/** `24-08-2026` */
export function formatDate(value: Date | number | null): string {
  const date = usable(value);
  if (!date) return "—";
  const { day, month, year } = istParts(date);
  return `${day}-${month}-${year}`;
}

/**
 * "3 hours ago" for anything recent, falling back to the date.
 *
 * `now` is supplied by the caller so a server component stays pure -- see
 * `app/admin/_lib/clock.ts`.
 */
export function formatRelative(value: Date | number | null, now: number): string {
  const date = usable(value);
  if (!date) return "—";

  const seconds = Math.round((now - date.getTime()) / 1000);
  if (seconds < 45) return "just now";
  if (seconds < 5400) {
    const minutes = Math.round(seconds / 60);
    return minutes < 60 ? `${minutes} min ago` : "an hour ago";
  }
  const hours = Math.round(seconds / 3600);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days < 8) return days === 1 ? "yesterday" : `${days} days ago`;

  return formatDate(date);
}

/**
 * An ISO-8601 instant stored inside free-form data, shown in the panel's format.
 *
 * `worker/lead-email.ts` records `metadata["Submitted At"]` as
 * `new Date().toISOString()`, so the lead detail page printed
 * `2026-08-24T16:05:09.123Z` -- UTC, five and a half hours out -- directly
 * beside "Received 24-08-2026, 21:35". Converting on the way out rather than
 * changing what is written means the leads already in the table read correctly.
 *
 * Deliberately narrow: only a full instant is converted. The metadata is
 * free-form, and a looser test would reformat a page URL or a reference number
 * that happened to contain digits and dashes.
 */
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export function formatStoredTimestamp(value: string): string {
  if (!ISO_INSTANT.test(value)) return value;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? value : formatDateTime(new Date(ms));
}

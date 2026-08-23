/**
 * Works out which submitted field is the name, the phone number, the email.
 *
 * Kept apart from lead-email.ts, which reaches the database and so cannot be
 * imported by a plain node test. This is the part worth pinning: the forms come
 * from a cloned site and name the same thing five different ways
 * (`number`, `phone`, `mobile`, `phone_number`, `tel`), while also posting
 * fields about the venue that look confusingly similar.
 */

export function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function keyTokens(key: string): string[] {
  return key.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

/**
 * Subjects that are never the person filling the form in.
 *
 * The hotel pages post `hotel_id` and `hotel_name` alongside the visitor's
 * details, and both normalise to strings that *contain* "tel" -- "hotelid",
 * "hotelname". A plain substring search therefore read the hotel's id as the
 * phone number, so every enquiry from a venue page came back "Please enter a
 * valid 10-digit Indian mobile number" no matter what was typed.
 */
const NOT_THE_VISITOR = new Set([
  "hotel",
  "venue",
  "property",
  "package",
  "plan",
  "event",
  "source",
  "page",
  "form",
  "lead",
  "enquiry",
  "appointment",
  "selected",
  "alternate",
  "preferred",
]);

function isContactCandidate(key: string): boolean {
  const [first] = keyTokens(key);
  return !first || !NOT_THE_VISITOR.has(first);
}

/**
 * The value for a role, preferring an exact field name over a loose one.
 *
 * Needles are tried in order and by decreasing precision: an exact key name
 * first, then a whole word inside the key, and only then a substring. Without
 * the tiers "hotel_name" and "name" are equally good answers for the visitor's
 * name, and whichever the form happens to list first wins.
 *
 * `contactOnly` additionally refuses a field that describes the venue rather
 * than the person -- the fields a lead is filtered and replied to by.
 */
export function findByKey(
  fields: Record<string, string>,
  needles: string[],
  contactOnly = false,
  excludeFirstToken: string[] = [],
): string {
  const excluded = new Set(excludeFirstToken);
  const entries = Object.entries(fields).filter(
    ([key, value]) =>
      value &&
      (!contactOnly || isContactCandidate(key)) &&
      !excluded.has(keyTokens(key)[0] ?? ""),
  );

  const tests: Array<(key: string, needle: string) => boolean> = [
    (key, needle) => normalizeKey(key) === needle,
    (key, needle) => keyTokens(key).includes(needle),
    (key, needle) => normalizeKey(key).includes(needle),
  ];

  for (const test of tests) {
    for (const needle of needles) {
      const hit = entries.find(([key]) => test(key, needle));
      if (hit) return hit[1];
    }
  }

  return "";
}

/** The visitor's own details, whatever the form called them. */
export function findContactName(fields: Record<string, string>): string {
  return findByKey(fields, ["name"], true);
}

export function findContactPhone(fields: Record<string, string>): string {
  return findByKey(fields, ["phone", "mobile", "number", "tel"], true);
}

export function findContactEmail(fields: Record<string, string>): string {
  return findByKey(fields, ["email"], true);
}

/**
 * The date the visitor is actually asking about.
 *
 * /check-hotel-availability posts `preferred_dates` next to `alternate_dates_1`
 * and `alternate_dates_2`. None of them is the whole word "date", so all three
 * were equally good substring matches and the first one in the payload was
 * shown as "Preferred Date" -- an alternate range presented as the date they
 * want. The specific names are tried first and the alternates are refused.
 */
export function findPreferredDate(fields: Record<string, string>): string {
  return findByKey(
    fields,
    ["preferreddate", "preferreddates", "eventdate", "weddingdate", "date", "dates"],
    false,
    ["alternate", "alt"],
  );
}

/** "+91XXXXXXXXXX", or "" when it is not a mobile number we can dial. */
export function normalizePhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : "";
}

/** Words that stay lower-case inside a label. */
const SMALL_WORDS = new Set(["and", "or", "of", "to", "the", "a", "an", "in", "for", "at", "by", "with"]);

/** Initialisms that read wrong in Title Case. */
const ACRONYMS: Record<string, string> = {
  json: "JSON",
  id: "ID",
  url: "URL",
  ip: "IP",
  csv: "CSV",
  html: "HTML",
  utm: "UTM",
  faq: "FAQ",
};

/**
 * A submitted field name, as a person should read it.
 *
 * displayLeadFields maps the fields it recognises to proper labels -- "Name",
 * "Phone Number", "City / Location" -- and passes everything else through
 * verbatim. On a form with fields the mapping does not know, half the panel's
 * list read as copy and the other half as `rooms_and_pax` and
 * `complete_selection_json` sitting right beside it. A key that is already a
 * label is left exactly as it is.
 */
export function humanFieldLabel(key: string): string {
  const raw = String(key ?? "").trim();
  if (!raw) return raw;
  // Already written as a label: has a space, or capitalisation of its own.
  const isCamelCase = /[a-z][A-Z]/.test(raw);
  if (/\s/.test(raw) || (/[A-Z]/.test(raw) && !isCamelCase)) return raw;

  const words = raw
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  if (!words.length) return raw;

  return words
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (ACRONYMS[lower]) return ACRONYMS[lower];
      if (index > 0 && SMALL_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

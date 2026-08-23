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
): string {
  const entries = Object.entries(fields).filter(
    ([key, value]) => value && (!contactOnly || isContactCandidate(key)),
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

/** "+91XXXXXXXXXX", or "" when it is not a mobile number we can dial. */
export function normalizePhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : "";
}

/**
 * Reading repeated, numbered form rows safely.
 *
 * FAQ and highlight rows arrive as parallel `faq_question_0`, `faq_answer_0`,
 * `highlight_title_1` inputs, which keeps the forms working without any
 * client-side JavaScript. The handlers used to walk every entry in the posted
 * FormData with no ceiling, and the FAQ one spun up an HTMLRewriter WASM
 * instance per match -- so a signed-in editor posting fifty thousand numbered
 * fields got fifty thousand instantiations inside one invocation, and the
 * `Math.max(...ids)` that followed threw RangeError on the way.
 *
 * Indices are collected, sorted and capped before anything expensive runs.
 */

/** More rows than any of these forms offers, and few enough to be cheap. */
export const MAX_FORM_ROWS = 60;

export class TooManyRowsError extends Error {
  constructor(public readonly label: string, public readonly max: number) {
    super(`Keep ${label} to ${max} or fewer.`);
    this.name = "TooManyRowsError";
  }
}

/**
 * The row indices present for `prefix`, in order.
 *
 * Throws rather than silently truncating: dropping rows an editor filled in
 * without telling them is how content quietly disappears.
 */
export function readRowIndices(
  formData: FormData,
  prefix: string,
  label: string,
  max: number = MAX_FORM_ROWS,
): string[] {
  const pattern = new RegExp(`^${prefix}(\\d{1,6})$`);
  const indices: string[] = [];

  for (const key of formData.keys()) {
    const match = pattern.exec(key);
    if (!match) continue;
    indices.push(match[1]);
    // Stop reading the moment the ceiling is passed; there is no reason to walk
    // the rest of a payload that is already being refused.
    if (indices.length > max) throw new TooManyRowsError(label, max);
  }

  return [...new Set(indices)].sort((a, b) => Number(a) - Number(b));
}

/** The largest id in use, without spreading an unbounded array into Math.max. */
export function highestId(ids: number[]): number {
  return ids.reduce((highest, id) => (id > highest ? id : highest), 0);
}

/**
 * Shared with the page component. It cannot live in actions.ts: a "use server"
 * module may only export async functions, and a plain const export there makes
 * the RSC transform throw for the whole server graph.
 */
export const PRUNE_DAYS = [30, 90, 180, 365] as const;

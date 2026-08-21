/** Shared consultation time slots served by `/appointment/slots`. */
export const CONSULTATION_SLOTS = [
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
] as const;

/** Permanent public URL redirects (old path → new path). */
export const PUBLIC_REDIRECTS: Readonly<Record<string, string>> = {
  "/appointment-booking": "/wedding-consultation/",
  "/appointment-booking/": "/wedding-consultation/",
  "/blogs/category/weeding-planning": "/blogs/category/wedding-planning/",
  "/blogs/category/weeding-planning/": "/blogs/category/wedding-planning/",
  "/appointment/payment-success": "/appointment/confirmation/",
  "/appointment/payment-success/": "/appointment/confirmation/",
  "/appointment/payment-failed": "/appointment/request-failed/",
  "/appointment/payment-failed/": "/appointment/request-failed/",
};

export function publicRedirectTarget(pathname: string): string | null {
  return PUBLIC_REDIRECTS[pathname] ?? null;
}

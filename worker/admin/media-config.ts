/**
 * Below Vercel's 4.5MB request-body ceiling on purpose.
 *
 * At 5MB the platform rejected a 4.8MB photograph before this code ran, so the
 * uploader reported a generic failure instead of the panel's own message. The
 * limit people see now is the limit that actually applies.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const ACCEPTED_UPLOAD_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];
export const ACCEPTED_UPLOAD_MIME_LIST = ACCEPTED_UPLOAD_MIME_TYPES.join(",");

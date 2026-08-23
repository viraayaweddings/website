/**
 * Re-exported from worker/db/errors.ts, which is where these live now.
 *
 * A public health route needs the same helpers, and reaching into the admin
 * tree for them would make that route break the day anything server-only was
 * added here. The admin modules keep importing from this path.
 */
export {
  adminDatabaseMessage,
  databaseErrorDetail,
  isDatabaseError,
  isUniqueViolation,
  logDatabaseError,
} from "@/worker/db/errors";

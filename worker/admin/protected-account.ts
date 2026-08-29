/**
 * The owner account's protection from the other admins.
 *
 * `admin` is a flat role: any admin can rename, change the email of, demote,
 * disable, delete or reset the password of any other. The two guards that
 * already existed are about lockout, not ownership -- you cannot change your
 * own role or status, and the last active admin cannot be removed -- so an
 * additional admin was one compromised session away from resetting the owner's
 * password and signing in as them.
 *
 * A protected row refuses all five from anybody but the account itself. Here as
 * a plain predicate rather than inside the actions because
 * app/admin/users/actions.ts is a `"use server"` module: every export of one has
 * to be an async server action, so a guard declared there could not be tested
 * on its own -- and an untested authorisation check is the kind that quietly
 * stops matching one day.
 */

/** Only the fields the guard reads, so any query shape can be checked. */
export interface ProtectableAccount {
  id: string;
  email: string;
  protected?: number | null;
}

export function isProtectedAccount(account: ProtectableAccount): boolean {
  return Number(account.protected ?? 0) === 1;
}

/**
 * The reason this actor may not change this account, or null when they may.
 *
 * Ownership only: the caller still applies the last-admin and self-role guards
 * afterwards, which protect against lockout rather than against takeover.
 */
export function protectionError(account: ProtectableAccount, actorId: string): string | null {
  if (!isProtectedAccount(account)) return null;
  if (account.id === actorId) return null;
  return `${account.email} is the protected owner account. Only its own holder can change it.`;
}

/**
 * The first protected account in `accounts` that `actorId` may not touch.
 *
 * For the bulk paths, which act on a selection: one protected row in the
 * selection has to refuse the whole operation rather than be skipped silently,
 * or a select-all delete would report success while quietly sparing one row.
 */
export function firstProtectionError(
  accounts: ProtectableAccount[],
  actorId: string,
): string | null {
  for (const account of accounts) {
    const error = protectionError(account, actorId);
    if (error) return error;
  }
  return null;
}

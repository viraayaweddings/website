-- Protects the owner's admin account from the other admins.
--
-- `admin` is a flat role: app/admin/users/actions.ts lets any admin rename,
-- change the email of, demote, disable, delete or reset the password of any
-- other admin. Only two guards existed, and neither is about ownership -- you
-- cannot change your own role or status, and the last active admin cannot be
-- removed. So every additional admin was one compromised session away from
-- taking the site: reset the owner's password, sign in as them, done.
--
-- A protected row refuses all five operations from anybody but the account
-- itself. The guard is in the server actions, not the markup, so hiding the
-- controls is not what enforces it.
--
-- There is deliberately no control for this in the panel. An admin who could
-- clear the flag could clear it and then delete the account, which is the same
-- as not having the flag at all. Moving or removing protection is a database
-- edit, on purpose.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "protected" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
-- Matched on the address the account signs in with, lowercased because that is
-- how updateUserAction stores it. Pinned to the row from here on, so the owner
-- can still change their own address without losing protection.
UPDATE "users" SET "protected" = 1, "updated_at" = now()
WHERE lower("email") = 'rohit.raj8691@gmail.com' AND "protected" <> 1;

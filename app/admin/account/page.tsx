// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import { MIN_PASSWORD_LENGTH } from "@/worker/admin/password";
import { AdminShell } from "../_components/AdminShell";
import { SubmitButton } from "../_components/FormControls";
import { Card, CardHead, DetailList, Field } from "../_components/ui";
import { requireUser } from "../_lib/auth";
import {
  changeOwnPasswordAction,
  signOutEverywhereAction,
  updateOwnProfileAction,
} from "./actions";

/**
 * Open to every role, unlike everything else under Configuration.
 *
 * The panel had no way for anyone to change their own password. An editor who
 * suspected theirs was compromised had to ask an admin to set a new one and
 * tell them what it was; an admin who forgot theirs needed a database edit.
 */
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const user = await requireUser("/admin/account");
  await searchParams; // The shell's toast reads these straight from the URL.

  const formatter = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });

  return (
    <AdminShell user={user} title="Your account" subtitle="Your name, your password, and where you are signed in.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card pad={false}>
          <CardHead title="Who you are" icon="users" />
          <div className="vw-card-pad space-y-4">
            <DetailList
              rows={[
                { label: "Email", value: user.email },
                { label: "Role", value: user.role === "admin" ? "Admin" : "Editor" },
                {
                  label: "Last signed in",
                  value: user.lastLoginAt ? formatter.format(user.lastLoginAt) : "—",
                },
              ]}
            />
            <p className="text-xs leading-5" style={{ color: "var(--ink-faint)" }}>
              Your email address is how you sign in, so only an admin can change it. Ask one if it is wrong.
            </p>
            <form action={updateOwnProfileAction} className="space-y-3">
              <Field label="Name" name="name" defaultValue={user.name} required autoComplete="name" />
              <SubmitButton pendingLabel="Saving…">Save name</SubmitButton>
            </form>
          </div>
        </Card>

        <Card pad={false}>
          <CardHead title="Change password" icon="settings" />
          <div className="vw-card-pad space-y-4">
            <form action={changeOwnPasswordAction} className="space-y-3">
              <Field
                label="Current password"
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
              />
              <Field
                label="New password"
                name="newPassword"
                type="password"
                required
                autoComplete="new-password"
                hint={`At least ${MIN_PASSWORD_LENGTH} characters, including a letter and a number.`}
              />
              <Field
                label="Confirm new password"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
              />
              <SubmitButton pendingLabel="Changing…">Change password</SubmitButton>
            </form>
            <p className="text-xs leading-5" style={{ color: "var(--ink-faint)" }}>
              Changing it signs out every other device. This one stays signed in.
            </p>
          </div>
        </Card>

        <Card pad={false}>
          <CardHead title="Signed-in devices" icon="warning" />
          <div className="vw-card-pad space-y-3">
            <p className="text-sm leading-6" style={{ color: "var(--ink-soft)" }}>
              If you have signed in somewhere you no longer trust — a shared machine, a phone you no longer
              have — end every session at once. You will be signed out here too and will need to sign in again.
            </p>
            <form action={signOutEverywhereAction}>
              <SubmitButton variant="danger" icon="warning" pendingLabel="Signing out…">
                Sign out everywhere
              </SubmitButton>
            </form>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}

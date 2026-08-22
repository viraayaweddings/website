// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import { asc } from "drizzle-orm";
import { MIN_PASSWORD_LENGTH } from "@/worker/admin/password";
import { USER_ROLES, users } from "@/worker/db/schema";
import { AdminShell } from "../_components/AdminShell";
import { BulkSelection, RowCheckbox } from "../_components/BulkBar";
import { DeleteConfirmTrigger } from "../_components/DeleteConfirmTrigger";
import { SubmitButton } from "../_components/FormControls";
import {
  Alert,
  Badge,
  Card,
  CardHead,
  Field,
  Select,
  StatusBadge,
  formatRelative,
} from "../_components/ui";
import { currentTime } from "../_lib/clock";
import { requireDb, requireRole } from "../_lib/auth";
import { bulkDeleteUsersAction, createUserAction, deleteUserAction, resetPasswordAction, updateUserAction } from "./actions";

const USERS_BULK_FORM = "users-bulk-form";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; delete?: string }>;
}) {
  const currentUser = await requireRole("admin", "/admin/users", "user accounts");
  const db = await requireDb();
  await searchParams;
  const now = await currentTime();

  const accounts = await db.select().from(users).orderBy(asc(users.name));
  const admins = accounts.filter((account) => account.role === "admin" && account.status === "active").length;

  return (
    <AdminShell
      user={currentUser}
      title="Users"
      subtitle={`${accounts.length} account${accounts.length === 1 ? "" : "s"}, ${admins} active admin${admins === 1 ? "" : "s"}.`}
    >

      {admins === 1 ? (
        <div className="mb-4">
          <Alert tone="warning" title="Only one active admin">
            If this account is lost, nobody can manage users or settings. Promoting a second admin is worth
            doing before you need it.
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <form id={USERS_BULK_FORM}>
            <BulkSelection noun="account" formId={USERS_BULK_FORM}>
              <SubmitButton
                variant="danger-quiet"
                size="sm"
                icon="trash"
                pendingLabel="Deleting…"
                formAction={bulkDeleteUsersAction}
                confirm="Delete every selected account? This signs them out immediately."
              >
                Delete
              </SubmitButton>
            </BulkSelection>
          </form>

          {accounts.map((account) => (
            <Card key={account.id} pad={false}>
              <CardHead
                title={account.name}
                hint={account.email}
                icon="users"
              >
                {account.id === currentUser.id ? null : (
                  <RowCheckbox id={account.id} label={account.email} form={USERS_BULK_FORM} />
                )}
                <StatusBadge status={account.role} />
                <StatusBadge status={account.status} />
                {account.id === currentUser.id ? <Badge tone="info">you</Badge> : null}
              </CardHead>

              <div className="vw-card-pad">
                <p className="mb-3 text-xs" style={{ color: "var(--ink-faint)" }}>
                  Last signed in {formatRelative(account.lastLoginAt, now)}
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <form action={updateUserAction} className="space-y-2.5">
                    <input type="hidden" name="id" value={account.id} />
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      <Select
                        label="Role"
                        name="role"
                        defaultValue={account.role}
                        options={USER_ROLES.map((role) => ({ value: role, label: role }))}
                      />
                      <Select
                        label="Status"
                        name="status"
                        defaultValue={account.status}
                        options={[
                          { value: "active", label: "active" },
                          { value: "disabled", label: "disabled" },
                        ]}
                      />
                    </div>
                    <SubmitButton variant="secondary" size="sm" icon="check">
                      Update access
                    </SubmitButton>
                  </form>

                  <form action={resetPasswordAction} className="space-y-2.5">
                    <input type="hidden" name="id" value={account.id} />
                    <Field
                      label="Set a new password"
                      name="password"
                      type="password"
                      required
                      autoComplete="new-password"
                      hint="Signs this account out of every device."
                    />
                    <SubmitButton variant="secondary" size="sm" icon="refresh" pendingLabel="Resetting…">
                      Reset password
                    </SubmitButton>
                  </form>
                </div>
              </div>

              {account.id === currentUser.id ? null : (
                <div className="flex justify-end border-t px-5 py-2" style={{ borderColor: "var(--line)" }}>
                  <DeleteConfirmTrigger
                    action={deleteUserAction}
                    id={account.id}
                    what={account.email}
                    note="They are signed out immediately and lose all access. Their name stays on past entries in the activity log."
                    label="Delete account"
                  />
                </div>
              )}
            </Card>
          ))}
        </div>

        <Card className="h-fit lg:sticky lg:top-20" pad={false}>
          <CardHead title="Add a user" icon="plus" />
          <form action={createUserAction} className="vw-card-pad space-y-3">
            <Field label="Name" name="name" required />
            <Field label="Email" name="email" type="email" required />
            <Select
              label="Role"
              name="role"
              defaultValue="editor"
              options={USER_ROLES.map((role) => ({ value: role, label: role }))}
              hint="Editors manage submissions and content. Admins also manage users, settings and city pages."
            />
            <Field
              label="Temporary password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              hint={`At least ${MIN_PASSWORD_LENGTH} characters, including a letter and a number.`}
            />
            <SubmitButton icon="plus" block pendingLabel="Creating…">
              Create user
            </SubmitButton>
          </form>
        </Card>
      </div>
    </AdminShell>
  );
}

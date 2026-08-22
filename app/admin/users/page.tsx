// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import { asc } from "drizzle-orm";
import { MIN_PASSWORD_LENGTH } from "@/worker/admin/password";
import { USER_ROLES, users } from "@/worker/db/schema";
import { AdminShell } from "../_components/AdminShell";
import { BulkSelection, RowCheckbox } from "../_components/BulkBar";
import { DeleteConfirmTrigger } from "../_components/DeleteConfirmTrigger";
import { AutoSubmitControls, LiveSearch, SubmitButton } from "../_components/FormControls";
import { Icon } from "../_components/icons";
import {
  Alert,
  Badge,
  Card,
  CardHead,
  EmptyState,
  Field,
  LinkButton,
  Select,
  StatusBadge,
  formatDateTime,
  formatRelative,
} from "../_components/ui";
import { currentTime } from "../_lib/clock";
import { requireDb, requireRole } from "../_lib/auth";
import { bulkDeleteUsersAction, createUserAction, deleteUserAction, resetPasswordAction, updateUserAction } from "./actions";

const USERS_BULK_FORM = "users-bulk-form";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; delete?: string; q?: string; role?: string; status?: string; sort?: string }>;
}) {
  const currentUser = await requireRole("admin", "/admin/users", "user accounts");
  const db = await requireDb();
  const params = await searchParams;
  const now = await currentTime();

  const accounts = await db.select().from(users).orderBy(asc(users.name));
  const admins = accounts.filter((account) => account.role === "admin" && account.status === "active").length;
  const disabled = accounts.filter((account) => account.status === "disabled").length;
  const query = (params.q || "").trim().slice(0, 120);
  const roleFilter = (USER_ROLES as readonly string[]).includes(params.role || "") ? params.role || "" : "";
  const statusFilter = params.status === "active" || params.status === "disabled" ? params.status : "";
  const sort = ["name", "email", "newest", "recent"].includes(params.sort || "") ? params.sort || "name" : "name";
  const normalizedQuery = query.toLowerCase();
  const visibleAccounts = accounts
    .filter((account) => {
      if (roleFilter && account.role !== roleFilter) return false;
      if (statusFilter && account.status !== statusFilter) return false;
      if (!normalizedQuery) return true;
      return [account.name, account.email, account.role, account.status].some((value) =>
        (value || "").toLowerCase().includes(normalizedQuery),
      );
    })
    .sort((a, b) => {
      if (sort === "email") return a.email.localeCompare(b.email);
      if (sort === "newest") return b.createdAt.getTime() - a.createdAt.getTime();
      if (sort === "recent") return (b.lastLoginAt?.getTime() ?? 0) - (a.lastLoginAt?.getTime() ?? 0);
      return (a.name || a.email).localeCompare(b.name || b.email);
    });
  const filtered = Boolean(query || roleFilter || statusFilter || sort !== "name");
  const canBulkDelete = visibleAccounts.some((account) => account.id !== currentUser.id);

  return (
    <AdminShell
      user={currentUser}
      title="Users"
      subtitle={`${visibleAccounts.length} account${visibleAccounts.length === 1 ? "" : "s"} shown from ${accounts.length}, ${admins} active admin${admins === 1 ? "" : "s"}, ${disabled} disabled.`}
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
          <Card>
            <form method="get" className="space-y-3">
              <AutoSubmitControls />
              <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-end">
                <div>
                  <span className="vw-label">Search</span>
                  <LiveSearch name="q" defaultValue={query} placeholder="Name, email, role or status" />
                </div>
                <label className="block">
                  <span className="vw-label">Role</span>
                  <select name="role" defaultValue={roleFilter} className="vw-select">
                    <option value="">Any role</option>
                    {USER_ROLES.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="vw-label">Status</span>
                  <select name="status" defaultValue={statusFilter} className="vw-select">
                    <option value="">Any status</option>
                    <option value="active">active</option>
                    <option value="disabled">disabled</option>
                  </select>
                </label>
                <label className="block">
                  <span className="vw-label">Sort</span>
                  <select name="sort" defaultValue={sort} className="vw-select">
                    <option value="name">Name</option>
                    <option value="email">Email</option>
                    <option value="newest">Newest</option>
                    <option value="recent">Recent sign-in</option>
                  </select>
                </label>
                <button type="submit" className="vw-btn vw-btn-secondary">
                  <Icon name="filter" size={15} />
                  Apply
                </button>
              </div>
              {filtered ? (
                <div className="flex justify-end">
                  <LinkButton href="/admin/users" variant="ghost" size="sm" icon="close">
                    Reset filters
                  </LinkButton>
                </div>
              ) : null}
            </form>
          </Card>

          {canBulkDelete ? (
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
          ) : null}

          {visibleAccounts.length === 0 ? (
            <Card>
              <EmptyState
                icon="users"
                title={filtered ? "No users match these filters" : "No users found"}
                action={filtered ? <LinkButton href="/admin/users" variant="secondary">Clear filters</LinkButton> : null}
              >
                {filtered ? "Try a different search term, role, or status." : "Create the first admin account from setup."}
              </EmptyState>
            </Card>
          ) : null}

          {visibleAccounts.map((account) => (
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
                  Last signed in {formatRelative(account.lastLoginAt, now)} · Created {formatDateTime(account.createdAt)}
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  {account.id === currentUser.id ? (
                    <div className="space-y-2.5">
                      <p className="vw-label">Access</p>
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        <div className="rounded-[8px] border px-3 py-2" style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}>
                          <p className="text-xs" style={{ color: "var(--ink-faint)" }}>Role</p>
                          <p className="font-medium">{account.role}</p>
                        </div>
                        <div className="rounded-[8px] border px-3 py-2" style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}>
                          <p className="text-xs" style={{ color: "var(--ink-faint)" }}>Status</p>
                          <p className="font-medium">{account.status}</p>
                        </div>
                      </div>
                      <Alert tone="quiet" title="Signed-in account">
                        Another active admin must change your role or status.
                      </Alert>
                    </div>
                  ) : (
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
                  )}

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

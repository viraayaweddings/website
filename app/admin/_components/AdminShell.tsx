/**
 * The frame every admin screen renders inside.
 *
 * A server component wrapping the interactive chrome, so pages can keep passing
 * the whole `User` row they already loaded while only the three fields the
 * browser needs cross into client code. The row also holds the password hash,
 * which must never be serialised into the page.
 */
import type { User } from "@/worker/db/schema";
import { ShellChrome } from "./ShellChrome";

export function AdminShell({
  user,
  title,
  subtitle,
  actions,
  children,
}: {
  user: User;
  title: string;
  /** One line under the heading: what this screen is for. */
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <ShellChrome
      user={{ name: user.name, email: user.email, role: user.role }}
      title={title}
      subtitle={subtitle}
      actions={actions}
    >
      {children}
    </ShellChrome>
  );
}

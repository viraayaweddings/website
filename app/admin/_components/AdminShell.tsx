/**
 * The frame every admin screen renders inside.
 *
 * Page headings and action buttons stay in this server component. Only plain
 * strings cross into ShellChrome; server-rendered buttons must not be passed as
 * props to a client component.
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
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="vw-display text-2xl font-semibold" style={{ color: "var(--ink)" }}>
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm" style={{ color: "var(--ink-soft)" }}>
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </ShellChrome>
  );
}

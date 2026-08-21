// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import { AdminShell } from "../../_components/AdminShell";
import { Alert, LinkButton } from "../../_components/ui";
import { requireUser } from "../../_lib/auth";
import { PostForm } from "../_form";
import { createPostAction } from "../actions";

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser("/admin/blogs/new");
  await searchParams; // The shell's toast reads these straight from the URL.

  return (
    <AdminShell
      user={user}
      title="New article"
      subtitle="A new article has no page of its own in the site files, so it borrows the layout of an existing one."
      actions={
        <LinkButton href="/admin/blogs" icon="chevronLeft" variant="ghost">
          Back to articles
        </LinkButton>
      }
    >
      <div className="mb-4">
        <Alert tone="info" title="Publish when you are ready">
          Leave the status as draft while you write. Headings in the body get an id automatically, and that is
          what builds the table of contents on the published page.
        </Alert>
      </div>

      <PostForm faqs={[]} action={createPostAction} submitLabel="Create article" />
    </AdminShell>
  );
}

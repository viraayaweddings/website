// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { desc, like, or, sql, type SQL } from "drizzle-orm";
import { media } from "@/worker/db/schema";
import { buildImageUsage } from "@/worker/admin/image-references";
import { AdminShell } from "../_components/AdminShell";
import { Donut } from "../_components/Charts";
import { LiveSearch } from "../_components/FormControls";
import { Icon } from "../_components/icons";
import { Uploader } from "../_components/Uploader";
import {
  Alert,
  Card,
  EmptyState,
  LinkButton,
  formatBytes,
  formatCount,
  formatDateTime,
  formatRelative,
} from "../_components/ui";
import { currentTime } from "../_lib/clock";
import { isAdmin, requireDb, requireUser } from "../_lib/auth";
import { bulkDeleteMediaAction, deleteMediaAction } from "./actions";
import { MediaLibrary, type MediaLibraryItem } from "./MediaLibrary";

const PAGE_SIZE = 48;

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; show?: string; q?: string; page?: string }>;
}) {
  const user = await requireUser("/admin/media");
  const db = await requireDb();
  const params = await searchParams;
  const now = await currentTime();
  const onlyUnused = params.show === "unused";
  const query = (params.q || "").trim().slice(0, 120);
  const page = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);

  const clauses: SQL[] = [];
  if (query) {
    const needle = `%${query.replace(/[%_]/g, " ").trim()}%`;
    const match = or(like(media.filename, needle), like(media.key, needle));
    if (match) clauses.push(match);
  }
  const where = clauses.length === 0 ? undefined : clauses[0];

  const listQuery = db.select().from(media);
  const countQuery = db.select({ total: sql<number>`count(*)` }).from(media);

  const [files, totals] = await Promise.all([
    (where ? listQuery.where(where) : listQuery)
      .orderBy(desc(media.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    where ? countQuery.where(where) : countQuery,
  ]);

  const total = Number(totals[0]?.total ?? 0);
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // One pass over the content tables, rather than three queries per file.
  const usage = await buildImageUsage(db);
  const withUsage = files.map((file) => ({ file, references: usage.get(file.key) ?? [] }));

  const unused = withUsage.filter((entry) => entry.references.length === 0);
  const unusedBytes = unused.reduce((sum, entry) => sum + entry.file.size, 0);
  const shown = onlyUnused ? unused : withUsage;
  const items: MediaLibraryItem[] = shown.map(({ file, references }) => ({
    key: file.key,
    filename: file.filename,
    contentType: file.contentType,
    size: file.size,
    sizeLabel: formatBytes(file.size),
    uploadedBy: file.uploadedBy,
    createdAt: file.createdAt.toISOString(),
    createdLabel: formatDateTime(file.createdAt),
    relativeLabel: formatRelative(file.createdAt, now),
    references,
  }));

  const href = (next: Record<string, string | number>) => {
    const search = new URLSearchParams();
    const merged = { q: query, show: onlyUnused ? "unused" : "", page, ...next };
    if (merged.q) search.set("q", String(merged.q));
    if (merged.show) search.set("show", String(merged.show));
    if (Number(merged.page) > 1) search.set("page", String(merged.page));
    const string = search.toString();
    return `/admin/media${string ? `?${string}` : ""}`;
  };

  return (
    <AdminShell
      user={user}
      title="Images"
      subtitle={`${formatCount(total)} file${total === 1 ? "" : "s"}${query ? " matching your search" : " uploaded"} · page ${page} of ${lastPage}.`}
    >
      <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Uploader />

        <Card>
          <p className="vw-eyebrow mb-2">Space in use</p>
          <Donut
            value={files.length - unused.length}
            total={files.length || 1}
            label={`in use on this page · ${formatBytes(unusedBytes)} unused here`}
            tone="var(--ok)"
          />
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Link href={href({ show: "", page: 1 })} className="vw-chip" data-on={!onlyUnused}>
              All on page {files.length}
            </Link>
            <Link href={href({ show: "unused", page: 1 })} className="vw-chip" data-on={onlyUnused}>
              Unused {unused.length}
            </Link>
          </div>
        </Card>
      </div>

      <Card className="mb-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          {onlyUnused ? <input type="hidden" name="show" value="unused" /> : null}
          <div className="min-w-[14rem] flex-1">
            <span className="vw-label">Search</span>
            <LiveSearch name="q" defaultValue={query} placeholder="Filename or path" />
          </div>
          <button type="submit" className="vw-btn vw-btn-secondary">
            <Icon name="search" size={15} />
            Search
          </button>
          {query ? (
            <LinkButton href={onlyUnused ? "/admin/media?show=unused" : "/admin/media"} icon="close" variant="ghost">
              Clear
            </LinkButton>
          ) : null}
        </form>
      </Card>

      <div className="mb-4">
        <Alert tone="info" title="Pictures that came with the site are not listed here">
          Only images uploaded through the panel appear. Identical uploads share one file, so the same picture
          can be used in several places at once and is only removable once nothing points at it.
        </Alert>
      </div>

      {shown.length === 0 ? (
        <Card>
          <EmptyState
            icon="image"
            title={onlyUnused ? "Everything on this page is in use" : query ? "No images match" : "Nothing uploaded yet"}
          >
            {onlyUnused
              ? "Every uploaded image on this page is referenced by a venue, article or slide."
              : query
                ? "Try a different search term."
                : "Drop a few images above, then pick them from any image field or from inside the editor."}
          </EmptyState>
        </Card>
      ) : (
        <MediaLibrary
          items={items}
          isAdmin={isAdmin(user)}
          deleteAction={deleteMediaAction}
          bulkDeleteAction={bulkDeleteMediaAction}
        />
      )}

      {lastPage > 1 ? (
        <nav className="mt-4 flex items-center justify-between gap-3 text-sm" aria-label="Pages">
          <span style={{ color: "var(--ink-faint)" }}>
            Page {page} of {lastPage}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <LinkButton href={href({ page: page - 1 })} size="sm" icon="chevronLeft">
                Previous
              </LinkButton>
            ) : null}
            {page < lastPage ? (
              <LinkButton href={href({ page: page + 1 })} size="sm">
                Next
              </LinkButton>
            ) : null}
          </div>
        </nav>
      ) : null}
    </AdminShell>
  );
}

// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { desc, like, or, sql, type SQL } from "drizzle-orm";
import { media } from "@/worker/db/schema";
import { buildImageUsage } from "@/worker/admin/image-references";
import { AdminShell } from "../_components/AdminShell";
import { Donut } from "../_components/Charts";
import { AutoSubmitControls, LiveSearch } from "../_components/FormControls";
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
const SORTS = new Set(["newest", "oldest", "name", "largest", "smallest"]);
const USAGE_FILTERS = new Set(["all", "used", "unused"]);
const TYPES = [
  { value: "all", label: "All types" },
  { value: "image/jpeg", label: "JPEG" },
  { value: "image/png", label: "PNG" },
  { value: "image/webp", label: "WebP" },
  { value: "image/avif", label: "AVIF" },
  { value: "image/gif", label: "GIF" },
  { value: "image/svg+xml", label: "SVG" },
];

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; show?: string; q?: string; page?: string; type?: string; sort?: string }>;
}) {
  const user = await requireUser("/admin/media");
  const db = await requireDb();
  const params = await searchParams;
  const now = await currentTime();
  const usageFilter = USAGE_FILTERS.has(params.show || "") ? params.show || "all" : "all";
  const onlyUnused = usageFilter === "unused";
  const typeFilter = TYPES.some((type) => type.value === params.type) ? params.type || "all" : "all";
  const sort = SORTS.has(params.sort || "") ? params.sort || "newest" : "newest";
  const query = (params.q || "").trim().slice(0, 120);
  const page = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);

  const clauses: SQL[] = [];
  if (query) {
    const needle = `%${query.replace(/[%_]/g, " ").trim()}%`;
    const match = or(
      like(media.filename, needle),
      like(media.key, needle),
      like(media.contentType, needle),
      like(media.uploadedBy, needle),
    );
    if (match) clauses.push(match);
  }
  const where = clauses.length === 0 ? undefined : clauses[0];

  const listQuery = db.select().from(media);
  const countQuery = db.select({ total: sql<number>`count(*)`, bytes: sql<number>`coalesce(sum(${media.size}), 0)` }).from(media);

  const [matchingFiles, totals] = await Promise.all([
    (where ? listQuery.where(where) : listQuery).orderBy(desc(media.createdAt)),
    where ? countQuery.where(where) : countQuery,
  ]);

  const matchingTotal = Number(totals[0]?.total ?? 0);
  const matchingBytes = Number(totals[0]?.bytes ?? 0);

  // One pass over the content tables, rather than three queries per file.
  const usage = await buildImageUsage(db);
  const withUsage = matchingFiles.map((file) => ({ file, references: usage.get(file.key) ?? [] }));

  const filtered = withUsage
    .filter((entry) => {
      if (typeFilter !== "all" && entry.file.contentType !== typeFilter) return false;
      if (usageFilter === "used") return entry.references.length > 0;
      if (usageFilter === "unused") return entry.references.length === 0;
      return true;
    })
    .sort((a, b) => {
      if (sort === "oldest") return a.file.createdAt.getTime() - b.file.createdAt.getTime();
      if (sort === "name") return (a.file.filename || a.file.key).localeCompare(b.file.filename || b.file.key);
      if (sort === "largest") return b.file.size - a.file.size;
      if (sort === "smallest") return a.file.size - b.file.size;
      return b.file.createdAt.getTime() - a.file.createdAt.getTime();
    });

  const unused = withUsage.filter((entry) => entry.references.length === 0);
  const unusedBytes = unused.reduce((sum, entry) => sum + entry.file.size, 0);
  const total = filtered.length;
  const filteredBytes = filtered.reduce((sum, entry) => sum + entry.file.size, 0);
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, lastPage);
  const shown = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
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
    const merged = {
      q: query,
      show: usageFilter === "all" ? "" : usageFilter,
      type: typeFilter === "all" ? "" : typeFilter,
      sort: sort === "newest" ? "" : sort,
      page: safePage,
      ...next,
    };
    if (merged.q) search.set("q", String(merged.q));
    if (merged.show) search.set("show", String(merged.show));
    if (merged.type) search.set("type", String(merged.type));
    if (merged.sort) search.set("sort", String(merged.sort));
    if (Number(merged.page) > 1) search.set("page", String(merged.page));
    const string = search.toString();
    return `/admin/media${string ? `?${string}` : ""}`;
  };

  return (
    <AdminShell
      user={user}
      title="Images"
      subtitle={`${formatCount(total)} file${total === 1 ? "" : "s"} shown from ${formatCount(matchingTotal)} matching · ${formatBytes(filteredBytes)} shown · page ${safePage} of ${lastPage}.`}
    >
      <div className="mb-4 grid items-stretch gap-4 lg:grid-cols-[1fr_20rem]">
        <Uploader />

        <Card className="h-full">
          <p className="vw-eyebrow mb-2">Space in use</p>
          <Donut
            value={matchingFiles.length - unused.length}
            total={matchingFiles.length || 1}
            label={`${formatBytes(matchingBytes)} matching · ${formatBytes(unusedBytes)} unused`}
            tone="var(--ok)"
          />
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Link href={href({ show: "", page: 1 })} className="vw-chip" data-on={!onlyUnused}>
              All {matchingFiles.length}
            </Link>
            <Link href={href({ show: "used", page: 1 })} className="vw-chip" data-on={usageFilter === "used"}>
              In use {matchingFiles.length - unused.length}
            </Link>
            <Link href={href({ show: "unused", page: 1 })} className="vw-chip" data-on={onlyUnused}>
              Unused {unused.length}
            </Link>
          </div>
        </Card>
      </div>

      <Card className="mb-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <AutoSubmitControls />
          <div className="min-w-[14rem] flex-1">
            <span className="vw-label">Search</span>
            <LiveSearch name="q" defaultValue={query} placeholder="Filename or path" />
          </div>
          <label className="min-w-[9rem]">
            <span className="vw-label">Usage</span>
            <select name="show" defaultValue={usageFilter} className="vw-select">
              <option value="all">All usage</option>
              <option value="used">In use</option>
              <option value="unused">Unused</option>
            </select>
          </label>
          <label className="min-w-[9rem]">
            <span className="vw-label">Type</span>
            <select name="type" defaultValue={typeFilter} className="vw-select">
              {TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-[9rem]">
            <span className="vw-label">Sort</span>
            <select name="sort" defaultValue={sort} className="vw-select">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">File name</option>
              <option value="largest">Largest first</option>
              <option value="smallest">Smallest first</option>
            </select>
          </label>
          <button type="submit" className="vw-btn vw-btn-secondary">
            <Icon name="search" size={15} />
            Search
          </button>
          {query || usageFilter !== "all" || typeFilter !== "all" || sort !== "newest" ? (
            <LinkButton href="/admin/media" icon="close" variant="ghost">
              Clear
            </LinkButton>
          ) : null}
        </form>
      </Card>

      <div className="mb-4">
        <Alert tone="info" title="Media library is the image source of truth">
          Uploaded and migrated website images appear here with file size, type, URL, and usage. Identical uploads
          share one file and are only removable once nothing points at them.
        </Alert>
      </div>

      {shown.length === 0 ? (
        <Card>
          <EmptyState
            icon="image"
            title={onlyUnused ? "No unused images match" : query ? "No images match" : "Nothing uploaded yet"}
          >
            {onlyUnused
              ? "Every matching image is referenced by tracked website content."
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
            Page {safePage} of {lastPage}
          </span>
          <div className="flex gap-2">
            {safePage > 1 ? (
              <LinkButton href={href({ page: safePage - 1 })} size="sm" icon="chevronLeft">
                Previous
              </LinkButton>
            ) : null}
            {safePage < lastPage ? (
              <LinkButton href={href({ page: safePage + 1 })} size="sm">
                Next
              </LinkButton>
            ) : null}
          </div>
        </nav>
      ) : null}
    </AdminShell>
  );
}

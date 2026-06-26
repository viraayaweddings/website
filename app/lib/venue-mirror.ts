import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import { getHomepageFooter } from "../homepage-shell";

const LOCAL_HOSTS: Array<[string, string]> = [
  ["https://gcpimages.theweddingcompany.com", "/venue-assets/gcpimages"],
  ["https://imageswedding.theweddingcompany.com", "/venue-assets/imageswedding"],
  ["https://weddingimage.betterhalf.ai", "/venue-assets/weddingimage"],
  ["https://maps.gstatic.com", "/venue-assets/maps"]
];

const LOCAL_ALIASES: Array<[string, string]> = [
  ["/twc-venues-local/gcpimages.theweddingcompany.com", "/venue-assets/gcpimages"],
  ["/twc-venues-local/imageswedding.theweddingcompany.com", "/venue-assets/imageswedding"],
  ["/twc-venues-local/weddingimage.betterhalf.ai", "/venue-assets/weddingimage"],
  ["/twc-venues-local/maps.gstatic.com", "/venue-assets/maps"]
];

const VENUE_INCLUDE = {
  city: true,
  media: {
    orderBy: { position: "asc" }
  },
  tags: true,
  areas: true,
  amenities: true,
  facilities: true
} as const;

const SIMILAR_SELECT = {
  vendorId: true,
  slug: true,
  name: true,
  formattedAddress: true,
  citySlug: true,
  shortAddress: true,
  userRating: true,
  minPerPlateCost: true,
  maxPerPlateCost: true,
  minPerDayCost: true,
  maxPerDayCost: true,
  minRoomCount: true,
  maxRoomCount: true,
  minAreaCapacity: true,
  maxAreaCapacity: true,
  parkingCount: true,
  isBhPartner: true,
  bhPartnerDealText: true,
  userRatingCount: true,
  longitude: true,
  latitude: true,
  city: { select: { name: true, slug: true } },
  media: {
    orderBy: { position: "asc" },
    take: 4,
    select: {
      localPath: true,
      originalUrl: true,
      mimeType: true,
      mediaId: true,
      position: true
    }
  }
} as const;

function html(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function json(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function aliasLocalAssetPaths(value: string) {
  let next = value;
  for (const [oldPath, alias] of LOCAL_ALIASES) {
    next = next.split(oldPath).join(alias);
  }
  return next;
}

function localizeUrl(url: string | null | undefined): string {
  if (!url) return "";
  const aliased = aliasLocalAssetPaths(url);
  for (const [live, local] of LOCAL_HOSTS) {
    if (aliased.startsWith(live)) return local + aliased.slice(live.length);
  }
  return aliased;
}

function mediaUrl(media: any) {
  return localizeUrl(media?.localPath && media.localPath.startsWith("/") ? media.localPath : media?.originalUrl);
}

function money(min?: number | null, max?: number | null) {
  if (min == null && max == null) return "Contact for pricing";
  if (min != null && max != null && min !== max) return `Rs ${min} - Rs ${max}`;
  return `Rs ${min ?? max}+`;
}

function range(min?: number | null, max?: number | null, fallback = "Contact venue") {
  if (min == null && max == null) return fallback;
  if (min != null && max != null && min !== max) return `${min} - ${max}`;
  return String(min ?? max);
}

function textFromRichContent(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value !== "object") return String(value);
  const maybeOps = (value as { ops?: Array<{ insert?: unknown }> }).ops;
  if (!Array.isArray(maybeOps)) return "";
  return maybeOps.map((op) => (typeof op.insert === "string" ? op.insert : "")).join("").trim();
}

function detailAbout(row: any) {
  const detail = row.detailPayload && typeof row.detailPayload === "object" ? row.detailPayload : {};
  const listing = row.listingPayload && typeof row.listingPayload === "object" ? row.listingPayload : {};
  return textFromRichContent((detail as any).about ?? (listing as any).about);
}

async function findVenue(citySlug: string, slug: string) {
  const city = decodeURIComponent(citySlug).trim().toLowerCase();
  const venueSlug = decodeURIComponent(slug).trim().toLowerCase();
  const exact = await prisma.venue.findFirst({
    where: { citySlug: { equals: city, mode: "insensitive" }, slug: { equals: venueSlug, mode: "insensitive" } },
    include: VENUE_INCLUDE
  });
  if (exact) return exact;
  return prisma.venue.findFirst({
    where: { citySlug: { equals: city, mode: "insensitive" }, slug: { contains: venueSlug, mode: "insensitive" } },
    include: VENUE_INCLUDE
  });
}

function gallery(images: any[]) {
  const items = images.slice(0, 8).map((item, index) => {
    const src = mediaUrl(item);
    if (!src) return "";
    return `<img src="${html(src)}" alt="" class="venue-photo venue-photo-${index}" loading="${index === 0 ? "eager" : "lazy"}" />`;
  });
  return items.join("");
}

function chips(items: Array<{ label?: string }>) {
  return items.map((item) => `<span class="chip">${html(item.label)}</span>`).join("");
}

function areaRows(areas: any[]) {
  if (!areas.length) return `<p class="muted">Contact the venue for area details.</p>`;
  return areas
    .map(
      (area) => `<div class="info-row">
        <strong>${html(area.name)}</strong>
        <span>${html(area.areaType || "Venue space")}</span>
        <span>${html(range(area.seatingCapacity, area.floatingCapacity, "Capacity on request"))}</span>
      </div>`
    )
    .join("");
}

function similarCards(rows: any[]) {
  return rows
    .map((row) => {
      const image = mediaUrl(row.media?.[0]);
      return `<a class="similar-card" href="/wedding-venues/${html(row.citySlug)}/${html(row.slug)}">
        ${image ? `<img src="${html(image)}" alt="" loading="lazy" />` : ""}
        <strong>${html(row.name)}</strong>
        <span>${html(row.shortAddress || row.city?.name || row.citySlug)}</span>
        <small>${html(money(row.minPerPlateCost, row.maxPerPlateCost))}</small>
      </a>`;
    })
    .join("");
}

function mapMarkers(row: any, similarRows: any[]) {
  const markers = [];
  if (row.longitude != null && row.latitude != null) {
    markers.push({
      kind: "current",
      name: row.name,
      lat: row.latitude,
      lng: row.longitude,
      href: `/wedding-venues/${row.citySlug}/${row.slug}`
    });
  }
  for (const item of similarRows) {
    if (item.longitude == null || item.latitude == null) continue;
    markers.push({
      kind: "similar",
      name: item.name,
      lat: item.latitude,
      lng: item.longitude,
      href: `/wedding-venues/${item.citySlug}/${item.slug}`
    });
  }
  return markers;
}

function pageHtml(row: any, similarRows: any[]) {
  const images = [...(row.media || [])];
  const cityName = row.city?.name || row.citySlug;
  const about = detailAbout(row);
  const markers = mapMarkers(row, similarRows);
  const initial = markers[0] || { lat: 28.61, lng: 77.2 };
  const title = `${row.name} in ${cityName} | Viraaya Weddings`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${html(title)}</title>
  <meta name="description" content="${html(`${row.name} wedding venue in ${cityName}. View pricing, capacity, photos, amenities and similar venues.`)}" />
  <link rel="icon" href="/brand/favicon.png" type="image/png" />
  <link rel="stylesheet" href="/twc-mirror/vendor/leaflet/leaflet.css" />
  <style>
    :root { color-scheme: light; --brand: #a1285e; --ink: #1f2933; --muted: #64748b; --line: #e5e7eb; --soft: #fff7fb; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: var(--ink); background: #fff; }
    a { color: inherit; text-decoration: none; }
    .topbar { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 14px clamp(18px, 5vw, 72px); background: rgba(255,255,255,.94); border-bottom: 1px solid var(--line); backdrop-filter: blur(12px); }
    .brand { display: flex; align-items: center; gap: 10px; font-weight: 800; color: var(--brand); }
    .brand img { height: 42px; width: auto; }
    .nav { display: flex; gap: 20px; color: var(--muted); font-size: 14px; }
    main { padding-bottom: 56px; }
    .hero { padding: 28px clamp(18px, 5vw, 72px) 18px; }
    .breadcrumbs { color: var(--muted); font-size: 13px; margin-bottom: 16px; }
    h1 { margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: clamp(30px, 5vw, 58px); line-height: 1.05; letter-spacing: 0; }
    .sub { display: flex; flex-wrap: wrap; gap: 10px 18px; margin-top: 14px; color: var(--muted); }
    .gallery { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 8px; margin-top: 22px; min-height: 260px; }
    .venue-photo { width: 100%; height: 100%; min-height: 168px; object-fit: cover; background: #f1f5f9; }
    .venue-photo-0 { grid-row: span 2; min-height: 420px; border-radius: 8px 0 0 8px; }
    .venue-photo-2 { border-radius: 0 8px 0 0; }
    .venue-photo-4 { border-radius: 0 0 8px 0; }
    .layout { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 32px; padding: 24px clamp(18px, 5vw, 72px); align-items: start; }
    .panel { border: 1px solid var(--line); border-radius: 8px; padding: 22px; background: #fff; }
    .side { position: sticky; top: 88px; }
    .cta { display: block; width: 100%; margin-top: 18px; padding: 14px 16px; border: 0; border-radius: 999px; background: var(--brand); color: white; text-align: center; font-weight: 700; }
    h2 { margin: 0 0 14px; font-size: 24px; letter-spacing: 0; }
    .section { margin-top: 26px; }
    .text { color: #334155; line-height: 1.75; white-space: pre-line; }
    .stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .stat { padding: 14px; border-radius: 8px; background: var(--soft); }
    .stat small { display: block; color: var(--muted); margin-bottom: 4px; }
    .stat strong { display: block; font-size: 18px; }
    .chips { display: flex; flex-wrap: wrap; gap: 10px; }
    .chip { display: inline-flex; padding: 8px 11px; border: 1px solid var(--line); border-radius: 999px; color: #334155; background: #fff; font-size: 14px; }
    .info-row { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--line); }
    .muted { color: var(--muted); }
    #venue-map { height: 380px; border-radius: 8px; border: 1px solid var(--line); overflow: hidden; }
    .similar-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
    .similar-card { display: flex; flex-direction: column; gap: 7px; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; background: #fff; }
    .similar-card img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; background: #f1f5f9; }
    .similar-card strong, .similar-card span, .similar-card small { padding: 0 12px; }
    .similar-card small { padding-bottom: 12px; color: var(--brand); font-weight: 700; }
    @media (max-width: 900px) {
      .nav { display: none; }
      .gallery { grid-template-columns: 1fr 1fr; }
      .venue-photo-0 { grid-column: 1 / -1; grid-row: auto; min-height: 280px; border-radius: 8px 8px 0 0; }
      .layout { grid-template-columns: 1fr; }
      .side { position: static; }
      .similar-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .info-row { grid-template-columns: 1fr; }
    }
    @media (max-width: 560px) {
      .stats, .similar-grid { grid-template-columns: 1fr; }
      .gallery { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; }
      .venue-photo { min-width: 82vw; min-height: 280px; border-radius: 8px; scroll-snap-align: start; }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <a class="brand" href="/"><img src="/brand/viraaya-logo-header.png" alt="Viraaya Weddings" /> <span>Viraaya Weddings</span></a>
    <nav class="nav"><a href="/wedding-venues">Venues</a><a href="/wedding-photography">Photography</a><a href="/wedding-decorators">Decorators</a><a href="/contact-us">Contact</a></nav>
  </header>
  <main>
    <section class="hero">
      <div class="breadcrumbs"><a href="/">Home</a> / <a href="/wedding-venues">Wedding Venues</a> / <a href="/wedding-venues/${html(row.citySlug)}">${html(cityName)}</a></div>
      <h1>${html(row.name)}</h1>
      <div class="sub">
        <span>${html(row.shortAddress || row.formattedAddress || cityName)}</span>
        <span>${html(row.userRating ? `${row.userRating} rating` : "Rating on request")}</span>
        <span>${html(money(row.minPerPlateCost, row.maxPerPlateCost))} per plate</span>
      </div>
      <div class="gallery">${gallery(images)}</div>
    </section>
    <section class="layout">
      <div>
        <section class="section panel">
          <h2>Venue Details</h2>
          <div class="stats">
            <div class="stat"><small>Per plate</small><strong>${html(money(row.minPerPlateCost, row.maxPerPlateCost))}</strong></div>
            <div class="stat"><small>Per day</small><strong>${html(money(row.minPerDayCost, row.maxPerDayCost))}</strong></div>
            <div class="stat"><small>Guest capacity</small><strong>${html(range(row.minAreaCapacity, row.maxAreaCapacity))}</strong></div>
            <div class="stat"><small>Rooms</small><strong>${html(range(row.minRoomCount, row.maxRoomCount))}</strong></div>
          </div>
        </section>
        <section class="section">
          <h2>About ${html(row.name)}</h2>
          <p class="text">${html(about || `${row.name} is a wedding venue in ${cityName}. Contact Viraaya Weddings for pricing, availability, photos and planning support.`)}</p>
        </section>
        <section class="section">
          <h2>Spaces and Capacity</h2>
          ${areaRows(row.areas || [])}
        </section>
        <section class="section">
          <h2>Amenities</h2>
          <div class="chips">${chips(row.amenities || []) || '<p class="muted">Amenities available on request.</p>'}</div>
        </section>
        <section class="section">
          <h2>Facilities</h2>
          <div class="chips">${chips(row.facilities || []) || '<p class="muted">Facilities available on request.</p>'}</div>
        </section>
        <section class="section">
          <h2>Explore Nearby Venues</h2>
          <div id="venue-map"></div>
        </section>
        <section class="section">
          <h2>Similar Venues</h2>
          <div class="similar-grid">${similarCards(similarRows)}</div>
        </section>
      </div>
      <aside class="side panel">
        <h2>Check Availability</h2>
        <p class="muted">Share your wedding date and guest count. Viraaya Weddings will help you compare this venue with suitable options.</p>
        <a class="cta" href="/contact-us">Contact Viraaya Weddings</a>
      </aside>
    </section>
  </main>
  ${getHomepageFooter()}
  <script src="/twc-mirror/vendor/leaflet/leaflet.js"></script>
  <script>
    (() => {
      const markers = ${json(markers)};
      const initial = ${json(initial)};
      const map = L.map("venue-map", { scrollWheelZoom: false }).setView([initial.lat, initial.lng], 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap contributors", maxZoom: 19 }).addTo(map);
      const bounds = [];
      for (const marker of markers) {
        const ll = [marker.lat, marker.lng];
        bounds.push(ll);
        L.marker(ll).addTo(map).bindPopup('<a href="' + marker.href + '"><strong>' + marker.name + '</strong></a>');
      }
      if (bounds.length > 1) map.fitBounds(bounds, { padding: [36, 36], maxZoom: 13 });
      setTimeout(() => map.invalidateSize(), 200);
    })();
  </script>
</body>
</html>`;
}

async function getMirrorHtmlUncached(citySlug: string, slug: string): Promise<string | null> {
  const row = await findVenue(citySlug, slug);
  if (!row) return null;

  const similarRows = await prisma.venue.findMany({
    where: { citySlug: row.citySlug, NOT: { vendorId: row.vendorId } },
    select: SIMILAR_SELECT,
    orderBy: [{ isBhPartner: "desc" }, { userRating: "desc" }, { listingOrder: "asc" }],
    take: 8
  });

  return pageHtml(row, similarRows);
}

const getMirrorHtmlCached = unstable_cache(getMirrorHtmlUncached, ["venue-mirror-html"], {
  revalidate: 3600,
  tags: ["venues"]
});

export async function getMirrorHtml(citySlug: string, slug: string): Promise<string | null> {
  return getMirrorHtmlCached(citySlug, slug);
}

function injectAssetPrefix(html: string): string {
  return html;
}

export { injectAssetPrefix };

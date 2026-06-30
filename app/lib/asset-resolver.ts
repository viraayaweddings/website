import path from "node:path";
import { publicFileExists } from "./safe-public-path";

// Maps a /venue-assets/<source>/ public prefix to the on-disk vendor directory.
// Mirrors the mapping used by the venue-assets route handler.
const SOURCE_DIRS: Record<string, string> = {
  gcpimages: "gcpimages.theweddingcompany.com",
  imageswedding: "imageswedding.theweddingcompany.com",
  weddingimage: "weddingimage.betterhalf.ai",
  storage: "storage.googleapis.com",
  maps: "maps.gstatic.com",
  webflowcdn: "cdn.prod.website-files.com",
  webflowassets: "assets-global.website-files.com"
};

// Vendored assets live under one of these public/ roots. Some sources were
// vendored into twc-company-assets and others into twc-venues-local, so an
// existence check must consider BOTH (the route handler already does). Checking
// a single root caused real images to be wrongly treated as missing and
// replaced with fallbacks.
const ASSET_ROOTS = ["twc-company-assets", "twc-venues-local"];

// True if the local file backing a public image path exists under any vendored
// asset root. Path-traversal-safe (publicFileExists contains to public/).
export function localPublicImageExists(publicPath: string): boolean {
  if (typeof publicPath !== "string" || !publicPath.startsWith("/")) return false;

  const venueAsset = publicPath.match(/^\/venue-assets\/([^/]+)\/(.+)$/);
  if (venueAsset) {
    const dir = SOURCE_DIRS[venueAsset[1]];
    if (!dir) return false;
    const rest = venueAsset[2].split("/");
    return ASSET_ROOTS.some((root) =>
      publicFileExists(path.join(process.cwd(), "public", root, dir, ...rest))
    );
  }

  // Any other absolute public path (e.g. /twc-photographers/cards/..., /twc-assets/...).
  return publicFileExists(path.join(process.cwd(), "public", ...publicPath.slice(1).split("/")));
}

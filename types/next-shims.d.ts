/**
 * Type declarations for the Next.js modules this project imports.
 *
 * `next` itself is not installed — vinext supplies the runtime via its own
 * shims and rewrites the imports during the build. These are ambient
 * declarations rather than tsconfig `paths` on purpose: vite honours `paths`
 * for real resolution, and a `next/*` wildcard there breaks the build by
 * misdirecting imports such as `next/font/google`.
 */

declare module "next" {
  export type { Metadata, Viewport } from "vinext/shims/metadata";
}

declare module "next/headers" {
  export { cookies, headers, draftMode } from "vinext/shims/headers";
}

declare module "next/navigation" {
  export {
    redirect,
    permanentRedirect,
    notFound,
    forbidden,
    unauthorized,
    // Client-only hooks, used by the admin panel's navigation rail and palette.
    usePathname,
    useRouter,
    useSearchParams,
    useParams,
  } from "vinext/shims/navigation";
}

declare module "next/link" {
  export { default } from "vinext/shims/link";
}

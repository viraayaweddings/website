/**
 * The panel's icon set.
 *
 * Drawn inline rather than pulled from a package: the worker bundle stays small,
 * the CSP has no external host to allow, and every glyph inherits currentColor
 * so it themes for free.
 */

const PATHS = {
  dashboard: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z",
  inbox: "M4 13h4l1.5 3h5L16 13h4M4 13 6 5h12l2 8v6H4v-6Z",
  venue: "M3 21h18M5 21V8l7-5 7 5v13M10 21v-5h4v5M9 11h.01M15 11h.01",
  city: "M3 21h18M5 21V7l5-3v17M14 21V11h5v10M8 9h.01M8 13h.01M8 17h.01M17 15h.01",
  article: "M6 3h9l5 5v13H6zM15 3v5h5M9 12h8M9 16h8M9 8h3",
  slides: "M3 5h18v11H3zM8 20h8M12 16v4",
  image: "M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6M8.5 9.5h.01",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-3a8 8 0 0 0-.14-1.47l2.03-1.58-2-3.46-2.4.97a8 8 0 0 0-2.54-1.47L14.6 2h-4l-.35 2.99a8 8 0 0 0-2.54 1.47l-2.4-.97-2 3.46 2.03 1.58a8.1 8.1 0 0 0 0 2.94l-2.03 1.58 2 3.46 2.4-.97a8 8 0 0 0 2.54 1.47L10.6 22h4l.35-2.99a8 8 0 0 0 2.54-1.47l2.4.97 2-3.46-2.03-1.58c.09-.48.14-.97.14-1.47Z",
  type: "M4 7V4h16v3M9 20h6M12 4v16",
  users: "M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 2.13a4 4 0 0 1 0 7.75",
  activity: "M12 8v4l3 2M3 12a9 9 0 1 0 9-9 9 9 0 0 0-7.5 4M3 4v4h4",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35",
  plus: "M12 5v14M5 12h14",
  chevronRight: "m9 6 6 6-6 6",
  chevronLeft: "m15 6-6 6 6 6",
  chevronDown: "m6 9 6 6 6-6",
  chevronUp: "m18 15-6-6-6 6",
  arrowUp: "M12 19V5M5 12l7-7 7 7",
  arrowDown: "M12 5v14M19 12l-7 7-7-7",
  external: "M18 13v6H5V6h6M14 4h6v6M10 14 20 4",
  edit: "M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6",
  check: "m4 12 5 5L20 6",
  close: "M18 6 6 18M6 6l12 12",
  menu: "M3 6h18M3 12h18M3 18h18",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1",
  moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  copy: "M9 9h10v12H9zM5 15H3V3h12v2",
  download: "M12 3v12M7 10l5 5 5-5M3 21h18",
  filter: "M3 5h18l-7 8v6l-4 2v-8Z",
  mail: "M3 5h18v14H3zM3 6l9 7 9-7",
  phone: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Zm11 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  eyeOff: "M17.9 17.9A10.7 10.7 0 0 1 12 20C5 20 1 12 1 12a19.6 19.6 0 0 1 5.1-6M9.9 4.2A10.9 10.9 0 0 1 12 4c7 0 11 8 11 8a19.5 19.5 0 0 1-2.2 3.2M1 1l22 22M9.9 9.9a3 3 0 0 0 4.2 4.2",
  upload: "M12 21V9M7 14l5-5 5 5M3 3h18",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  warning: "M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  info: "M12 16v-4m0-4h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  sparkle: "m12 3 2.1 5.6L20 10.5l-5.9 2L12 18l-2.1-5.6L4 10.5l5.9-1.9L12 3Z",
  command: "M6 3a3 3 0 1 1 0 6h12a3 3 0 1 1 0-6v12a3 3 0 1 1 0 6H6a3 3 0 1 1 0-6Z",
  refresh: "M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6",
  link: "M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1",
  bed: "M3 18v-6h18v6M3 12V7M21 12V9a2 2 0 0 0-2-2h-6v5M7 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 16,
  className = "",
  strokeWidth = 1.7,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/**
 * The brand mark: the arch from the Viraaya lockup.
 *
 * This used to draw a gradient tile with the letter V in it, which needed no
 * image request -- a fair trade while the panel had no real mark to show. It
 * has one now, and a panel branded differently from the site it edits is its
 * own small confusion, so this is the arch itself.
 *
 * The 180px asset rather than the 512px one behind the favicon: the largest
 * this renders is 48, and 24KB against 133KB matters more than resolution
 * nobody sees. Content-addressed under /media, so it is cached immutably and
 * `img-src 'self'` in the admin CSP already covers it.
 *
 * On a light tile rather than the accent gradient, because the arch is gold
 * line-art -- gold on the gold accent had nothing to separate the two. The tile
 * keeps the mark legible on the dark side rail as well as the light login page,
 * and keeps the block of brand presence the gradient gave it.
 */
const MARK_SRC = "/media/30b5ec718ce0ba4ab576817437ab788a89ff7a53f722b2882c6ff3ee82d19a66.png";

export function Monogram({ size = 32, prominent }: { size?: number; prominent?: boolean }) {
  return (
    <span
      className="grid flex-none place-items-center overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: prominent ? size * 0.32 : 8,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        boxShadow: prominent ? "var(--shadow-2)" : undefined,
      }}
      aria-hidden="true"
    >
      {/* Plain img: this comes from R2, not the asset pipeline. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={MARK_SRC}
        alt=""
        width={Math.round(size * 0.78)}
        height={Math.round(size * 0.78)}
        style={{ display: "block", objectFit: "contain" }}
        decoding="async"
      />
    </span>
  );
}

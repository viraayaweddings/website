/**
 * Identifies an image by its actual bytes rather than the type the browser
 * reported.
 *
 * A `Content-Type` on an upload is just a claim: anything can be labelled
 * `image/png`. Checking the signature means a file that is not really an image
 * is refused before it is ever stored or served.
 */
export interface ImageKind {
  mime: string;
  extension: string;
}

/** Formats a browser can render, and that carry no scripting. SVG is excluded. */
const SIGNATURES: { kind: ImageKind; matches: (bytes: Uint8Array) => boolean }[] = [
  {
    kind: { mime: "image/jpeg", extension: "jpg" },
    matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    kind: { mime: "image/png", extension: "png" },
    matches: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {
    kind: { mime: "image/webp", extension: "webp" },
    matches: (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP",
  },
  {
    kind: { mime: "image/avif", extension: "avif" },
    // ISO-BMFF: a box length, then "ftyp", then the brand.
    matches: (b) => ascii(b, 4, 4) === "ftyp" && ["avif", "avis"].includes(ascii(b, 8, 4)),
  },
];

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  let out = "";
  for (let index = offset; index < offset + length; index += 1) {
    out += String.fromCharCode(bytes[index] ?? 0);
  }
  return out;
}

/** Returns the real image type, or null when the bytes are not a known image. */
export function sniffImageType(bytes: Uint8Array): ImageKind | null {
  if (bytes.length < 12) return null;
  return SIGNATURES.find((signature) => signature.matches(bytes))?.kind ?? null;
}

export const ACCEPTED_IMAGE_TYPES = SIGNATURES.map((signature) => signature.kind.mime);

/** Content-addressed key: identical bytes always produce the same object. */
export async function contentKey(bytes: Uint8Array, extension: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex}.${extension}`;
}

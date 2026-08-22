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

export interface ImageDimensions {
  width: number;
  height: number;
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

function uint16be(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);
}

function uint16le(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8);
}

function uint24le(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8) | ((bytes[offset + 2] ?? 0) << 16);
}

function uint32be(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) * 0x1000000) +
    ((bytes[offset + 1] ?? 0) << 16) +
    ((bytes[offset + 2] ?? 0) << 8) +
    (bytes[offset + 3] ?? 0)
  );
}

function uint32le(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] ?? 0) +
    ((bytes[offset + 1] ?? 0) << 8) +
    ((bytes[offset + 2] ?? 0) << 16) +
    ((bytes[offset + 3] ?? 0) * 0x1000000)
  );
}

function dimensions(width: number, height: number): ImageDimensions | null {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width <= 0 || height <= 0) return null;
  return { width: Math.floor(width), height: Math.floor(height) };
}

function pngDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 24) return null;
  return dimensions(uint32be(bytes, 16), uint32be(bytes, 20));
}

function jpegDimensions(bytes: Uint8Array): ImageDimensions | null {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1] ?? 0;
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (marker >= 0xd0 && marker <= 0xd7) continue;
    if (offset + 2 > bytes.length) return null;

    const segmentLength = uint16be(bytes, offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;

    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      return dimensions(uint16be(bytes, offset + 5), uint16be(bytes, offset + 3));
    }

    offset += segmentLength;
  }
  return null;
}

function webpDimensions(bytes: Uint8Array): ImageDimensions | null {
  const chunk = ascii(bytes, 12, 4);
  if (chunk === "VP8X" && bytes.length >= 30) {
    return dimensions(uint24le(bytes, 24) + 1, uint24le(bytes, 27) + 1);
  }
  if (chunk === "VP8 " && bytes.length >= 30) {
    return dimensions(uint16le(bytes, 26) & 0x3fff, uint16le(bytes, 28) & 0x3fff);
  }
  if (chunk === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
    const bits = uint32le(bytes, 21);
    return dimensions((bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1);
  }
  return null;
}

function avifDimensions(bytes: Uint8Array): ImageDimensions | null {
  for (let offset = 4; offset + 16 <= bytes.length; offset += 1) {
    if (ascii(bytes, offset, 4) === "ispe") {
      return dimensions(uint32be(bytes, offset + 8), uint32be(bytes, offset + 12));
    }
  }
  return null;
}

/** Returns the real image type, or null when the bytes are not a known image. */
export function sniffImageType(bytes: Uint8Array): ImageKind | null {
  if (bytes.length < 12) return null;
  return SIGNATURES.find((signature) => signature.matches(bytes))?.kind ?? null;
}

export function imageDimensions(bytes: Uint8Array, mime: string): ImageDimensions | null {
  if (mime === "image/png") return pngDimensions(bytes);
  if (mime === "image/jpeg") return jpegDimensions(bytes);
  if (mime === "image/webp") return webpDimensions(bytes);
  if (mime === "image/avif") return avifDimensions(bytes);
  return null;
}

export const ACCEPTED_IMAGE_TYPES = SIGNATURES.map((signature) => signature.kind.mime);

/** Content-addressed key: identical bytes always produce the same object. */
export async function contentKey(bytes: Uint8Array, extension: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex}.${extension}`;
}

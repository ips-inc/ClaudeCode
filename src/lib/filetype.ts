/**
 * Server-side file-type detection by magic bytes. We never trust the
 * client-declared Content-Type for a security decision — we sniff the leading
 * bytes of the object and derive the real type. Used to (a) reject a small
 * denylist of dangerous types and (b) decide download disposition.
 *
 * This is intentionally allow-all (it's the owner's own archive of arbitrary
 * creative files) EXCEPT for active/executable web types that could be abused
 * if ever served inline from the media origin.
 */

export interface SniffResult {
  mime: string;
  category: "image" | "video" | "audio" | "document" | "archive" | "other";
  /** Must be served as an attachment, never inline, if it ever hits the app origin. */
  forceDownload: boolean;
}

const MAGIC: { bytes: (number | null)[]; offset?: number; mime: string; category: SniffResult["category"] }[] = [
  // Images
  { bytes: [0xff, 0xd8, 0xff], mime: "image/jpeg", category: "image" },
  { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], mime: "image/png", category: "image" },
  { bytes: [0x47, 0x49, 0x46, 0x38], mime: "image/gif", category: "image" },
  { bytes: [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50], mime: "image/webp", category: "image" },
  { bytes: [0x49, 0x49, 0x2a, 0x00], mime: "image/tiff", category: "image" }, // little-endian TIFF (also many RAW)
  { bytes: [0x4d, 0x4d, 0x00, 0x2a], mime: "image/tiff", category: "image" }, // big-endian TIFF
  // Video (ISO-BMFF: ....ftyp at offset 4)
  { bytes: [0x66, 0x74, 0x79, 0x70], offset: 4, mime: "video/mp4", category: "video" },
  { bytes: [0x1a, 0x45, 0xdf, 0xa3], mime: "video/webm", category: "video" }, // Matroska/WebM
  { bytes: [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x41, 0x56, 0x49, 0x20], mime: "video/x-msvideo", category: "video" },
  // Audio
  { bytes: [0x49, 0x44, 0x33], mime: "audio/mpeg", category: "audio" }, // ID3 (mp3)
  { bytes: [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x41, 0x56, 0x45], mime: "audio/wav", category: "audio" },
  { bytes: [0x66, 0x4c, 0x61, 0x43], mime: "audio/flac", category: "audio" },
  // Documents / archives
  { bytes: [0x25, 0x50, 0x44, 0x46], mime: "application/pdf", category: "document" },
  { bytes: [0x50, 0x4b, 0x03, 0x04], mime: "application/zip", category: "archive" }, // zip (also docx/xlsx/many)
  { bytes: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07], mime: "application/x-rar-compressed", category: "archive" },
];

// Active web types that must never be served inline from the media origin.
const DANGEROUS_INLINE = new Set([
  "text/html",
  "application/xhtml+xml",
  "image/svg+xml",
  "application/javascript",
  "text/javascript",
]);

function matches(head: Uint8Array, sig: (number | null)[], offset = 0): boolean {
  if (head.length < offset + sig.length) return false;
  for (let i = 0; i < sig.length; i++) {
    if (sig[i] !== null && head[offset + i] !== sig[i]) return false;
  }
  return true;
}

/** Sniff the leading bytes (pass at least the first 16). */
export function sniff(head: Uint8Array, declaredMime?: string): SniffResult {
  for (const m of MAGIC) {
    if (matches(head, m.bytes, m.offset ?? 0)) {
      return {
        mime: m.mime,
        category: m.category,
        forceDownload: m.category === "archive" || m.category === "other",
      };
    }
  }
  // Unknown binary: allowed (arbitrary creative/camera formats), but never inline.
  const declared = (declaredMime || "").toLowerCase();
  return {
    mime: declared && !DANGEROUS_INLINE.has(declared) ? declared : "application/octet-stream",
    category: "other",
    forceDownload: true,
  };
}

/** True if a declared type must be neutralized (served as attachment) even if sniff is inconclusive. */
export function isDangerousInline(mime: string): boolean {
  return DANGEROUS_INLINE.has((mime || "").toLowerCase());
}

// Image types a browser renders directly — for these we can show the original
// as a grid thumbnail without waiting on the worker to make a small rendition.
// (TIFF/RAW/PSD are excluded: browsers can't paint them, so they need the worker.)
const BROWSER_IMAGE = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

export function isBrowserImage(mime: string): boolean {
  return BROWSER_IMAGE.has((mime || "").toLowerCase());
}

/** Content-Disposition value for serving an asset. */
export function disposition(filename: string, forceDownload: boolean): string {
  const safe = filename.replace(/["\\\r\n]/g, "_");
  const kind = forceDownload ? "attachment" : "inline";
  return `${kind}; filename="${safe}"`;
}

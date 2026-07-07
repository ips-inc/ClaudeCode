import { customAlphabet } from "nanoid";

// Unambiguous lowercase alphanumerics for URLs.
const alphabet = "23456789abcdefghjkmnpqrstuvwxyz";

/** Unguessable share-link slug (~66 bits of entropy). */
export const shareSlug = customAlphabet(alphabet, 14);

const shortId = customAlphabet(alphabet, 5);

/** Human-readable project slug: "smith-wedding-x7k2m". */
export function projectSlug(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
  return `${base || "project"}-${shortId()}`;
}

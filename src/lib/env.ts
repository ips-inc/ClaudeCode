/**
 * Read an env var and strip anything that can't legally sit in an HTTP header —
 * invisible characters (zero-width spaces, BOMs), smart quotes, and surrounding
 * whitespace/newlines. Pasting keys into dashboards frequently introduces these,
 * and the browser's fetch() rejects any header value with a code point > 255
 * ("String contains non ISO-8859-1 code point"). Supabase keys and URLs are pure
 * ASCII, so removing non-printable-ASCII is always safe.
 */
export function cleanEnv(value: string | undefined | null): string {
  return (value ?? "").replace(/[^\x20-\x7E]/g, "").trim();
}

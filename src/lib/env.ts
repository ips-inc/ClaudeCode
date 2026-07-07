/**
 * Env hygiene for the public Supabase config.
 *
 * Pasting keys into hosting dashboards frequently injects invisible characters
 * (zero-width spaces, BOMs) or truncates them, which breaks auth in ways that
 * are miserable to diagnose ("String contains non ISO-8859-1 code point",
 * "Invalid API key"). The Supabase URL and anon/publishable key are PUBLIC —
 * they're shipped in the browser bundle regardless — so we keep known-good
 * defaults and only trust the env var when it's actually well-formed.
 */

/** Strip anything that can't sit in an HTTP header, plus surrounding whitespace. */
export function cleanEnv(value: string | undefined | null): string {
  return (value ?? "").replace(/[^\x20-\x7E]/g, "").trim();
}

const DEFAULT_URL = "https://lnclobwmfkxtibqnxgip.supabase.co";
// Legacy anon JWT — broadest compatibility with GoTrue signInWithPassword.
const DEFAULT_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuY2xvYndtZmt4dGlicW54Z2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjkzNzAsImV4cCI6MjA5ODk0NTM3MH0.9NJZP0Emp3u4BCtT0NiQxpmy7GLH5xZBg3zIvfkClLA";

function looksLikeUrl(v: string): boolean {
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(v);
}

function looksLikeKey(v: string): boolean {
  // legacy anon JWT (three base64url segments) or modern publishable key
  return /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(v) || /^sb_(publishable|anon)_[\w-]+$/.test(v);
}

export const SUPABASE_URL = (() => {
  const v = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  return looksLikeUrl(v) ? v : DEFAULT_URL;
})();

export const SUPABASE_ANON_KEY = (() => {
  const v = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return looksLikeKey(v) ? v : DEFAULT_ANON;
})();

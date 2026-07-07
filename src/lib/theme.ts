export type ThemePref = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_KEY = "ips-theme";

/**
 * Inlined into <head> before paint so the page never flashes the wrong theme.
 * Reads the saved preference (or "system"), resolves it to a concrete
 * light/dark, and stamps data-theme on <html>. Kept as a hand-minified string
 * because it must run before React hydrates.
 */
export const NO_FLASH_SCRIPT = `(function(){try{var k='${THEME_KEY}';var p=localStorage.getItem(k)||'system';var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=p==='system'?(m?'dark':'light'):p;document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export function resolveTheme(pref: ThemePref): ResolvedTheme {
  if (pref === "system") {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return pref;
}

export function applyTheme(pref: ThemePref) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", resolveTheme(pref));
}

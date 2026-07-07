"use client";

import { useEffect, useState } from "react";
import { THEME_KEY, applyTheme, type ThemePref } from "@/lib/theme";

const ORDER: ThemePref[] = ["system", "light", "dark"];

const ICON: Record<ThemePref, string> = {
  system: "◐",
  light: "☀",
  dark: "☾",
};

const LABEL: Record<ThemePref, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

/**
 * Cycles system → light → dark. "System" tracks the OS setting live. The
 * concrete data-theme is applied by the no-flash script on first paint; this
 * just keeps it in sync after hydration and on preference change.
 */
export function ThemeToggle() {
  const [pref, setPref] = useState<ThemePref>("system");

  useEffect(() => {
    const saved = (localStorage.getItem(THEME_KEY) as ThemePref | null) ?? "system";
    setPref(saved);
  }, []);

  // When following the system, re-resolve as the OS theme flips.
  useEffect(() => {
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];
    setPref(next);
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  }

  return (
    <button
      onClick={cycle}
      className="chip !h-8 gap-1.5 !px-2.5 hover:[border-color:var(--color-line)]"
      title={`Theme: ${LABEL[pref]} — click to change`}
      aria-label={`Theme: ${LABEL[pref]}`}
    >
      <span className="text-[13px] leading-none">{ICON[pref]}</span>
      <span className="hidden sm:inline">{LABEL[pref]}</span>
    </button>
  );
}

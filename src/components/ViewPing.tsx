"use client";

import { useEffect } from "react";

/** Counts one view per browser session per share link. */
export function ViewPing({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `ps_viewed_${slug}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    fetch(`/api/share/${slug}/view`, { method: "POST" }).catch(() => {});
  }, [slug]);
  return null;
}

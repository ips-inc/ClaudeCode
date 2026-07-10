"use client";

import { useState, useEffect } from "react";
import { isBrowserImage } from "@/lib/filetype";

interface ShareAsset {
  id: string;
  filename: string;
  mime: string;
  size_bytes: number;
  thumbKind: string | null;
}

function fmt(n: number) {
  if (!n) return "";
  const u = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`;
}

/**
 * Public delivery view. Thumbnails and downloads go through the share file
 * route, which re-validates the link (revoke/expiry/cap) on every hit.
 */
export function ShareView({
  slug,
  assets,
  allowDownloads,
  crumbs = [],
  subfolders = [],
}: {
  slug: string;
  assets: ShareAsset[];
  allowDownloads: boolean;
  crumbs?: { id: string; name: string }[];
  subfolders?: { id: string; name: string }[];
}) {
  const [lightbox, setLightbox] = useState<ShareAsset | null>(null);
  const hasFolders = crumbs.length > 0 || subfolders.length > 0;

  // Esc closes the lightbox — the reflex every viewer expects.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setLightbox(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const fileUrl = (a: ShareAsset, opts: string) => `/api/share/${slug}/file/${a.id}${opts}`;
  const folderHref = (id?: string) => (id ? `/s/${slug}?folder=${id}` : `/s/${slug}`);

  return (
    <>
      {hasFolders && (
        <nav className="mb-5 flex flex-wrap items-center gap-1 text-[13px]">
          <a href={folderHref()} className="[color:var(--color-dim)] hover:[color:var(--color-ink)]">Home</a>
          {crumbs.map((c) => (
            <span key={c.id}>
              <span className="[color:var(--color-faint)]"> / </span>
              <a href={folderHref(c.id)} className="[color:var(--color-dim)] hover:[color:var(--color-ink)]">{c.name}</a>
            </span>
          ))}
        </nav>
      )}

      {subfolders.length > 0 && (
        <ul className="mb-5 flex flex-wrap gap-2">
          {subfolders.map((f) => (
            <li key={f.id}>
              <a href={folderHref(f.id)} className="card lift inline-block px-3.5 py-2.5 text-[13px]">📁 {f.name}</a>
            </li>
          ))}
        </ul>
      )}

      {assets.length === 0 && !hasFolders ? (
        <p className="text-center text-[14px] [color:var(--color-mute)]">Files are being prepared.</p>
      ) : assets.length === 0 ? (
        <p className="text-[13px] [color:var(--color-mute)]">This folder is empty.</p>
      ) : (
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {assets.map((a) => (
          <li key={a.id} className="card lift group overflow-hidden">
            <button
              onClick={() => (a.mime.startsWith("image/") || a.mime.startsWith("video/")) && setLightbox(a)}
              className="relative flex aspect-square w-full items-center justify-center bg-[color:var(--color-surface-2)]"
            >
              {a.thumbKind ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fileUrl(a, `?r=${a.thumbKind}`)} alt={a.filename} className="h-full w-full object-cover" />
              ) : isBrowserImage(a.mime) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fileUrl(a, "")} alt={a.filename} loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <span className="kicker px-2 text-center">{a.mime.split("/")[1] ?? "file"}</span>
              )}
              {a.mime.startsWith("video/") && (
                <span className="absolute inset-0 flex items-center justify-center"><span className="rounded-full bg-black/45 px-3.5 py-2 text-white backdrop-blur">▶</span></span>
              )}
            </button>
            <div className="flex items-center justify-between gap-2 p-2.5">
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-medium" title={a.filename}>{a.filename}</p>
                <p className="mono text-[10.5px] [color:var(--color-mute)]">{fmt(a.size_bytes)}</p>
              </div>
              {allowDownloads && (
                <a href={fileUrl(a, "?dl=1")} aria-label={`Download ${a.filename}`} title="Download" className="btn btn-ghost btn-xs shrink-0">↓</a>
              )}
            </div>
          </li>
        ))}
      </ul>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4" onClick={() => setLightbox(null)}>
          <div className="flex items-center justify-between text-white">
            <span className="text-sm">{lightbox.filename}</span>
            <div className="flex items-center gap-3">
              {allowDownloads && (
                <a href={fileUrl(lightbox, "?dl=1")} onClick={(e) => e.stopPropagation()} className="rounded border border-white/40 px-3 py-1 text-xs hover:bg-white hover:text-black">Download</a>
              )}
              <button onClick={() => setLightbox(null)} aria-label="Close preview" className="text-2xl leading-none">×</button>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {lightbox.mime.startsWith("video/") ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={fileUrl(lightbox, "?r=proxy")} controls autoPlay className="max-h-full max-w-full" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fileUrl(lightbox, "")} alt={lightbox.filename} className="max-h-full max-w-full object-contain" />
            )}
          </div>
        </div>
      )}
    </>
  );
}

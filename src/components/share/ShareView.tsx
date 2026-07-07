"use client";

import { useState } from "react";

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
}: {
  slug: string;
  assets: ShareAsset[];
  allowDownloads: boolean;
}) {
  const [lightbox, setLightbox] = useState<ShareAsset | null>(null);
  if (!assets.length) return <p className="text-center text-sm text-neutral-400">Files are being prepared.</p>;

  const fileUrl = (a: ShareAsset, opts: string) => `/api/share/${slug}/file/${a.id}${opts}`;

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {assets.map((a) => (
          <li key={a.id} className="overflow-hidden rounded-lg border">
            <button
              onClick={() => (a.mime.startsWith("image/") || a.mime.startsWith("video/")) && setLightbox(a)}
              className="relative flex aspect-square w-full items-center justify-center bg-neutral-100"
            >
              {a.thumbKind ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fileUrl(a, `?r=${a.thumbKind}`)} alt={a.filename} className="h-full w-full object-cover" />
              ) : (
                <span className="px-2 text-[11px] uppercase tracking-wider text-neutral-400">{a.mime.split("/")[1] ?? "file"}</span>
              )}
              {a.mime.startsWith("video/") && (
                <span className="absolute inset-0 flex items-center justify-center"><span className="rounded-full bg-black/50 px-3 py-1.5 text-white">▶</span></span>
              )}
            </button>
            <div className="flex items-center justify-between gap-2 p-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium" title={a.filename}>{a.filename}</p>
                <p className="text-[11px] text-neutral-400">{fmt(a.size_bytes)}</p>
              </div>
              {allowDownloads && (
                <a href={fileUrl(a, "?dl=1")} className="shrink-0 rounded border px-2 py-1 text-[11px] hover:bg-neutral-900 hover:text-white">↓</a>
              )}
            </div>
          </li>
        ))}
      </ul>

      {lightbox && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4" onClick={() => setLightbox(null)}>
          <div className="flex items-center justify-between text-white">
            <span className="text-sm">{lightbox.filename}</span>
            <div className="flex items-center gap-3">
              {allowDownloads && (
                <a href={fileUrl(lightbox, "?dl=1")} onClick={(e) => e.stopPropagation()} className="rounded border border-white/40 px-3 py-1 text-xs hover:bg-white hover:text-black">Download</a>
              )}
              <button onClick={() => setLightbox(null)} className="text-2xl leading-none">×</button>
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

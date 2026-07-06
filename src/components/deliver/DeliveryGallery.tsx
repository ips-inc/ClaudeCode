"use client";

import { useState } from "react";

interface DeliveryAsset {
  id: string;
  filename: string;
  mime: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  duration_s: number | null;
  thumbKind: string | null;
}

function formatBytes(n: number): string {
  if (!n) return "—";
  const u = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`;
}

/**
 * Gallery-style delivery view. Thumbnails and downloads both go through
 * /api/media, which re-checks authorization per request and audits every
 * download — so the access log is populated by real client activity.
 */
export function DeliveryGallery({ assets }: { assets: DeliveryAsset[] }) {
  const [lightbox, setLightbox] = useState<DeliveryAsset | null>(null);

  if (!assets.length) {
    return (
      <p className="rounded-lg border border-dashed p-10 text-center text-sm text-neutral-400">
        Files are being prepared. Check back shortly.
      </p>
    );
  }

  const isImage = (m: string) => m.startsWith("image/");
  const isVideo = (m: string) => m.startsWith("video/");

  return (
    <>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {assets.map((a) => (
          <li key={a.id} className="group overflow-hidden rounded-lg border">
            <button
              onClick={() => (isImage(a.mime) || isVideo(a.mime)) && setLightbox(a)}
              className="relative flex aspect-square w-full items-center justify-center bg-neutral-100"
            >
              {a.thumbKind ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/media/${a.id}?r=${a.thumbKind}`}
                  alt={a.filename}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="px-2 text-center text-[11px] uppercase tracking-wider text-neutral-400">
                  {a.mime.split("/")[1] ?? "file"}
                </span>
              )}
              {isVideo(a.mime) && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="rounded-full bg-black/50 px-3 py-1.5 text-white">▶</span>
                </span>
              )}
            </button>
            <div className="flex items-center justify-between gap-2 p-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium" title={a.filename}>
                  {a.filename}
                </p>
                <p className="text-[11px] text-neutral-400">{formatBytes(a.size_bytes)}</p>
              </div>
              <a
                href={`/api/media/${a.id}?dl=1`}
                className="shrink-0 rounded border px-2 py-1 text-[11px] hover:bg-neutral-900 hover:text-white"
                title="Download original"
              >
                ↓
              </a>
            </div>
          </li>
        ))}
      </ul>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="flex items-center justify-between text-white">
            <span className="text-sm">{lightbox.filename}</span>
            <div className="flex items-center gap-3">
              <a
                href={`/api/media/${lightbox.id}?dl=1`}
                onClick={(e) => e.stopPropagation()}
                className="rounded border border-white/40 px-3 py-1 text-xs hover:bg-white hover:text-black"
              >
                Download
              </a>
              <button onClick={() => setLightbox(null)} className="text-2xl leading-none">
                ×
              </button>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {lightbox.mime.startsWith("video/") ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={`/api/media/${lightbox.id}?r=proxy`} controls autoPlay className="max-h-full max-w-full" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/media/${lightbox.id}`} alt={lightbox.filename} className="max-h-full max-w-full object-contain" />
            )}
          </div>
        </div>
      )}
    </>
  );
}

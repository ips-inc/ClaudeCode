"use client";

import { useState, useEffect } from "react";
import { isBrowserImage } from "@/lib/filetype";

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

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setLightbox(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  if (!assets.length) {
    return (
      <p className="rounded-[var(--radius-lg)] border border-dashed hairline p-12 text-center text-[14px] [color:var(--color-mute)]">
        Files are being prepared. Check back shortly.
      </p>
    );
  }

  const isImage = (m: string) => m.startsWith("image/");
  const isVideo = (m: string) => m.startsWith("video/");

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {assets.map((a) => (
          <li key={a.id} className="card lift group overflow-hidden">
            <button
              onClick={() => (isImage(a.mime) || isVideo(a.mime)) && setLightbox(a)}
              className="relative flex aspect-square w-full items-center justify-center bg-[color:var(--color-surface-2)]"
            >
              {a.thumbKind ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/media/${a.id}?r=${a.thumbKind}`}
                  alt={a.filename}
                  className="h-full w-full object-cover"
                />
              ) : isBrowserImage(a.mime) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/media/${a.id}`} alt={a.filename} loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <span className="kicker px-2 text-center">{a.mime.split("/")[1] ?? "file"}</span>
              )}
              {isVideo(a.mime) && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="rounded-full bg-black/45 px-3.5 py-2 text-white backdrop-blur">▶</span>
                </span>
              )}
            </button>
            <div className="flex items-center justify-between gap-2 p-2.5">
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-medium" title={a.filename}>{a.filename}</p>
                <p className="mono text-[10.5px] [color:var(--color-mute)]">{formatBytes(a.size_bytes)}</p>
              </div>
              <a
                href={`/api/media/${a.id}?dl=1`}
                className="btn btn-ghost btn-xs shrink-0"
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

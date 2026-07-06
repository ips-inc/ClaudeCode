"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFavorite } from "@/app/s/[slug]/actions";

interface Img {
  id: string;
  filename: string;
  url: string;
  width: number | null;
  height: number | null;
}

export function GalleryShareView({
  slug,
  title,
  description,
  coverUrl,
  images,
  favoriteIds,
  allowFavorites,
  allowDownloads,
}: {
  slug: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  images: Img[];
  favoriteIds: string[];
  allowFavorites: boolean;
  allowDownloads: boolean;
}) {
  const router = useRouter();
  const [favs, setFavs] = useState(new Set(favoriteIds));
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [showFavsOnly, setShowFavsOnly] = useState(false);
  const [, startTransition] = useTransition();

  const visible = showFavsOnly ? images.filter((i) => favs.has(i.id)) : images;

  function toggle(id: string) {
    let name = localStorage.getItem("ps_client_name") || "";
    if (!name) {
      name = prompt("Your name (so Isaac knows whose selects these are):") || "";
      if (name) localStorage.setItem("ps_client_name", name);
    }
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    const fd = new FormData();
    fd.set("slug", slug);
    fd.set("assetId", id);
    fd.set("clientName", name);
    startTransition(async () => {
      await toggleFavorite(fd);
      router.refresh();
    });
  }

  // Keyboard navigation for the lightbox.
  useEffect(() => {
    if (lightbox === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") {
        setLightbox((i) => (i === null ? null : (i + 1) % visible.length));
      }
      if (e.key === "ArrowLeft") {
        setLightbox((i) =>
          i === null ? null : (i - 1 + visible.length) % visible.length
        );
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, visible.length]);

  return (
    <div>
      {/* Cover */}
      <div className="mb-12 text-center">
        {coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt=""
            className="mx-auto mb-8 max-h-[62vh] w-full max-w-4xl object-cover"
          />
        )}
        <h1 className="display text-4xl sm:text-5xl">{title}</h1>
        {description && (
          <p className="mx-auto mt-3 max-w-lg text-sm text-(--color-stone)">
            {description}
          </p>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          {allowDownloads && (
            <a href={`/api/share/${slug}/zip`} className="btn">
              Download all
            </a>
          )}
          {allowFavorites && favs.size > 0 && (
            <button
              className="btn-ghost"
              onClick={() => setShowFavsOnly((v) => !v)}
            >
              {showFavsOnly ? "Show all" : `Selects (${favs.size})`}
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="columns-2 gap-2 sm:columns-3 lg:columns-4 [&>figure]:mb-2">
        {visible.map((img, idx) => (
          <figure key={img.id} className="group relative break-inside-avoid">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.filename}
              loading="lazy"
              className="w-full cursor-zoom-in"
              onClick={() => setLightbox(idx)}
            />
            <div className="absolute right-2 bottom-2 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
              {allowFavorites && (
                <button
                  onClick={() => toggle(img.id)}
                  title="Favorite"
                  className={`cursor-pointer border px-2 py-1 text-sm leading-none backdrop-blur ${
                    favs.has(img.id)
                      ? "border-(--color-bronze) bg-(--color-bronze) text-white"
                      : "border-white/60 bg-black/30 text-white"
                  }`}
                >
                  ♥
                </button>
              )}
              {allowDownloads && (
                <a
                  href={`/api/share/${slug}/file/${img.id}?dl=1`}
                  title="Download"
                  className="cursor-pointer border border-white/60 bg-black/30 px-2 py-1 text-sm leading-none text-white backdrop-blur"
                >
                  ↓
                </a>
              )}
            </div>
            {allowFavorites && favs.has(img.id) && (
              <span className="absolute top-2 right-2 text-(--color-bronze) drop-shadow group-hover:hidden">
                ♥
              </span>
            )}
          </figure>
        ))}
      </div>
      {visible.length === 0 && (
        <p className="py-16 text-center text-sm text-(--color-stone)">
          {showFavsOnly ? "No selects yet — tap ♥ on a photo." : "Photos coming soon."}
        </p>
      )}

      {/* Lightbox */}
      {lightbox !== null && visible[lightbox] && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
          onClick={() => setLightbox(null)}
        >
          <div className="flex items-center justify-between px-5 py-3 text-white/80">
            <span className="text-xs">
              {lightbox + 1} / {visible.length}
            </span>
            <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
              {allowFavorites && (
                <button
                  onClick={() => toggle(visible[lightbox].id)}
                  className={`cursor-pointer text-lg ${
                    favs.has(visible[lightbox].id)
                      ? "text-(--color-bronze)"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  ♥
                </button>
              )}
              {allowDownloads && (
                <a
                  href={`/api/share/${slug}/file/${visible[lightbox].id}?dl=1`}
                  className="text-white/70 hover:text-white"
                >
                  ↓
                </a>
              )}
              <button
                onClick={() => setLightbox(null)}
                className="cursor-pointer text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={visible[lightbox].url}
            alt=""
            className="min-h-0 flex-1 object-contain px-4 pb-4"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox((lightbox + 1) % visible.length);
            }}
          />
        </div>
      )}
    </div>
  );
}

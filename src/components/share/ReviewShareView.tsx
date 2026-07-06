"use client";

import Link from "next/link";
import { ReviewViewer } from "@/components/ReviewViewer";
import { addClientComment } from "@/app/s/[slug]/actions";
import type { Comment } from "@/lib/types";

export function ReviewShareView({
  slug,
  assets,
  selectedId,
  current,
  comments,
  allowComments,
  allowDownloads,
}: {
  slug: string;
  assets: { id: string; filename: string; versions: number }[];
  selectedId: string | null;
  current: {
    id: string;
    filename: string;
    mime: string;
    src: string;
    version: number;
  } | null;
  comments: Comment[];
  allowComments: boolean;
  allowDownloads: boolean;
}) {
  if (!current) {
    return (
      <p className="py-16 text-center text-sm text-(--color-stone)">
        Nothing to review yet — check back soon.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {assets.length > 1 && (
        <nav className="flex flex-wrap gap-1.5">
          {assets.map((a) => (
            <Link
              key={a.id}
              href={`/s/${slug}?a=${a.id}`}
              className={`border px-3 py-1.5 text-xs ${
                a.id === selectedId
                  ? "border-(--color-ink) bg-(--color-ink) text-(--color-paper)"
                  : "hairline bg-white hover:border-(--color-ink)"
              }`}
            >
              {a.filename}
              {a.versions > 1 && ` · v${a.versions}`}
            </Link>
          ))}
        </nav>
      )}

      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium">
          {current.filename}{" "}
          <span className="text-xs text-(--color-stone)">
            v{current.version} (latest)
          </span>
        </p>
        {allowDownloads && (
          <a
            href={`/api/share/${slug}/file/${current.id}?dl=1`}
            className="btn-ghost btn-small"
          >
            Download
          </a>
        )}
      </div>

      <ReviewViewer
        src={current.src}
        mime={current.mime}
        filename={current.filename}
        comments={comments}
        isAdmin={false}
        allowComments={allowComments}
        hiddenFields={{ slug, assetId: current.id }}
        submitAction={addClientComment}
      />
    </div>
  );
}

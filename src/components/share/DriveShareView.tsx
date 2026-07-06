import Link from "next/link";
import { formatBytes, formatDate } from "@/lib/format";
import type { Asset, Folder } from "@/lib/types";

export function DriveShareView({
  slug,
  assets,
  folders,
  currentFolderId,
  allowDownloads,
}: {
  slug: string;
  assets: Asset[];
  folders: Folder[];
  currentFolderId: string | null;
  allowDownloads: boolean;
}) {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const crumbs: Folder[] = [];
  let walk = currentFolderId ? byId.get(currentFolderId) : undefined;
  while (walk) {
    crumbs.unshift(walk);
    walk = walk.parent_id ? byId.get(walk.parent_id) : undefined;
  }
  const subfolders = folders.filter(
    (f) => (f.parent_id ?? null) === (currentFolderId ?? null)
  );
  const files = assets.filter(
    (a) => (a.folder_id ?? null) === (currentFolderId ?? null)
  );

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="text-sm">
          <Link href={`/s/${slug}`} className="hover:underline">
            Home
          </Link>
          {crumbs.map((c) => (
            <span key={c.id}>
              {" / "}
              <Link href={`/s/${slug}?folder=${c.id}`} className="hover:underline">
                {c.name}
              </Link>
            </span>
          ))}
        </nav>
        {allowDownloads && (files.length > 0 || subfolders.length > 0) && (
          <a
            href={`/api/share/${slug}/zip${currentFolderId ? `?folder=${currentFolderId}` : ""}`}
            className="btn-ghost btn-small"
          >
            Download folder as zip
          </a>
        )}
      </div>

      <ul className="divide-y divide-(--color-hairline) border hairline bg-white">
        {subfolders.map((f) => (
          <li key={f.id}>
            <Link
              href={`/s/${slug}?folder=${f.id}`}
              className="flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors hover:bg-(--color-paper)"
            >
              <span aria-hidden>📁</span> {f.name}
            </Link>
          </li>
        ))}
        {files.map((a) => (
          <li key={a.id} className="flex items-center gap-3 px-5 py-3 text-sm">
            <span className="min-w-0 flex-1 truncate">{a.filename}</span>
            <span className="shrink-0 text-xs text-(--color-stone)">
              {formatBytes(a.size_bytes)} · {formatDate(a.created_at)}
            </span>
            {allowDownloads && (
              <a
                href={`/api/share/${slug}/file/${a.id}?dl=1`}
                className="btn-ghost btn-small shrink-0"
              >
                Download
              </a>
            )}
          </li>
        ))}
        {subfolders.length === 0 && files.length === 0 && (
          <li className="px-5 py-6 text-center text-sm text-(--color-stone)">
            This folder is empty.
          </li>
        )}
      </ul>
    </div>
  );
}

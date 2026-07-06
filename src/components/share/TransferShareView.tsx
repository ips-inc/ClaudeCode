import { formatBytes, formatDate } from "@/lib/format";
import type { Asset, ShareLink } from "@/lib/types";

export function TransferShareView({
  slug,
  description,
  assets,
  link,
}: {
  slug: string;
  description: string | null;
  assets: Asset[];
  link: ShareLink;
}) {
  const total = assets.reduce((sum, a) => sum + a.size_bytes, 0);
  const remaining =
    link.max_downloads != null
      ? Math.max(0, link.max_downloads - link.download_count)
      : null;

  return (
    <div className="mx-auto max-w-2xl">
      {description && (
        <p className="mb-8 text-center text-sm text-(--color-stone)">{description}</p>
      )}
      <div className="border hairline bg-white">
        <div className="flex items-center justify-between border-b hairline px-5 py-4">
          <div>
            <p className="text-sm font-medium">
              {assets.length} file{assets.length === 1 ? "" : "s"} ·{" "}
              {formatBytes(total)}
            </p>
            <p className="mt-0.5 text-xs text-(--color-stone)">
              {link.expires_at
                ? `Available until ${formatDate(link.expires_at)}`
                : "No expiry"}
              {remaining != null && ` · ${remaining} download${remaining === 1 ? "" : "s"} left`}
            </p>
          </div>
          {link.allow_downloads && assets.length > 0 && (
            <a href={`/api/share/${slug}/zip`} className="btn">
              Download all
            </a>
          )}
        </div>
        <ul className="divide-y divide-(--color-hairline)">
          {assets.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-5 py-3 text-sm">
              <span className="min-w-0 flex-1 truncate">{a.filename}</span>
              <span className="shrink-0 text-xs text-(--color-stone)">
                {formatBytes(a.size_bytes)}
              </span>
              {link.allow_downloads && (
                <a
                  href={`/api/share/${slug}/file/${a.id}?dl=1`}
                  className="btn-ghost btn-small shrink-0"
                >
                  Download
                </a>
              )}
            </li>
          ))}
          {assets.length === 0 && (
            <li className="px-5 py-6 text-center text-sm text-(--color-stone)">
              Files are still uploading — check back shortly.
            </li>
          )}
        </ul>
      </div>
      {!link.allow_downloads && (
        <p className="mt-4 text-center text-xs text-(--color-stone)">
          Downloads are disabled on this link.
        </p>
      )}
    </div>
  );
}

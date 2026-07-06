import { createShareLink, revokeShareLink } from "@/app/studio/actions";
import { CopyButton } from "@/components/CopyButton";
import { ConfirmButton } from "@/components/ConfirmButton";
import { formatDate } from "@/lib/format";
import type { ProjectKind, ShareLink } from "@/lib/types";

export function ShareLinksPanel({
  projectId,
  kind,
  links,
}: {
  projectId: string;
  kind: ProjectKind;
  links: ShareLink[];
}) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const active = links.filter((l) => !l.revoked_at);
  const revoked = links.filter((l) => l.revoked_at);

  return (
    <section className="border hairline bg-white">
      <div className="border-b hairline px-5 py-3">
        <h2 className="microlabel">Share links</h2>
      </div>

      <div className="divide-y divide-(--color-hairline)">
        {active.length === 0 && (
          <p className="px-5 py-4 text-sm text-(--color-stone)">
            No links yet — create one below and send it to your client.
          </p>
        )}
        {active.map((l) => {
          const url = `${origin}/s/${l.slug}`;
          const expired = l.expires_at && new Date(l.expires_at) < new Date();
          return (
            <div key={l.id} className="px-5 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{l.label || "Client link"}</span>
                {l.password_hash && <span className="microlabel">· password</span>}
                {l.expires_at && (
                  <span
                    className={`microlabel ${expired ? "text-(--color-danger)" : ""}`}
                  >
                    · {expired ? "expired" : "expires"} {formatDate(l.expires_at)}
                  </span>
                )}
                <span className="ml-auto flex items-center gap-2">
                  <CopyButton text={url} />
                  <form action={revokeShareLink}>
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="projectId" value={projectId} />
                    <ConfirmButton message="Revoke this link? Anyone holding it loses access.">
                      Revoke
                    </ConfirmButton>
                  </form>
                </span>
              </div>
              <p className="mt-1.5 break-all text-xs text-(--color-stone)">{url}</p>
              <p className="mt-1 text-xs text-(--color-stone)">
                {l.view_count} views · {l.download_count} downloads
                {l.max_downloads ? ` of ${l.max_downloads} max` : ""}
                {!l.allow_downloads && " · downloads off"}
              </p>
            </div>
          );
        })}
      </div>

      <form
        action={createShareLink}
        className="space-y-3 border-t hairline bg-(--color-paper) px-5 py-4"
      >
        <p className="microlabel">New link</p>
        <input type="hidden" name="projectId" value={projectId} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="microlabel">Label</span>
            <input name="label" type="text" placeholder="e.g. For Vogue team" />
          </label>
          <label className="block space-y-1">
            <span className="microlabel">Password (optional)</span>
            <input name="password" type="text" autoComplete="off" />
          </label>
          <label className="block space-y-1">
            <span className="microlabel">Expires (optional)</span>
            <input name="expiresAt" type="date" />
          </label>
          <label className="block space-y-1">
            <span className="microlabel">Max downloads (optional)</span>
            <input name="maxDownloads" type="number" min="1" />
          </label>
        </div>
        <div className="flex flex-wrap gap-5 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="allowDownloads" defaultChecked /> Downloads
          </label>
          {kind === "review" && (
            <label className="flex items-center gap-2">
              <input type="checkbox" name="allowComments" defaultChecked /> Comments
            </label>
          )}
          {kind === "gallery" && (
            <label className="flex items-center gap-2">
              <input type="checkbox" name="allowFavorites" defaultChecked /> Favorites
            </label>
          )}
        </div>
        <button className="btn btn-small">Create link</button>
      </form>

      {revoked.length > 0 && (
        <details className="border-t hairline px-5 py-3 text-xs text-(--color-stone)">
          <summary className="microlabel cursor-pointer">
            Revoked ({revoked.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {revoked.map((l) => (
              <li key={l.id}>
                {l.label || l.slug} — revoked {formatDate(l.revoked_at)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

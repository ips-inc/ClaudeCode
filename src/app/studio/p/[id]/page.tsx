import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getActor } from "@/lib/authz";
import { supabaseServer } from "@/lib/supabase/server";
import { projectAssetsWithThumbs, projectFolders } from "@/lib/deliveries";
import { MultipartUploader } from "@/components/MultipartUploader";
import { CopyButton } from "@/components/CopyButton";
import { ConfirmButton } from "@/components/ConfirmButton";
import { TagEditor } from "@/components/studio/TagEditor";
import { MoveAssetSelect } from "@/components/studio/MoveAssetSelect";
import { allTags, assetTagsMap } from "@/lib/tags";
import { tagChipStyle } from "@/lib/tag-colors";
import {
  setPublished,
  deleteAsset,
  createShareLink,
  revokeShareLink,
  createFolder,
  deleteFolder,
} from "@/app/studio/actions";
import { KIND_META, type ProjectKind } from "@/lib/types";

export const dynamic = "force-dynamic";

function fmtBytes(n: number) {
  if (!n) return "—";
  const u = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`;
}

export default async function ProjectDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ folder?: string; tag?: string; q?: string; sort?: string }>;
}) {
  const actor = await getActor();
  if (!actor || actor.role === "client") redirect("/studio");
  const { id } = await params;
  const sp = await searchParams;
  const admin = await supabaseServer();

  const { data: project } = await admin
    .from("projects")
    .select("id, title, description, kind, published, clients(name)")
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();

  // Frame-style: EVERY project is a browsable workspace. Folders exist
  // everywhere; the kind only shapes the client-facing delivery. Search and
  // tag filters transcend the current folder and sweep the whole project.
  const currentFolder = sp.folder ?? null;
  const searching = Boolean((sp.q ?? "").trim() || sp.tag);

  const [allAssets, folders, { data: links }] = await Promise.all([
    projectAssetsWithThumbs(id, searching ? undefined : currentFolder),
    projectFolders(id),
    admin
      .from("share_links")
      .select("id, slug, label, password_hash, expires_at, allow_downloads, max_downloads, download_count, view_count, revoked_at")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
  ]);

  // Tags: the studio vocabulary + this batch's applied tags, plus an optional
  // filter (?tag=<id>) narrowing the grid to assets carrying that tag.
  const [vocabulary, tagsByAsset] = await Promise.all([
    allTags(),
    assetTagsMap(allAssets.map((a) => a.id)),
  ]);
  const activeTagId = sp.tag ?? null;
  const query = (sp.q ?? "").trim().toLowerCase();
  const sort = sp.sort ?? "newest";

  let assets = activeTagId
    ? allAssets.filter((a) => (tagsByAsset.get(a.id) ?? []).some((t) => t.id === activeTagId))
    : allAssets;
  if (query) assets = assets.filter((a) => a.filename.toLowerCase().includes(query));
  assets = [...assets].sort((a, b) => {
    switch (sort) {
      case "oldest":
        return +new Date(a.created_at) - +new Date(b.created_at);
      case "name":
        return a.filename.localeCompare(b.filename);
      case "size":
        return (b.size_bytes ?? 0) - (a.size_bytes ?? 0);
      default: // newest
        return +new Date(b.created_at) - +new Date(a.created_at);
    }
  });
  const activeTag = activeTagId ? vocabulary.find((t) => t.id === activeTagId) ?? null : null;

  // Preserve folder scope + active tag when submitting the search/sort form.
  const hiddenScope: { name: string; value: string }[] = [];
  if (currentFolder) hiddenScope.push({ name: "folder", value: currentFolder });
  if (activeTagId) hiddenScope.push({ name: "tag", value: activeTagId });

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const activeLinks = (links ?? []).filter((l) => !l.revoked_at);

  // Breadcrumb + subfolders for drive navigation.
  const folderById = new Map(folders.map((f) => [f.id, f]));
  const crumbs: { id: string; name: string }[] = [];
  let walk = currentFolder ? folderById.get(currentFolder) : undefined;
  while (walk) {
    crumbs.unshift({ id: walk.id, name: walk.name });
    walk = walk.parent_id ? folderById.get(walk.parent_id) : undefined;
  }
  const subfolders = folders.filter((f) => (f.parent_id ?? null) === (currentFolder ?? null));

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
        <Link href="/studio/files" className="kicker hover:[color:var(--color-ink)]">← Files</Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="display text-3xl">{project.title}</h1>
            <p className="kicker mt-1.5">
              {(project.clients as { name?: string } | null)?.name} · {KIND_META[project.kind as ProjectKind].label} delivery
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/deliver/${id}`} className="btn btn-ghost btn-sm">Preview delivery</Link>
            <form action={setPublished}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="published" value={project.published ? "false" : "true"} />
              <button className={`btn btn-sm ${project.published ? "btn-ghost" : "btn-accent"}`}>
                {project.published ? "Unpublish" : "Publish to client"}
              </button>
            </form>
          </div>
        </div>

        {/* Location bar — Frame-style: every project browses like a filesystem. */}
        <section className="mt-8 flex flex-wrap items-center justify-between gap-2">
          <nav className="flex flex-wrap items-center gap-1 text-[13px]" aria-label="Folder path">
            <Link href={`/studio/p/${id}`} className={crumbs.length ? "[color:var(--color-dim)] hover:[color:var(--color-ink)]" : "font-medium"}>
              {project.title}
            </Link>
            {crumbs.map((c, i) => (
              <span key={c.id}>
                <span className="[color:var(--color-faint)]"> / </span>
                <Link
                  href={`/studio/p/${id}?folder=${c.id}`}
                  className={i === crumbs.length - 1 ? "font-medium" : "[color:var(--color-dim)] hover:[color:var(--color-ink)]"}
                >
                  {c.name}
                </Link>
              </span>
            ))}
          </nav>
          <form action={createFolder} className="flex items-center gap-1">
            <input type="hidden" name="projectId" value={id} />
            <input type="hidden" name="parentId" value={currentFolder ?? ""} />
            <input name="name" placeholder="New folder" aria-label="New folder name" className="field !h-9 !w-36 text-[13px]" />
            <button className="btn btn-ghost btn-sm">Add folder</button>
          </form>
        </section>

        {/* Upload — lands in the folder you're standing in. */}
        <section className="mt-6">
          <h2 className="kicker mb-3">Upload{crumbs.length ? ` — into ${crumbs[crumbs.length - 1].name}` : ""}</h2>
          <MultipartUploader projectId={id} folderId={currentFolder ?? null} label="Drop media or files of any size" />
        </section>

        {/* Assets */}
        <section className="mt-10">
          <form method="get" action={`/studio/p/${id}`} className="mb-3 flex flex-wrap items-center gap-2">
            {hiddenScope.map((h) => (
              <input key={h.name} type="hidden" name={h.name} value={h.value} />
            ))}
            <input
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Search files…"
              className="field !h-9 w-full max-w-56 text-[13px]"
            />
            <select name="sort" defaultValue={sort} className="field !h-9 w-auto text-[13px]">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name (A–Z)</option>
              <option value="size">Largest first</option>
            </select>
            <button className="btn btn-ghost btn-sm">Apply</button>
            {(query || sort !== "newest") && (
              <Link href={`/studio/p/${id}${currentFolder ? `?folder=${currentFolder}` : ""}`} className="kicker hover:[color:var(--color-ink)]">Reset</Link>
            )}
          </form>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="kicker">Files · {assets.length}{activeTag || query ? ` of ${allAssets.length}` : ""}</h2>
            {vocabulary.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                {vocabulary.map((t) => {
                  const on = t.id === activeTagId;
                  const base = `/studio/p/${id}${currentFolder ? `?folder=${currentFolder}&` : "?"}`;
                  return (
                    <Link
                      key={t.id}
                      href={on ? `/studio/p/${id}${currentFolder ? `?folder=${currentFolder}` : ""}` : `${base}tag=${t.id}`}
                      className="rounded-full border px-2 py-0.5 text-[10.5px] font-medium transition-opacity"
                      style={{ ...tagChipStyle(t.color), opacity: activeTagId && !on ? 0.4 : 1 }}
                    >
                      {on ? `✓ ${t.label}` : t.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          {assets.length === 0 && subfolders.length === 0 ? (
            <p className="rounded-[var(--radius-lg)] border border-dashed hairline p-10 text-center text-[13px] [color:var(--color-mute)]">
              {query
                ? "No files match your search."
                : activeTag
                  ? "No files with this tag."
                  : "This folder is empty — drop files above or add a folder to organize."}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {/* Folders live in the grid, ahead of files — like Frame. */}
              {!query && !activeTag && subfolders.map((f) => (
                <li key={f.id} className="card lift group relative overflow-hidden">
                  <Link
                    href={`/studio/p/${id}?folder=${f.id}`}
                    className="flex aspect-square flex-col items-center justify-center gap-2 bg-[color:var(--color-surface-2)]"
                  >
                    <span aria-hidden className="text-4xl">📁</span>
                    <span className="max-w-full truncate px-3 text-[12.5px] font-medium">{f.name}</span>
                  </Link>
                  <div className="flex items-center justify-between px-2.5 py-2">
                    <span className="kicker">Folder</span>
                    <form action={deleteFolder}>
                      <input type="hidden" name="id" value={f.id} />
                      <input type="hidden" name="projectId" value={id} />
                      <ConfirmButton
                        message={`Delete folder "${f.name}" and everything inside?`}
                        className="btn btn-ghost btn-xs !text-[color:var(--color-danger)]"
                      >
                        Delete
                      </ConfirmButton>
                    </form>
                  </div>
                </li>
              ))}
              {assets.map((a) => (
                <li key={a.id} className="card lift overflow-hidden">
                  <Link
                    href={`/studio/p/${id}/a/${a.id}`}
                    className="relative flex aspect-square items-center justify-center bg-[color:var(--color-surface-2)]"
                  >
                    {a.thumbKind ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/media/${a.id}?r=${a.thumbKind}`} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="kicker px-2 text-center">{a.mime.split("/")[1] ?? "file"}</span>
                    )}
                    {a.mime.startsWith("video/") && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-[13px] text-white">▶</span>
                      </span>
                    )}
                  </Link>
                  <div className="p-2.5">
                    <Link href={`/studio/p/${id}/a/${a.id}`} className="block truncate text-[12.5px] font-medium hover:[color:var(--color-accent)]" title={a.filename}>{a.filename}</Link>
                    <p className="mono text-[10.5px] [color:var(--color-mute)]">{fmtBytes(a.size_bytes)}</p>
                    <div className="mt-2">
                      <TagEditor
                        assetId={a.id}
                        projectId={id}
                        tags={tagsByAsset.get(a.id) ?? []}
                        vocabulary={vocabulary}
                      />
                    </div>
                    {folders.length > 0 && (
                      <div className="mt-2">
                        <MoveAssetSelect
                          assetId={a.id}
                          projectId={id}
                          folderId={a.folder_id ?? null}
                          folders={folders.map((f) => ({ id: f.id, name: f.name }))}
                        />
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-1.5">
                      <Link href={`/studio/p/${id}/a/${a.id}`} className="btn btn-ghost btn-xs">
                        {a.mime.startsWith("video/") ? "Review" : "Open"}
                      </Link>
                      <form action={deleteAsset}>
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="projectId" value={id} />
                        <ConfirmButton message={`Delete ${a.filename}?`} className="btn btn-ghost btn-xs !text-[color:var(--color-danger)]">Delete</ConfirmButton>
                      </form>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Share links */}
        <section className="mt-12">
          <h2 className="kicker mb-3">Share links</h2>
          <ul className="space-y-2">
            {activeLinks.map((l) => {
              const url = `${origin}/s/${l.slug}`;
              const expired = l.expires_at && new Date(l.expires_at) < new Date();
              return (
                <li key={l.id} className="card flex flex-wrap items-center gap-2 p-3 text-[13px]">
                  <span className="font-medium">{l.label || "Link"}</span>
                  {l.password_hash && <span className="text-xs [color:var(--color-mute)]">🔒</span>}
                  {l.expires_at && <span className={`text-xs ${expired ? "[color:var(--color-danger)]" : "[color:var(--color-mute)]"}`}>{expired ? "expired" : "expires"} {new Date(l.expires_at).toLocaleDateString()}</span>}
                  <span className="mono text-[11px] [color:var(--color-mute)]">{l.view_count} views · {l.download_count} dl{l.max_downloads ? `/${l.max_downloads}` : ""}</span>
                  <span className="ml-auto flex items-center gap-2">
                    <CopyButton text={url} />
                    <form action={revokeShareLink}>
                      <input type="hidden" name="id" value={l.id} />
                      <input type="hidden" name="projectId" value={id} />
                      <ConfirmButton message="Revoke this link?" className="btn btn-ghost btn-xs !text-[color:var(--color-danger)]">Revoke</ConfirmButton>
                    </form>
                  </span>
                </li>
              );
            })}
          </ul>

          <form action={createShareLink} className="card mt-3 grid gap-2.5 bg-[color:var(--color-surface-2)] p-4 sm:grid-cols-2">
            <input type="hidden" name="projectId" value={id} />
            <input name="label" placeholder="Label (e.g. For the agency)" className="field" />
            <input name="password" placeholder="Password (optional)" autoComplete="off" className="field" />
            <label className="kicker">Expires<input name="expiresAt" type="date" className="field mt-1.5 normal-case tracking-normal" /></label>
            <label className="kicker">Max downloads<input name="maxDownloads" type="number" min="1" className="field mt-1.5 normal-case tracking-normal" /></label>
            <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" name="allowDownloads" defaultChecked className="accent-[color:var(--color-accent)]" /> Allow downloads</label>
            <div className="sm:col-span-2"><button className="btn btn-accent btn-sm">Create link</button></div>
          </form>
        </section>
    </div>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getActor } from "@/lib/authz";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { projectAssetsWithThumbs, projectFolders } from "@/lib/deliveries";
import { MultipartUploader } from "@/components/MultipartUploader";
import { CopyButton } from "@/components/CopyButton";
import { ConfirmButton } from "@/components/ConfirmButton";
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
  searchParams: Promise<{ folder?: string }>;
}) {
  const actor = await getActor();
  if (!actor || actor.role === "client") redirect("/studio");
  const { id } = await params;
  const admin = supabaseAdmin();

  const { data: project } = await admin
    .from("projects")
    .select("id, title, description, kind, published, clients(name)")
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();

  const isDrive = project.kind === "drive";
  const isReview = project.kind === "review";
  const currentFolder = isDrive ? (await searchParams).folder ?? null : undefined;

  const [assets, folders, { data: links }] = await Promise.all([
    // drive scopes to the current folder; other kinds show every asset
    projectAssetsWithThumbs(id, currentFolder),
    isDrive ? projectFolders(id) : Promise.resolve([]),
    admin
      .from("share_links")
      .select("id, slug, label, password_hash, expires_at, allow_downloads, max_downloads, download_count, view_count, revoked_at")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
  ]);

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
      <Link href="/studio" className="text-xs uppercase tracking-widest text-neutral-400 hover:text-neutral-600">← Studio</Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium">{project.title}</h1>
          <p className="mt-0.5 text-xs text-neutral-400">
            {(project.clients as { name?: string } | null)?.name} · {KIND_META[project.kind as ProjectKind].replaces}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/deliver/${id}`} className="rounded-md border px-3 py-1.5 text-sm">Preview delivery</Link>
          <form action={setPublished}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="published" value={project.published ? "false" : "true"} />
            <button className={`rounded-md px-3 py-1.5 text-sm text-white ${project.published ? "bg-neutral-500" : "bg-emerald-600"}`}>
              {project.published ? "Unpublish" : "Publish to client"}
            </button>
          </form>
        </div>
      </div>

      {/* Drive folder navigation */}
      {isDrive && (
        <section className="mt-8">
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            <Link href={`/studio/p/${id}`} className="text-neutral-500 hover:text-neutral-900">Home</Link>
            {crumbs.map((c) => (
              <span key={c.id}>
                <span className="text-neutral-300"> / </span>
                <Link href={`/studio/p/${id}?folder=${c.id}`} className="text-neutral-500 hover:text-neutral-900">{c.name}</Link>
              </span>
            ))}
          </nav>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {subfolders.map((f) => (
              <span key={f.id} className="flex items-center rounded-md border bg-white">
                <Link href={`/studio/p/${id}?folder=${f.id}`} className="px-3 py-1.5 text-sm hover:underline">📁 {f.name}</Link>
                <form action={deleteFolder} className="pr-1.5">
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="projectId" value={id} />
                  <ConfirmButton message={`Delete folder "${f.name}" and everything inside?`} className="px-1 text-xs text-neutral-400 hover:text-red-600">✕</ConfirmButton>
                </form>
              </span>
            ))}
            <form action={createFolder} className="flex items-center gap-1">
              <input type="hidden" name="projectId" value={id} />
              <input type="hidden" name="parentId" value={currentFolder ?? ""} />
              <input name="name" placeholder="New folder" className="w-32 rounded-md border px-2 py-1.5 text-sm" />
              <button className="rounded-md border px-2 py-1.5 text-xs">Add</button>
            </form>
          </div>
        </section>
      )}

      {/* Upload */}
      <section className="mt-8">
        <h2 className="mb-2 text-sm font-medium">Upload{isDrive && crumbs.length ? ` to ${crumbs[crumbs.length - 1].name}` : ""}</h2>
        <MultipartUploader projectId={id} folderId={currentFolder ?? null} label="Drop media or files of any size" />
      </section>

      {/* Assets */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium">Files · {assets.length}</h2>
        {assets.length === 0 ? (
          <p className="text-sm text-neutral-400">Nothing uploaded yet.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {assets.map((a) => (
              <li key={a.id} className="overflow-hidden rounded-lg border">
                <div className="flex aspect-square items-center justify-center bg-neutral-100">
                  {a.thumbKind ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/media/${a.id}?r=${a.thumbKind}`} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="px-2 text-center text-[11px] uppercase tracking-wider text-neutral-400">
                      {a.mime.split("/")[1] ?? "file"}
                    </span>
                  )}
                </div>
                <div className="p-2">
                  <p className="truncate text-xs font-medium" title={a.filename}>{a.filename}</p>
                  <p className="text-[11px] text-neutral-400">{fmtBytes(a.size_bytes)}</p>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                    {isReview && a.mime.startsWith("video/") && (
                      <Link href={`/studio/p/${id}/a/${a.id}`} className="rounded border px-1.5 py-0.5 hover:bg-neutral-900 hover:text-white">
                        Review
                      </Link>
                    )}
                    <form action={deleteAsset}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="projectId" value={id} />
                      <ConfirmButton message={`Delete ${a.filename}?`} className="rounded border px-1.5 py-0.5 text-red-600 hover:bg-red-600 hover:text-white">
                        Delete
                      </ConfirmButton>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Share links */}
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium">Share links</h2>
        <ul className="space-y-2">
          {activeLinks.map((l) => {
            const url = `${origin}/s/${l.slug}`;
            const expired = l.expires_at && new Date(l.expires_at) < new Date();
            return (
              <li key={l.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm">
                <span className="font-medium">{l.label || "Link"}</span>
                {l.password_hash && <span className="text-xs text-neutral-400">🔒</span>}
                {l.expires_at && <span className={`text-xs ${expired ? "text-red-500" : "text-neutral-400"}`}>{expired ? "expired" : "expires"} {new Date(l.expires_at).toLocaleDateString()}</span>}
                <span className="text-xs text-neutral-400">{l.view_count} views · {l.download_count} dl{l.max_downloads ? `/${l.max_downloads}` : ""}</span>
                <span className="ml-auto flex items-center gap-2">
                  <CopyButton text={url} />
                  <form action={revokeShareLink}>
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="projectId" value={id} />
                    <ConfirmButton message="Revoke this link?" className="rounded border px-2 py-1 text-xs text-red-600 hover:bg-red-600 hover:text-white">
                      Revoke
                    </ConfirmButton>
                  </form>
                </span>
              </li>
            );
          })}
        </ul>

        <form action={createShareLink} className="mt-3 grid gap-2 rounded-lg border bg-neutral-50 p-3 sm:grid-cols-2">
          <input type="hidden" name="projectId" value={id} />
          <input name="label" placeholder="Label (e.g. For the agency)" className="rounded-md border px-3 py-2 text-sm" />
          <input name="password" placeholder="Password (optional)" autoComplete="off" className="rounded-md border px-3 py-2 text-sm" />
          <label className="text-xs text-neutral-500">Expires<input name="expiresAt" type="date" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" /></label>
          <label className="text-xs text-neutral-500">Max downloads<input name="maxDownloads" type="number" min="1" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="allowDownloads" defaultChecked /> Allow downloads</label>
          <div className="sm:col-span-2"><button className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white">Create link</button></div>
        </form>
      </section>
    </div>
  );
}

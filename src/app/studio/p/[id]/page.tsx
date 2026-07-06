import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { signedUrlMap } from "@/lib/storage";
import {
  deleteAsset,
  deleteFolder,
  deleteProject,
  createFolder,
  moveAsset,
  setCover,
  updateProject,
} from "@/app/studio/actions";
import { Uploader } from "@/components/Uploader";
import { ShareLinksPanel } from "@/components/ShareLinksPanel";
import { ConfirmButton } from "@/components/ConfirmButton";
import { formatBytes, formatDate, formatTimecode, isImage, isVideo } from "@/lib/format";
import { KIND_META, type Asset, type Folder, type ShareLink } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ folder?: string }>;
}) {
  const { id } = await params;
  const { folder: folderParam } = await searchParams;
  const supabase = await supabaseServer();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();

  const [{ data: assets }, { data: folders }, { data: links }, { data: favs }, { data: comments }] =
    await Promise.all([
      supabase
        .from("assets")
        .select("*")
        .eq("project_id", id)
        .order("position")
        .order("created_at"),
      supabase.from("folders").select("*").eq("project_id", id).order("name"),
      supabase
        .from("share_links")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("favorites").select("asset_id, client_name, share_link_id"),
      supabase.from("comments").select("id, asset_id, resolved_at, parent_id"),
    ]);

  const allAssets = (assets ?? []) as Asset[];
  const allFolders = (folders ?? []) as Folder[];
  const projectAssetIds = new Set(allAssets.map((a) => a.id));
  const favCount = new Map<string, number>();
  for (const f of favs ?? []) {
    if (projectAssetIds.has(f.asset_id)) {
      favCount.set(f.asset_id, (favCount.get(f.asset_id) ?? 0) + 1);
    }
  }
  const openComments = new Map<string, number>();
  const totalComments = new Map<string, number>();
  for (const c of comments ?? []) {
    if (!projectAssetIds.has(c.asset_id)) continue;
    totalComments.set(c.asset_id, (totalComments.get(c.asset_id) ?? 0) + 1);
    if (!c.resolved_at && !c.parent_id) {
      openComments.set(c.asset_id, (openComments.get(c.asset_id) ?? 0) + 1);
    }
  }

  const mediaPaths = allAssets
    .filter((a) => isImage(a.mime))
    .map((a) => a.storage_path);
  const urls = await signedUrlMap(mediaPaths);

  const nextPosition =
    allAssets.reduce((max, a) => Math.max(max, a.position), -1) + 1;
  const meta = KIND_META[project.kind as keyof typeof KIND_META];

  return (
    <div className="space-y-10">
      <div>
        <p className="microlabel mb-2">
          <Link href="/studio" className="hover:text-(--color-ink)">
            Projects
          </Link>{" "}
          / {meta.label}
        </p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="display text-4xl">{project.title}</h1>
            {project.description && (
              <p className="mt-2 max-w-xl text-sm text-(--color-stone)">
                {project.description}
              </p>
            )}
          </div>
          <details className="relative">
            <summary className="btn-ghost btn-small cursor-pointer list-none">
              Settings
            </summary>
            <div className="absolute right-0 z-10 mt-2 w-80 space-y-3 border hairline bg-white p-4 shadow-sm">
              <form action={updateProject} className="space-y-2">
                <input type="hidden" name="id" value={project.id} />
                <label className="block space-y-1">
                  <span className="microlabel">Title</span>
                  <input name="title" type="text" defaultValue={project.title} />
                </label>
                <label className="block space-y-1">
                  <span className="microlabel">Description</span>
                  <textarea
                    name="description"
                    rows={2}
                    defaultValue={project.description ?? ""}
                  />
                </label>
                <button className="btn btn-small">Save</button>
              </form>
              <form action={deleteProject} className="border-t hairline pt-3">
                <input type="hidden" name="id" value={project.id} />
                <ConfirmButton
                  message="Delete this project and all of its files permanently?"
                  className="btn-ghost btn-small text-(--color-danger)"
                >
                  Delete project
                </ConfirmButton>
              </form>
            </div>
          </details>
        </div>
      </div>

      <ShareLinksPanel
        projectId={project.id}
        kind={project.kind}
        links={(links ?? []) as ShareLink[]}
      />

      {project.kind === "gallery" && (
        <GallerySection
          projectId={project.id}
          coverId={project.cover_asset_id}
          assets={allAssets}
          urls={urls}
          favCount={favCount}
          nextPosition={nextPosition}
        />
      )}
      {project.kind === "review" && (
        <ReviewSection
          projectId={project.id}
          assets={allAssets}
          urls={urls}
          openComments={openComments}
          totalComments={totalComments}
          nextPosition={nextPosition}
        />
      )}
      {project.kind === "transfer" && (
        <TransferSection
          projectId={project.id}
          assets={allAssets}
          nextPosition={nextPosition}
        />
      )}
      {project.kind === "drive" && (
        <DriveSection
          projectId={project.id}
          assets={allAssets}
          folders={allFolders}
          currentFolderId={folderParam ?? null}
          nextPosition={nextPosition}
        />
      )}
    </div>
  );
}

function GallerySection({
  projectId,
  coverId,
  assets,
  urls,
  favCount,
  nextPosition,
}: {
  projectId: string;
  coverId: string | null;
  assets: Asset[];
  urls: Map<string, string>;
  favCount: Map<string, number>;
  nextPosition: number;
}) {
  const images = assets.filter((a) => isImage(a.mime));
  const others = assets.filter((a) => !isImage(a.mime));
  return (
    <section className="space-y-4">
      <h2 className="microlabel border-b hairline pb-2">
        Photos · {images.length}
      </h2>
      <Uploader
        projectId={projectId}
        nextPosition={nextPosition}
        label="Drop gallery photos here"
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((a) => (
          <figure key={a.id} className="group relative border hairline bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={urls.get(a.storage_path)}
              alt={a.filename}
              loading="lazy"
              className="aspect-[4/3] w-full object-cover"
            />
            <figcaption className="flex items-center gap-2 px-2 py-1.5 text-xs">
              <span className="truncate">{a.filename}</span>
              {(favCount.get(a.id) ?? 0) > 0 && (
                <span className="text-(--color-bronze-deep)">
                  ♥ {favCount.get(a.id)}
                </span>
              )}
              {coverId === a.id && <span className="microlabel">cover</span>}
            </figcaption>
            <div className="absolute top-1.5 right-1.5 hidden gap-1 group-hover:flex">
              {coverId !== a.id && (
                <form action={setCover}>
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="assetId" value={a.id} />
                  <button className="cursor-pointer border hairline bg-white/95 px-2 py-0.5 text-[10px] uppercase tracking-wider">
                    Cover
                  </button>
                </form>
              )}
              <form action={deleteAsset}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="projectId" value={projectId} />
                <ConfirmButton
                  message={`Delete ${a.filename}?`}
                  className="cursor-pointer border hairline bg-white/95 px-2 py-0.5 text-[10px] uppercase tracking-wider text-(--color-danger)"
                >
                  ✕
                </ConfirmButton>
              </form>
            </div>
          </figure>
        ))}
      </div>
      {others.length > 0 && (
        <FileTable projectId={projectId} assets={others} folders={[]} />
      )}
    </section>
  );
}

function ReviewSection({
  projectId,
  assets,
  urls,
  openComments,
  totalComments,
  nextPosition,
}: {
  projectId: string;
  assets: Asset[];
  urls: Map<string, string>;
  openComments: Map<string, number>;
  totalComments: Map<string, number>;
  nextPosition: number;
}) {
  const tops = assets.filter((a) => !a.version_of);
  const versions = new Map<string, Asset[]>();
  for (const a of assets) {
    if (a.version_of) {
      versions.set(a.version_of, [...(versions.get(a.version_of) ?? []), a]);
    }
  }
  return (
    <section className="space-y-4">
      <h2 className="microlabel border-b hairline pb-2">
        Cuts & assets · {tops.length}
      </h2>
      <Uploader
        projectId={projectId}
        nextPosition={nextPosition}
        label="Drop cuts for review (video, stills, audio)"
      />
      <ul className="divide-y divide-(--color-hairline) border hairline bg-white">
        {tops.map((a) => {
          const vCount = 1 + (versions.get(a.id)?.length ?? 0);
          const open = openComments.get(a.id) ?? 0;
          const total = totalComments.get(a.id) ?? 0;
          return (
            <li key={a.id}>
              <Link
                href={`/studio/p/${projectId}/a/${a.id}`}
                className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-(--color-paper)"
              >
                {isImage(a.mime) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={urls.get(a.storage_path)}
                    alt=""
                    className="h-12 w-20 border hairline object-cover"
                  />
                ) : (
                  <span className="flex h-12 w-20 items-center justify-center border hairline bg-(--color-ink) text-[10px] tracking-wider text-(--color-paper) uppercase">
                    {isVideo(a.mime) ? "Video" : "File"}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate font-medium">{a.filename}</span>
                  <span className="mt-0.5 block text-xs text-(--color-stone)">
                    {a.duration_s ? `${formatTimecode(Number(a.duration_s))} · ` : ""}
                    {formatBytes(a.size_bytes)} · v{vCount}
                  </span>
                </span>
                <span className="ml-auto text-right text-xs text-(--color-stone)">
                  {open > 0 ? (
                    <span className="text-(--color-bronze-deep)">{open} open</span>
                  ) : total > 0 ? (
                    "resolved"
                  ) : (
                    "no comments"
                  )}
                </span>
              </Link>
            </li>
          );
        })}
        {tops.length === 0 && (
          <li className="px-4 py-4 text-sm text-(--color-stone)">
            Upload a cut to start collecting timecoded feedback.
          </li>
        )}
      </ul>
    </section>
  );
}

function TransferSection({
  projectId,
  assets,
  nextPosition,
}: {
  projectId: string;
  assets: Asset[];
  nextPosition: number;
}) {
  const total = assets.reduce((sum, a) => sum + a.size_bytes, 0);
  return (
    <section className="space-y-4">
      <h2 className="microlabel border-b hairline pb-2">
        Files · {assets.length} · {formatBytes(total)}
      </h2>
      <Uploader
        projectId={projectId}
        nextPosition={nextPosition}
        label="Drop files to send"
      />
      <FileTable projectId={projectId} assets={assets} folders={[]} />
    </section>
  );
}

function DriveSection({
  projectId,
  assets,
  folders,
  currentFolderId,
  nextPosition,
}: {
  projectId: string;
  assets: Asset[];
  folders: Folder[];
  currentFolderId: string | null;
  nextPosition: number;
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
    <section className="space-y-4">
      <h2 className="microlabel border-b hairline pb-2">Drive</h2>
      <nav className="flex flex-wrap items-center gap-1 text-sm">
        <Link href={`/studio/p/${projectId}`} className="hover:underline">
          Home
        </Link>
        {crumbs.map((c) => (
          <span key={c.id}>
            {" / "}
            <Link
              href={`/studio/p/${projectId}?folder=${c.id}`}
              className="hover:underline"
            >
              {c.name}
            </Link>
          </span>
        ))}
      </nav>

      <div className="flex flex-wrap gap-2">
        {subfolders.map((f) => (
          <span key={f.id} className="flex items-center border hairline bg-white">
            <Link
              href={`/studio/p/${projectId}?folder=${f.id}`}
              className="px-3 py-2 text-sm font-medium hover:underline"
            >
              📁 {f.name}
            </Link>
            <form action={deleteFolder} className="pr-2">
              <input type="hidden" name="id" value={f.id} />
              <input type="hidden" name="projectId" value={projectId} />
              <ConfirmButton
                message={`Delete folder "${f.name}" and everything inside it?`}
                className="cursor-pointer px-1 text-xs text-(--color-stone) hover:text-(--color-danger)"
              >
                ✕
              </ConfirmButton>
            </form>
          </span>
        ))}
        <form action={createFolder} className="flex items-center gap-1">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="parentId" value={currentFolderId ?? ""} />
          <input
            name="name"
            type="text"
            placeholder="New folder"
            className="!w-36 !py-1.5 text-sm"
          />
          <button className="btn-ghost btn-small">Add</button>
        </form>
      </div>

      <Uploader
        projectId={projectId}
        folderId={currentFolderId}
        nextPosition={nextPosition}
        label={`Drop files into ${crumbs.length ? crumbs[crumbs.length - 1].name : "Home"}`}
      />
      <FileTable
        projectId={projectId}
        assets={files}
        folders={folders}
        showMove
      />
    </section>
  );
}

function FileTable({
  projectId,
  assets,
  folders,
  showMove = false,
}: {
  projectId: string;
  assets: Asset[];
  folders: Folder[];
  showMove?: boolean;
}) {
  if (!assets.length) {
    return <p className="text-sm text-(--color-stone)">No files here yet.</p>;
  }
  return (
    <ul className="divide-y divide-(--color-hairline) border hairline bg-white">
      {assets.map((a) => (
        <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
          <span className="min-w-0 flex-1 truncate font-medium">{a.filename}</span>
          <span className="text-xs text-(--color-stone)">
            {formatBytes(a.size_bytes)} · {formatDate(a.created_at)}
          </span>
          {showMove && folders.length > 0 && (
            <form action={moveAsset} className="flex items-center gap-1">
              <input type="hidden" name="id" value={a.id} />
              <input type="hidden" name="projectId" value={projectId} />
              <select
                name="folderId"
                defaultValue={a.folder_id ?? ""}
                className="!w-36 !py-1 text-xs"
              >
                <option value="">Home</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <button className="btn-ghost btn-small">Move</button>
            </form>
          )}
          <form action={deleteAsset}>
            <input type="hidden" name="id" value={a.id} />
            <input type="hidden" name="projectId" value={projectId} />
            <ConfirmButton
              message={`Delete ${a.filename}?`}
              className="btn-ghost btn-small text-(--color-danger)"
            >
              Delete
            </ConfirmButton>
          </form>
        </li>
      ))}
    </ul>
  );
}

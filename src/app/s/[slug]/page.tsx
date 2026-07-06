import type { Metadata } from "next";
import { resolveShare } from "@/lib/share";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { signedUrlMap } from "@/lib/storage";
import { unlockShare } from "@/app/s/[slug]/actions";
import { ViewPing } from "@/components/ViewPing";
import { GalleryShareView } from "@/components/share/GalleryShareView";
import { ReviewShareView } from "@/components/share/ReviewShareView";
import { TransferShareView } from "@/components/share/TransferShareView";
import { DriveShareView } from "@/components/share/DriveShareView";
import type { Asset, Comment, Favorite, Folder } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const share = await resolveShare(slug);
  const title =
    share.status === "ok" || share.status === "locked"
      ? `${share.project.title} — Isaac Poole`
      : "Isaac Poole — Studio";
  return { title, robots: { index: false } };
}

function Shell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b hairline">
        <div className="mx-auto flex max-w-6xl items-baseline justify-between px-6 py-4">
          <span className="display text-lg tracking-wide">ISAAC POOLE</span>
          <span className="microlabel">New York City</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        {(title || subtitle) && (
          <div className="mb-10 text-center">
            {subtitle && <p className="microlabel mb-3">{subtitle}</p>}
            {title && <h1 className="display text-4xl sm:text-5xl">{title}</h1>}
          </div>
        )}
        {children}
      </main>
      <footer className="border-t hairline py-6 text-center">
        <p className="microlabel">© Isaac Poole — isaacpoole.co</p>
      </footer>
    </div>
  );
}

export default async function SharePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ err?: string; a?: string; folder?: string }>;
}) {
  const { slug } = await params;
  const { err, a: assetParam, folder: folderParam } = await searchParams;
  const share = await resolveShare(slug);

  if (share.status === "not_found") {
    return (
      <Shell title="Link not available" subtitle="Not found">
        <p className="text-center text-sm text-(--color-stone)">
          This link doesn&apos;t exist or has been revoked. If Isaac sent it to
          you, ask him for a fresh one.
        </p>
      </Shell>
    );
  }

  if (share.status === "expired") {
    return (
      <Shell title={share.project.title} subtitle="Link expired">
        <p className="text-center text-sm text-(--color-stone)">
          This delivery has expired. Reach out to Isaac for a new link.
        </p>
      </Shell>
    );
  }

  if (share.status === "locked") {
    return (
      <Shell title={share.project.title} subtitle="Private delivery">
        <form
          action={unlockShare}
          className="mx-auto flex w-full max-w-xs flex-col gap-3"
        >
          <input type="hidden" name="slug" value={slug} />
          <label className="block space-y-1.5">
            <span className="microlabel">Password</span>
            <input type="password" name="password" autoFocus required />
          </label>
          {err === "password" && (
            <p className="text-sm text-(--color-danger)">
              That password isn&apos;t right — try again.
            </p>
          )}
          <button className="btn">View</button>
        </form>
      </Shell>
    );
  }

  const { link, project } = share;
  const db = supabaseAdmin();
  const [{ data: assets }, { data: folders }, { data: favs }] = await Promise.all([
    db
      .from("assets")
      .select("*")
      .eq("project_id", project.id)
      .order("position")
      .order("created_at"),
    db.from("folders").select("*").eq("project_id", project.id).order("name"),
    db.from("favorites").select("*").eq("share_link_id", link.id),
  ]);

  const allAssets = (assets ?? []) as Asset[];
  const allFolders = (folders ?? []) as Folder[];
  const favorites = (favs ?? []) as Favorite[];

  if (project.kind === "gallery") {
    const images = allAssets.filter((a) => a.mime.startsWith("image/"));
    const urls = await signedUrlMap(images.map((i) => i.storage_path), 6 * 3600);
    const cover = images.find((i) => i.id === project.cover_asset_id) ?? images[0];
    return (
      <Shell>
        <ViewPing slug={slug} />
        <GalleryShareView
          slug={slug}
          title={project.title}
          description={project.description}
          coverUrl={cover ? (urls.get(cover.storage_path) ?? null) : null}
          images={images.map((i) => ({
            id: i.id,
            filename: i.filename,
            url: urls.get(i.storage_path) ?? "",
            width: i.width,
            height: i.height,
          }))}
          favoriteIds={favorites.map((f) => f.asset_id)}
          allowFavorites={link.allow_favorites}
          allowDownloads={link.allow_downloads}
        />
      </Shell>
    );
  }

  if (project.kind === "review") {
    const tops = allAssets.filter((x) => !x.version_of);
    const versionsByRoot = new Map<string, Asset[]>();
    for (const x of allAssets) {
      if (x.version_of) {
        versionsByRoot.set(x.version_of, [
          ...(versionsByRoot.get(x.version_of) ?? []),
          x,
        ]);
      }
    }
    const selectedRoot =
      tops.find((t) => t.id === assetParam) ?? tops[tops.length - 1] ?? null;
    const chain = selectedRoot
      ? [selectedRoot, ...(versionsByRoot.get(selectedRoot.id) ?? [])]
      : [];
    const current = chain[chain.length - 1] ?? null;

    let comments: Comment[] = [];
    let src: string | null = null;
    if (current) {
      const { data: c } = await db
        .from("comments")
        .select("*")
        .eq("asset_id", current.id)
        .order("created_at");
      comments = (c ?? []) as Comment[];
      const urls = await signedUrlMap([current.storage_path], 6 * 3600);
      src = urls.get(current.storage_path) ?? null;
    }

    return (
      <Shell title={project.title} subtitle="For review">
        <ViewPing slug={slug} />
        <ReviewShareView
          slug={slug}
          assets={tops.map((t) => ({
            id: t.id,
            filename: t.filename,
            versions: 1 + (versionsByRoot.get(t.id)?.length ?? 0),
          }))}
          selectedId={selectedRoot?.id ?? null}
          current={
            current && src
              ? {
                  id: current.id,
                  filename: current.filename,
                  mime: current.mime,
                  src,
                  version: chain.length,
                }
              : null
          }
          comments={comments}
          allowComments={link.allow_comments}
          allowDownloads={link.allow_downloads}
        />
      </Shell>
    );
  }

  if (project.kind === "transfer") {
    return (
      <Shell title={project.title} subtitle="Files for you">
        <ViewPing slug={slug} />
        <TransferShareView
          slug={slug}
          description={project.description}
          assets={allAssets}
          link={link}
        />
      </Shell>
    );
  }

  // drive
  return (
    <Shell title={project.title} subtitle="Shared folder">
      <ViewPing slug={slug} />
      <DriveShareView
        slug={slug}
        assets={allAssets}
        folders={allFolders}
        currentFolderId={folderParam ?? null}
        allowDownloads={link.allow_downloads}
      />
    </Shell>
  );
}

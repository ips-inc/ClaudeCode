import type { Metadata } from "next";
import { resolveShare, auditShare } from "@/lib/share";
import { supabaseAnon } from "@/lib/supabase/anon";
import { unlockShare } from "@/app/s/[slug]/actions";
import { ShareView } from "@/components/share/ShareView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PublicShare({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ err?: string; folder?: string }>;
}) {
  const { slug } = await params;
  const { err } = await searchParams;
  const share = await resolveShare(slug);

  if (share.status === "not_found" || share.status === "expired") {
    return (
      <Shell>
        <p className="text-center text-[14px] [color:var(--color-mute)]">
          {share.status === "expired" ? "This link has expired." : "This link is not available."}
        </p>
      </Shell>
    );
  }

  if (share.status === "locked") {
    return (
      <Shell title={share.project.title}>
        <form action={unlockShare} className="mx-auto max-w-xs space-y-3">
          <input type="hidden" name="slug" value={slug} />
          <p className="text-center text-[13px] [color:var(--color-mute)]">This delivery is password protected.</p>
          <input type="password" name="password" autoFocus required placeholder="Password" className="field" />
          {err && <p className="text-center text-[12px] [color:var(--color-danger)]">Incorrect password.</p>}
          <button className="btn btn-accent w-full">View</button>
        </form>
      </Shell>
    );
  }

  // Live link — register a counted view, then render.
  const db = supabaseAnon();
  await db.rpc("share_register_view", { p_link: share.linkId }).then(
    () => auditShare(share.linkId, "view"),
    () => {}
  );

  // Projects with folders browse like a filesystem; flat projects show all.
  const folders = ((await db.rpc("share_folders", { p_link_id: share.linkId })).data ?? []) as {
    id: string;
    parent_id: string | null;
    name: string;
  }[];
  const browseFolders = folders.length > 0;
  const currentFolder = browseFolders ? (await searchParams).folder ?? null : undefined;

  const { data: assetRows } = await db.rpc("share_list_assets", {
    p_link_id: share.linkId,
    p_folder: currentFolder ?? null,
    p_by_folder: browseFolders,
  });
  const assets = (assetRows ?? []) as {
    id: string;
    filename: string;
    mime: string;
    size_bytes: number;
    thumb_kind: string | null;
  }[];

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
    <Shell title={share.project.title} subtitle={share.project.description}>
      <ShareView
        slug={slug}
        allowDownloads={share.allowDownloads}
        crumbs={crumbs}
        subfolders={subfolders.map((f) => ({ id: f.id, name: f.name }))}
        assets={assets.map((a) => ({
          id: a.id,
          filename: a.filename,
          mime: a.mime,
          size_bytes: a.size_bytes,
          thumbKind: a.thumb_kind,
        }))}
      />
    </Shell>
  );
}

function Shell({ children, title, subtitle }: { children: React.ReactNode; title?: string; subtitle?: string | null }) {
  return (
    <div className="surface-light min-h-screen">
      <header className="glass sticky top-0 z-20 border-b hairline px-6 py-4 text-center">
        <span className="wordmark text-sm">ISAAC POOLE</span>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-14">
        {(title || subtitle) && (
          <div className="mb-10 text-center">
            {title && <h1 className="display text-4xl sm:text-5xl">{title}</h1>}
            {subtitle && <p className="mx-auto mt-3 max-w-xl text-[14px] [color:var(--color-dim)]">{subtitle}</p>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

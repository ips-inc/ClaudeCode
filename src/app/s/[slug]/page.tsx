import type { Metadata } from "next";
import { resolveShare, auditShare } from "@/lib/share";
import { supabaseAdmin } from "@/lib/supabase/admin";
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
  const db = supabaseAdmin();
  await db.rpc("share_register_view", { link: share.link.id }, { get: false }).then(
    () => auditShare(share.project.id, share.link.id, "view"),
    () => {}
  );

  // Drive projects browse by folder; other kinds show every file flat.
  const isDrive = share.project.kind === "drive";
  const currentFolder = isDrive ? (await searchParams).folder ?? null : undefined;

  const folders = isDrive
    ? (
        await db
          .from("folders")
          .select("id, parent_id, name")
          .eq("project_id", share.project.id)
          .order("name")
      ).data ?? []
    : [];

  let assetsQ = db
    .from("assets")
    .select("id, filename, mime, size_bytes, position, created_at")
    .eq("project_id", share.project.id)
    .is("version_of", null);
  if (currentFolder === null) assetsQ = assetsQ.is("folder_id", null);
  else if (typeof currentFolder === "string") assetsQ = assetsQ.eq("folder_id", currentFolder);
  const { data: assets } = await assetsQ.order("position").order("created_at");

  const { data: rends } = await db
    .from("renditions")
    .select("asset_id, kind")
    .in("asset_id", (assets ?? []).map((a) => a.id).length ? (assets ?? []).map((a) => a.id) : ["00000000-0000-0000-0000-000000000000"])
    .in("kind", ["thumb", "poster"])
    .eq("status", "done");
  const thumbBy = new Map<string, string>();
  for (const r of rends ?? []) if (r.kind === "thumb" || !thumbBy.has(r.asset_id)) thumbBy.set(r.asset_id, r.kind);

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
        allowDownloads={share.link.allow_downloads}
        crumbs={crumbs}
        subfolders={subfolders.map((f) => ({ id: f.id, name: f.name }))}
        assets={(assets ?? []).map((a) => ({
          id: a.id,
          filename: a.filename,
          mime: a.mime,
          size_bytes: a.size_bytes,
          thumbKind: thumbBy.get(a.id) ?? null,
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

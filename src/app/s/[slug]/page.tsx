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
  searchParams: Promise<{ err?: string }>;
}) {
  const { slug } = await params;
  const { err } = await searchParams;
  const share = await resolveShare(slug);

  if (share.status === "not_found" || share.status === "expired") {
    return (
      <Shell>
        <p className="text-center text-sm text-neutral-500">
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
          <p className="text-center text-sm text-neutral-500">This delivery is password protected.</p>
          <input type="password" name="password" autoFocus required placeholder="Password" className="w-full rounded-md border px-3 py-2 text-sm" />
          {err && <p className="text-center text-xs text-red-600">Incorrect password.</p>}
          <button className="w-full rounded-md bg-neutral-900 py-2 text-sm text-white">View</button>
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

  const { data: assets } = await db
    .from("assets")
    .select("id, filename, mime, size_bytes, position, created_at")
    .eq("project_id", share.project.id)
    .is("version_of", null)
    .order("position")
    .order("created_at");

  const { data: rends } = await db
    .from("renditions")
    .select("asset_id, kind")
    .in("asset_id", (assets ?? []).map((a) => a.id).length ? (assets ?? []).map((a) => a.id) : ["00000000-0000-0000-0000-000000000000"])
    .in("kind", ["thumb", "poster"])
    .eq("status", "done");
  const thumbBy = new Map<string, string>();
  for (const r of rends ?? []) if (r.kind === "thumb" || !thumbBy.has(r.asset_id)) thumbBy.set(r.asset_id, r.kind);

  return (
    <Shell title={share.project.title} subtitle={share.project.description}>
      <ShareView
        slug={slug}
        allowDownloads={share.link.allow_downloads}
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
    <div className="min-h-screen bg-white">
      <header className="border-b px-6 py-4 text-center">
        <p className="text-sm font-medium tracking-wide">ISAAC POOLE</p>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-12">
        {(title || subtitle) && (
          <div className="mb-10 text-center">
            {title && <h1 className="text-2xl font-medium">{title}</h1>}
            {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

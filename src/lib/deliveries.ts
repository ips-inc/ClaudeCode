import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import type { Actor } from "@/lib/authz";

/**
 * Reads for authenticated delivery/studio surfaces, all through the caller's
 * session. RLS does the isolation: owners see everything, collaborators see
 * their clients' projects, clients see only published projects of their clients.
 */
export async function visibleProjects(_actor: Actor) {
  const db = await supabaseServer();
  const { data } = await db
    .from("projects")
    .select("id, title, slug, kind, published, client_id, cover_asset_id, created_at, clients(name)")
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** Folders of a project (for drive-style navigation). */
export async function projectFolders(projectId: string) {
  const db = await supabaseServer();
  const { data } = await db
    .from("folders")
    .select("id, parent_id, name")
    .eq("project_id", projectId)
    .order("name");
  return data ?? [];
}

/**
 * Assets of a project with their poster/thumb rendition keys, if any.
 * Pass `folderId` (a folder uuid, or null for the project root) to scope to one
 * folder; omit it (undefined) to return every asset in the project.
 */
export async function projectAssetsWithThumbs(projectId: string, folderId?: string | null) {
  const db = await supabaseServer();
  let q = db
    .from("assets")
    .select("id, folder_id, filename, mime, size_bytes, width, height, duration_s, position, created_at")
    .eq("project_id", projectId)
    .is("version_of", null);
  if (folderId === null) q = q.is("folder_id", null);
  else if (typeof folderId === "string") q = q.eq("folder_id", folderId);
  const { data: assets } = await q.order("position").order("created_at");
  if (!assets?.length) return [];

  const { data: rends } = await db
    .from("renditions")
    .select("asset_id, kind, storage_key")
    .in("asset_id", assets.map((a) => a.id))
    .in("kind", ["thumb", "poster"])
    .eq("status", "done");
  const thumbByAsset = new Map<string, string>();
  for (const r of rends ?? []) {
    if (r.kind === "thumb" || !thumbByAsset.has(r.asset_id)) {
      thumbByAsset.set(r.asset_id, r.kind);
    }
  }
  return assets.map((a) => ({ ...a, thumbKind: thumbByAsset.get(a.id) ?? null }));
}

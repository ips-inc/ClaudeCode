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
  const { data: roots } = await q.order("position").order("created_at");
  if (!roots?.length) return [];

  // Version stacks: newer uploads point at the original via version_of. The
  // grid keeps the ORIGINAL's id as the stable identity (links, tags, share
  // targets survive re-uploads) but previews and metadata come from the head.
  const { data: versions } = await db
    .from("assets")
    .select("id, version_of, version, filename, mime, size_bytes, width, height, duration_s, created_at")
    .in("version_of", roots.map((a) => a.id))
    .order("version");
  const headByRoot = new Map<string, NonNullable<typeof versions>[number]>();
  const countByRoot = new Map<string, number>();
  for (const v of versions ?? []) {
    if (!v.version_of) continue;
    headByRoot.set(v.version_of, v); // ordered by version asc → last write wins
    countByRoot.set(v.version_of, (countByRoot.get(v.version_of) ?? 0) + 1);
  }

  const displayIds = roots.map((a) => headByRoot.get(a.id)?.id ?? a.id);
  const { data: rends } = await db
    .from("renditions")
    .select("asset_id, kind, storage_key")
    .in("asset_id", displayIds)
    .in("kind", ["thumb", "poster"])
    .eq("status", "done");
  const thumbByAsset = new Map<string, string>();
  for (const r of rends ?? []) {
    if (r.kind === "thumb" || !thumbByAsset.has(r.asset_id)) {
      thumbByAsset.set(r.asset_id, r.kind);
    }
  }

  return roots.map((a) => {
    const head = headByRoot.get(a.id);
    return {
      ...a,
      // Surface the head's file facts; keep the root id + folder for identity.
      filename: head?.filename ?? a.filename,
      mime: head?.mime ?? a.mime,
      size_bytes: head?.size_bytes ?? a.size_bytes,
      width: head?.width ?? a.width,
      height: head?.height ?? a.height,
      duration_s: head?.duration_s ?? a.duration_s,
      displayId: head?.id ?? a.id,
      version: head?.version ?? 1,
      versionCount: (countByRoot.get(a.id) ?? 0) + 1,
      thumbKind: thumbByAsset.get(head?.id ?? a.id) ?? null,
    };
  });
}

import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Actor } from "@/lib/authz";

/**
 * Projects a given actor is allowed to see, with client isolation applied in
 * the data layer (defense in depth on top of RLS):
 *   - owner: everything
 *   - collaborator: projects of clients they belong to
 *   - client: only PUBLISHED projects of clients they belong to
 */
export async function visibleProjects(actor: Actor) {
  const admin = supabaseAdmin();
  if (actor.role === "owner") {
    const { data } = await admin
      .from("projects")
      .select("id, title, slug, kind, published, client_id, cover_asset_id, created_at, clients(name)")
      .is("archived_at", null)
      .order("created_at", { ascending: false });
    return data ?? [];
  }

  const { data: memberships } = await admin
    .from("memberships")
    .select("client_id")
    .eq("user_id", actor.id);
  const clientIds = (memberships ?? []).map((m) => m.client_id);
  if (!clientIds.length) return [];

  let q = admin
    .from("projects")
    .select("id, title, slug, kind, published, client_id, cover_asset_id, created_at, clients(name)")
    .in("client_id", clientIds)
    .is("archived_at", null);
  if (actor.role === "client") q = q.eq("published", true);
  const { data } = await q.order("created_at", { ascending: false });
  return data ?? [];
}

/** Assets of a project with their poster/thumb rendition keys, if any. */
export async function projectAssetsWithThumbs(projectId: string) {
  const admin = supabaseAdmin();
  const { data: assets } = await admin
    .from("assets")
    .select("id, filename, mime, size_bytes, width, height, duration_s, position, created_at")
    .eq("project_id", projectId)
    .is("version_of", null)
    .order("position")
    .order("created_at");
  if (!assets?.length) return [];

  const { data: rends } = await admin
    .from("renditions")
    .select("asset_id, kind, storage_key")
    .in("asset_id", assets.map((a) => a.id))
    .in("kind", ["thumb", "poster"])
    .eq("status", "done");
  const thumbByAsset = new Map<string, string>();
  for (const r of rends ?? []) {
    // prefer thumb; fall back to poster
    if (r.kind === "thumb" || !thumbByAsset.has(r.asset_id)) {
      thumbByAsset.set(r.asset_id, r.kind);
    }
  }
  return assets.map((a) => ({ ...a, thumbKind: thumbByAsset.get(a.id) ?? null }));
}

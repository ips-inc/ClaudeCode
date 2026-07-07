import "server-only";
import { supabaseServer } from "@/lib/supabase/server";

export interface Tag {
  id: string;
  label: string;
  color: string;
}

/** The whole studio tag vocabulary (RLS: any signed-in member may read). */
export async function allTags(): Promise<Tag[]> {
  const db = await supabaseServer();
  const { data } = await db.from("tags").select("id, label, color").order("label");
  return data ?? [];
}

/** Map assetId → its tags, for a batch of assets. */
export async function assetTagsMap(assetIds: string[]): Promise<Map<string, Tag[]>> {
  const map = new Map<string, Tag[]>();
  if (!assetIds.length) return map;
  const db = await supabaseServer();
  const { data } = await db
    .from("asset_tags")
    .select("asset_id, tags(id, label, color)")
    .in("asset_id", assetIds);
  // The embedded `tags` relation is one-to-one here, but the typed client can
  // surface it as an array — normalize either shape to a single Tag.
  const rows = (data ?? []) as unknown as {
    asset_id: string;
    tags: Tag | Tag[] | null;
  }[];
  for (const row of rows) {
    const tag = Array.isArray(row.tags) ? row.tags[0] : row.tags;
    if (!tag) continue;
    const arr = map.get(row.asset_id) ?? [];
    arr.push(tag);
    map.set(row.asset_id, arr);
  }
  return map;
}

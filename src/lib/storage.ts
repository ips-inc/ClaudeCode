import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Batch-mint signed URLs; returns storage_path -> url. */
export async function signedUrlMap(
  paths: string[],
  ttl = 3600
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!paths.length) return map;
  const db = supabaseAdmin();
  for (let i = 0; i < paths.length; i += 100) {
    const batch = paths.slice(i, i + 100);
    const { data } = await db.storage.from("originals").createSignedUrls(batch, ttl);
    for (const item of data ?? []) {
      if (item.signedUrl && item.path) map.set(item.path, item.signedUrl);
    }
  }
  return map;
}
